// worker/routes/media.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const { Media } = require('../model');
const { authenticate, authorize } = require('../middleware/auth');

// Configuración de almacenamiento
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ 
    storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'audio/mp3', 'audio/wav', 'audio/flac', 'audio/mpeg',
            'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de archivo no soportado'), false);
        }
    },
    limits: { fileSize: 500 * 1024 * 1024 } // 500MB
});

// Subir archivo
router.post('/upload', authenticate, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se ha subido ningún archivo' });
        }

        // Obtener metadatos del archivo
        const stats = fs.statSync(req.file.path);
        const fileType = req.file.mimetype.startsWith('audio/') ? 'audio' : 'video';
        const format = path.extname(req.file.originalname).toLowerCase().substring(1);

        const media = new Media({
            title: req.body.title || path.parse(req.file.originalname).name,
            originalName: req.file.originalname,
            filePath: path.relative(path.join(__dirname, '../..'), req.file.path),
            fileType,
            format,
            size: stats.size,
            owner: req.user._id,
            isPublic: req.body.isPublic === 'true'
        });

        // Para archivos de audio, obtener duración
        if (fileType === 'audio') {
            const duration = await getMediaDuration(req.file.path);
            media.duration = duration;
        }

        await media.save();

        // Iniciar conversión a formatos estándar
        if (fileType === 'audio') {
            convertToStandardFormats(media, req.file.path);
        }

        res.status(201).json(media);
    } catch (error) {
        console.error('Error al subir archivo:', error);
        res.status(500).json({ error: 'Error al subir el archivo' });
    }
});

// Obtener lista de medios
router.get('/', authenticate, async (req, res) => {
    try {
        const query = { $or: [{ owner: req.user._id }, { isPublic: true }] };
        if (req.query.search) {
            query.$text = { $search: req.query.search };
        }
        
        const media = await Media.find(query)
            .sort({ createdAt: -1 })
            .populate('owner', 'username');
            
        res.json(media);
    } catch (error) {
        console.error('Error al obtener medios:', error);
        res.status(500).json({ error: 'Error al obtener la lista de medios' });
    }
});

// Obtener un medio por ID
router.get('/:id', authenticate, async (req, res) => {
    try {
        const media = await Media.findOne({
            _id: req.params.id,
            $or: [{ owner: req.user._id }, { isPublic: true }]
        }).populate('owner', 'username');

        if (!media) {
            return res.status(404).json({ error: 'Medio no encontrado' });
        }

        res.json(media);
    } catch (error) {
        console.error('Error al obtener medio:', error);
        res.status(500).json({ error: 'Error al obtener el medio' });
    }
});

// Eliminar un medio
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const media = await Media.findOneAndDelete({
            _id: req.params.id,
            owner: req.user._id
        });

        if (!media) {
            return res.status(404).json({ error: 'Medio no encontrado o sin permisos' });
        }

        // Eliminar archivos asociados
        const filePath = path.join(__dirname, '../..', media.filePath);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Eliminar archivos convertidos
        if (media.convertedFormats && media.convertedFormats.length > 0) {
            media.convertedFormats.forEach(format => {
                const convertedPath = path.join(__dirname, '../..', format.path);
                if (fs.existsSync(convertedPath)) {
                    fs.unlinkSync(convertedPath);
                }
            });
        }

        res.json({ message: 'Medio eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar medio:', error);
        res.status(500).json({ error: 'Error al eliminar el medio' });
    }
});

// Función para obtener la duración de un archivo multimedia
function getMediaDuration(filePath) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) {
                console.error('Error al obtener metadatos:', err);
                return resolve(0); // Valor por defecto si hay error
            }
            resolve(metadata.format.duration || 0);
        });
    });
}

