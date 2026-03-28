import { Router, Request, Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { spawn } from 'child_process'
import { authenticateToken } from '@/middleware/auth'
import { asyncHandler } from '@/middleware/errorHandler'
import { AuthRequest } from '@shared/types'
import MediaFile from '@/models/Media'

const router = Router()

// Directorios
const UPLOAD_DIR = path.join(process.cwd(), 'uploads')
const CONVERTED_DIR = path.join(process.cwd(), 'converted')

// Crear directorios si no existen
for (const dir of [UPLOAD_DIR, CONVERTED_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

// Configurar multer
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const ext = path.extname(file.originalname)
    cb(null, uniqueSuffix + ext)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/mp4',
      'audio/x-m4a', 'audio/webm', 'audio/flac', 'audio/x-flac',
      'video/mp4', 'video/webm', 'video/ogg', 'video/x-msvideo',
      'video/quicktime', 'video/x-matroska',
    ]
    if (allowed.includes(file.mimetype) || file.mimetype.startsWith('audio/') || file.mimetype.startsWith('video/')) {
      cb(null, true)
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo audio y video.'))
    }
  }
})

// Detectar si el archivo es audio o video por mimetype
function getMediaType(mimetype: string): 'audio' | 'video' {
  return mimetype.startsWith('video/') ? 'video' : 'audio'
}

// Obtener duración con ffprobe
function getMediaDuration(filePath: string): Promise<number> {
  return new Promise((resolve) => {
    try {
      const ffprobe = spawn('ffprobe', [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        filePath
      ])
      let output = ''
      ffprobe.stdout.on('data', (data) => { output += data.toString() })
      ffprobe.on('close', () => {
        const duration = parseFloat(output.trim())
        resolve(isNaN(duration) ? 0 : duration)
      })
      ffprobe.on('error', () => resolve(0))
    } catch {
      resolve(0)
    }
  })
}

// ============ RUTAS ============

// GET /api/music/tracks - Obtener archivos del usuario + públicos
router.get('/tracks', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const files = await MediaFile.find({
    $or: [{ uploadedBy: req.user!.id }, { isPublic: true }]
  }).sort({ createdAt: -1 })
  res.json({ success: true, data: files })
}))

// POST /api/music/upload - Subir archivo (audio o video)
router.post('/upload', authenticateToken, upload.single('file'), asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No se proporcionó ningún archivo' })
  }

  const mediaType = getMediaType(req.file.mimetype)
  const duration = await getMediaDuration(req.file.path)

  const media = new MediaFile({
    title: req.body.title || path.parse(req.file.originalname).name,
    artist: req.body.artist || 'Desconocido',
    filename: req.file.filename,
    originalName: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
    duration,
    filePath: req.file.path,
    mediaType,
    uploadedBy: req.user!.id,
  })

  await media.save()

  res.status(201).json({
    success: true,
    data: media,
    message: `${mediaType === 'video' ? 'Video' : 'Canción'} subido exitosamente`
  })
}))

// GET /api/music/stream/:id - Stream de archivo
router.get('/stream/:id', asyncHandler(async (req: Request, res: Response) => {
  const media = await MediaFile.findById(req.params.id)
  if (!media) {
    return res.status(404).json({ success: false, error: 'Archivo no encontrado' })
  }

  const filePath = media.filePath
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, error: 'Archivo no existe en disco' })
  }

  const stat = fs.statSync(filePath)
  const range = req.headers.range

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-')
    const start = parseInt(parts[0], 10)
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1
    const chunkSize = end - start + 1

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': media.mimetype,
    })
    fs.createReadStream(filePath, { start, end }).pipe(res)
  } else {
    res.writeHead(200, {
      'Content-Length': stat.size,
      'Content-Type': media.mimetype,
    })
    fs.createReadStream(filePath).pipe(res)
  }

  // Incrementar play count en background
  media.playCount = (media.playCount || 0) + 1
  media.save().catch(() => {})
}))

// GET /api/music/download/:id - Descargar archivo
router.get('/download/:id', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const media = await MediaFile.findById(req.params.id)
  if (!media) {
    return res.status(404).json({ success: false, error: 'Archivo no encontrado' })
  }

  if (!fs.existsSync(media.filePath)) {
    return res.status(404).json({ success: false, error: 'Archivo no existe en disco' })
  }

  res.download(media.filePath, media.originalName)
}))

// POST /api/music/convert/:id - Convertir archivo a otro formato
router.post('/convert/:id', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { format } = req.body
  const allowedFormats = ['mp3', 'wav', 'ogg', 'aac', 'flac', 'mp4', 'webm']

  if (!format || !allowedFormats.includes(format)) {
    return res.status(400).json({
      success: false,
      error: `Formato no válido. Formatos permitidos: ${allowedFormats.join(', ')}`
    })
  }

  const media = await MediaFile.findById(req.params.id)
  if (!media) {
    return res.status(404).json({ success: false, error: 'Archivo no encontrado' })
  }

  if (!fs.existsSync(media.filePath)) {
    return res.status(404).json({ success: false, error: 'Archivo original no existe en disco' })
  }

  const outputFilename = `${Date.now()}-converted.${format}`
  const outputPath = path.join(CONVERTED_DIR, outputFilename)

  // Ejecutar ffmpeg para convertir
  const ffmpeg = spawn('ffmpeg', [
    '-i', media.filePath,
    '-y', // sobrescribir si existe
    outputPath
  ])

  let stderr = ''
  ffmpeg.stderr.on('data', (data) => { stderr += data.toString() })

  ffmpeg.on('close', async (code) => {
    if (code !== 0 || !fs.existsSync(outputPath)) {
      console.error('ffmpeg error:', stderr)
      return res.status(500).json({ success: false, error: 'Error en la conversión' })
    }

    const stat = fs.statSync(outputPath)
    const duration = await getMediaDuration(outputPath)
    const isVideo = ['mp4', 'webm'].includes(format)

    // Guardar archivo convertido en DB
    const converted = new MediaFile({
      title: `${media.title} (${format.toUpperCase()})`,
      artist: media.artist,
      filename: outputFilename,
      originalName: `${path.parse(media.originalName).name}.${format}`,
      mimetype: isVideo ? `video/${format}` : `audio/${format === 'mp3' ? 'mpeg' : format}`,
      size: stat.size,
      duration,
      filePath: outputPath,
      mediaType: isVideo ? 'video' : 'audio',
      uploadedBy: req.user!.id,
      convertedFrom: {
        originalName: media.originalName,
        originalFormat: path.extname(media.originalName).slice(1),
        conversionSettings: { format, quality: 'default', bitrate: 0 }
      }
    })

    await converted.save()

    res.json({
      success: true,
      data: converted,
      message: `Archivo convertido a ${format.toUpperCase()} exitosamente`
    })
  })
}))

// GET /api/music/download-converted/:id - Descargar archivo convertido
router.get('/download-converted/:id', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const media = await MediaFile.findById(req.params.id)
  if (!media) {
    return res.status(404).json({ success: false, error: 'Archivo no encontrado' })
  }

  const filePath = media.filePath
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, error: 'Archivo no existe en disco' })
  }

  res.download(filePath, media.originalName)
}))

// DELETE /api/music/:id - Eliminar archivo
router.delete('/:id', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const media = await MediaFile.findOne({ _id: req.params.id, uploadedBy: req.user!.id })
  if (!media) {
    return res.status(404).json({ success: false, error: 'Archivo no encontrado' })
  }

  // Eliminar archivo del disco
  if (fs.existsSync(media.filePath)) {
    fs.unlinkSync(media.filePath)
  }

  await MediaFile.deleteOne({ _id: media._id })

  res.json({ success: true, message: 'Archivo eliminado exitosamente' })
}))

export default router