// Función para convertir a formatos estándar
function convertToStandardFormats(media, originalPath) {
    const outputDir = path.join(path.dirname(originalPath), 'converted');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const baseName = path.basename(originalPath, path.extname(originalPath));
    const conversions = [];

    if (media.fileType === 'audio') {
        // Convertir a MP3 (alta calidad)
        if (media.format !== 'mp3') {
            const mp3Path = path.join(outputDir, `${baseName}.mp3`);
            conversions.push(convertAudio(originalPath, mp3Path, {
                format: 'mp3',
                audioCodec: 'libmp3lame',
                audioBitrate: '192k',
                audioChannels: 2,
                audioFrequency: 44100
            }, media));
        }

        // Convertir a AAC (buena calidad, menor tamaño)
        const aacPath = path.join(outputDir, `${baseName}.m4a`);
        conversions.push(convertAudio(originalPath, aacPath, {
            format: 'ipod',
            audioCodec: 'aac',
            audioBitrate: '128k',
            audioChannels: 2,
            audioFrequency: 44100
        }, media));

        // Convertir a OPUS (mejor compresión para streaming)
        const opusPath = path.join(outputDir, `${baseName}.opus`);
        conversions.push(convertAudio(originalPath, opusPath, {
            format: 'opus',
            audioCodec: 'libopus',
            audioBitrate: '96k',
            audioChannels: 2,
            audioFrequency: 48000
        }, media));
    }

    // Ejecutar todas las conversiones en paralelo
    Promise.all(conversions).then(async () => {
        // Actualizar el documento con los formatos convertidos
        const convertedFormats = [];
        const stats = fs.statSync(originalPath);
        
        // Agregar formato original
        convertedFormats.push({
            format: media.format,
            path: media.filePath,
            size: stats.size
        });

        // Agregar formatos convertidos
        const files = fs.readdirSync(outputDir);
        for (const file of files) {
            if (file.startsWith(baseName)) {
                const format = path.extname(file).toLowerCase().substring(1);
                if (format !== media.format) {
                    const filePath = path.join('converted', file);
                    const fileStats = fs.statSync(path.join(outputDir, file));
                    convertedFormats.push({
                        format,
                        path: filePath,
                        size: fileStats.size
                    });
                }
            }
        }

        await Media.findByIdAndUpdate(media._id, { convertedFormats });
    }).catch(error => {
        console.error('Error en las conversiones:', error);
    });
}

// Función para convertir audio
function convertAudio(inputPath, outputPath, options, media) {
    return new Promise((resolve, reject) => {
        console.log(`Iniciando conversión de ${inputPath} a ${outputPath}`);
        
        const command = ffmpeg(inputPath)
            .audioCodec(options.audioCodec)
            .audioBitrate(options.audioBitrate)
            .audioChannels(options.audioChannels)
            .audioFrequency(options.audioFrequency)
            .format(options.format)
            .on('progress', (progress) => {
                console.log(`Progreso de conversión a ${options.format}: ${Math.round(progress.percent || 0)}%`);
            })
            .on('end', () => {
                console.log(`Conversión a ${options.format} completada: ${outputPath}`);
                resolve();
            })
            .on('error', (err) => {
                console.error(`Error en la conversión a ${options.format}:`, err);
                reject(err);
            });
            
        // Para video, copiar el códec de video sin procesar
        if (media.fileType === 'video') {
            command.videoCodec('copy');
        }
        
        command.save(outputPath);
    });
}

// Stream de archivo de audio
router.get('/play/:songId', async (req, res) => {
    try {
        const { songId } = req.params;
        
        // Buscar el archivo en la base de datos
        const media = await Media.findById(songId);
        if (!media) {
            return res.status(404).json({ message: 'Archivo no encontrado' });
        }

        // Determinar la ruta del archivo
        let filePath = '';
        const uploadsPath = path.join(__dirname, '../../uploads', path.basename(media.filePath));
        const convertedPath = path.join(__dirname, '../../converted', path.basename(media.filePath));
        
        // Verificar si el archivo existe en uploads o converted
        if (fs.existsSync(uploadsPath)) {
            filePath = uploadsPath;
        } else if (fs.existsSync(convertedPath)) {
            filePath = convertedPath;
        } else {
            return res.status(404).json({ message: 'Archivo no encontrado en el sistema de archivos' });
        }

        // Obtener estadísticas del archivo para el tamaño
        const stat = fs.statSync(filePath);
        const fileSize = stat.size;
        const range = req.headers.range;

        // Configurar cabeceras para streaming
        if (range) {
            // Parsear el rango solicitado
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunkSize = (end - start) + 1;
            
            // Crear stream de lectura para el rango solicitado
            const file = fs.createReadStream(filePath, { start, end });
            
            // Configurar cabeceras de respuesta
            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunkSize,
                'Content-Type': 'audio/mpeg', // Ajustar según el tipo de archivo
            };

            // Enviar respuesta con código 206 (Partial Content)
            res.writeHead(206, head);
            file.pipe(res);
        } else {
            // Si no se especifica rango, enviar todo el archivo
            const head = {
                'Content-Length': fileSize,
                'Content-Type': 'audio/mpeg', // Ajustar según el tipo de archivo
            };
            
            res.writeHead(200, head);
            fs.createReadStream(filePath).pipe(res);
        }
    } catch (error) {
        console.error('Error al transmitir archivo:', error);
        res.status(500).json({ message: 'Error al procesar la solicitud', error: error.message });
    }
});

module.exports = router;