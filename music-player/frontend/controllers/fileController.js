const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { promisify } = require('util');
const stream = require('stream');
const ffmpeg = require('fluent-ffmpeg');
const File = require('../models/File');
const User = require('../models/User');
const axios = require('axios');
const FormData = require('form-data');

const pipeline = promisify(stream.pipeline);

// Configuración de directorios
const UPLOAD_DIR = path.join(__dirname, '../../uploads');
const CONVERTED_DIR = path.join(UPLOAD_DIR, 'converted');

// Asegurarse de que los directorios existan
[UPLOAD_DIR, CONVERTED_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Generar nombre de archivo único
const generateFileName = (bytes = 32) => 
    crypto.randomBytes(bytes).toString('hex');

// Obtener extensión del archivo
const getFileExtension = (filename) => 
    path.extname(filename).toLowerCase();

// Mapeo de formatos a codecs
const FORMAT_TO_CODEC = {
    'mp3': 'libmp3lame',
    'aac': 'aac',
    'ogg': 'libvorbis',
    'wav': 'pcm_s16le',
    'm4a': 'aac'
};

// Configuración de calidad
const QUALITY_PRESETS = {
    'low': {
        audioBitrate: '64k',
        audioChannels: 1,
        audioFrequency: 22050
    },
    'medium': {
        audioBitrate: '128k',
        audioChannels: 2,
        audioFrequency: 44100
    },
    'high': {
        audioBitrate: '320k',
        audioChannels: 2,
        audioFrequency: 48000
    }
};

// Delegar la conversión a un worker
const delegateToWorker = async (filePath, originalName, convertTo, quality) => {
    try {
        // Obtener el mejor worker disponible usando el balanceador de carga
        const bestWorkerResponse = await axios.get('http://localhost:3000/api/v1/nodes/best?taskType=audio_conversion');
        
        if (!bestWorkerResponse.data.data.node) {
            throw new Error('No hay workers disponibles');
        }
        
        const workerUrl = `${bestWorkerResponse.data.data.node.url}/api/convert`;
        console.log(`Delegando a: ${workerUrl}`);

        const formData = new FormData();
        formData.append('file', fs.createReadStream(filePath));
        formData.append('convertTo', convertTo);
        formData.append('quality', quality);
        formData.append('originalName', originalName);

        const response = await axios.post(workerUrl, formData, {
            headers: {
                ...formData.getHeaders(),
                'Content-Type': 'multipart/form-data'
            }
        });

        return response.data;
    } catch (error) {
        console.error('Error en delegateToWorker:', error.message);
        if (error.response) {
            console.error('Respuesta del worker:', error.response.data);
        }
        throw new Error('La conversión en el worker falló');
    }
};

// Subir archivo
const uploadFile = async (req, res) => {
    let tempPath = req.file?.path;
    
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No se ha proporcionado ningún archivo' });
        }

        const { originalname, mimetype, size } = req.file;
        const convertTo = req.convertTo || req.body.convertTo;
        const quality = req.quality || req.body.quality || 'medium';
        const userId = req.user.id;
        
        console.log('Iniciando subida de archivo:', {
            originalname,
            mimetype,
            size,
            convertTo,
            quality,
            tempPath
        });

        let finalFilePath;
        let finalFileSize;
        let finalMimeType = mimetype;
        let finalFileName;

        if (convertTo) {
            // Delegar la conversión al worker
            const conversionResult = await delegateToWorker(tempPath, originalname, convertTo, quality);
            
            finalFilePath = conversionResult.filePath;
            finalFileSize = conversionResult.size;
            finalMimeType = conversionResult.mimeType;
            finalFileName = path.basename(finalFilePath);

        } else {
            // Mover el archivo sin conversión
            const fileExt = getFileExtension(originalname) || '';
            finalFileName = `${generateFileName()}${fileExt}`;
            finalFilePath = path.join(UPLOAD_DIR, finalFileName);
            
            // Mover el archivo a la ubicación final
            await fs.promises.rename(tempPath, finalFilePath);
            
            // Obtener el tamaño real del archivo
            const stats = await fs.promises.stat(finalFilePath);
            finalFileSize = stats.size;
        }

        // Guardar información del archivo en la base de datos
        const file = new File({
            originalName: originalname,
            fileName: finalFileName,
            filePath: finalFilePath,
            size: finalFileSize,
            mimeType: finalMimeType,
            owner: userId,
            convertedFrom: convertTo ? {
                originalName: originalname,
                originalFormat: getFileExtension(originalname).substring(1),
                conversionSettings: {
                    format: convertTo,
                    quality: quality,
                    bitrate: parseInt(QUALITY_PRESETS[quality]?.audioBitrate || '128k', 10) // Remove 'k' and convert to number
                }
            } : undefined
        });

        await file.save();

        // Actualizar la lista de archivos del usuario
        await User.findByIdAndUpdate(userId, {
            $push: { files: file._id }
        });

        res.status(201).json({
            message: 'Archivo procesado y guardado exitosamente',
            file: {
                id: file._id,
                name: file.originalName,
                size: file.size,
                mimeType: file.mimeType,
                uploadDate: file.uploadDate,
                downloadUrl: file.getDownloadUrl()
            }
        });

    } catch (error) {
        console.error('Error al subir archivo:', error);
        
        if (tempPath && fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
        }
        
        res.status(500).json({ 
            message: 'Error al procesar el archivo',
            error: error.message 
        });
    } finally {
        // Limpiar el archivo temporal original después de procesarlo
        if (tempPath && fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
        }
    }
};


// Descargar archivo
const downloadFile = async (req, res) => {
    try {
        const fileId = req.params.id;
        const userId = req.user.id;

        console.log('Download request:', { fileId, userId });
        console.log('User from token:', req.user);

        // Verificar si el fileId es válido
        if (!fileId || fileId.length !== 24) {
            console.log('Invalid fileId format:', fileId);
            return res.status(400).json({ message: 'ID de archivo inválido' });
        }

        const file = await File.findById(fileId)
            .populate('owner', 'email')
            .populate('sharedWith.user', 'email');

        console.log('File found:', !!file);
        if (file) {
            console.log('File details:', {
                _id: file._id,
                originalName: file.originalName,
                owner: file.owner?.email,
                convertedFrom: file.convertedFrom,
                filePath: file.filePath
            });
        }

        if (!file) {
            console.log('File not found in database for ID:', fileId);
            // Listar algunos archivos del usuario para comparación
            const userFiles = await File.find({ owner: userId }).limit(5).select('_id originalName convertedFrom');
            console.log('User files sample:', userFiles);
            return res.status(404).json({ message: 'Archivo no encontrado' });
        }

        // Verificar permisos
        console.log('Checking permissions:');
        console.log('- File owner ID:', file.owner);
        console.log('- User ID from token:', userId);
        console.log('- Owner type:', typeof file.owner);
        console.log('- User ID type:', typeof userId);
        console.log('- Are they equal?', file.owner.toString() === userId);
        
        if (!file.canAccess(userId)) {
            console.log('Permission denied - canAccess returned false');
            return res.status(403).json({ message: 'No tienes permiso para acceder a este archivo' });
        }

        // Verificar si el archivo existe físicamente
        if (!fs.existsSync(file.filePath)) {
            return res.status(404).json({ message: 'El archivo físico no existe' });
        }

        // Configurar encabezados de respuesta
        res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
        res.setHeader('Content-Type', file.mimeType);
        res.setHeader('Content-Length', file.size);

        // Transmitir el archivo
        const fileStream = fs.createReadStream(file.filePath);
        fileStream.pipe(res);

    } catch (error) {
        console.error('Error al descargar archivo:', error);
        res.status(500).json({ 
            message: 'Error al descargar el archivo',
            error: error.message 
        });
    }
};

// Obtener archivos del usuario
const getUserFiles = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Obtener el usuario con sus archivos poblados
        const user = await User.findById(userId).populate({
            path: 'files',
            options: { sort: { uploadDate: -1 } },
            select: 'originalName fileName size mimeType uploadDate downloadUrl convertedFrom'
        });

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Formatear la respuesta
        const files = user.files.map(file => ({
            id: file._id,
            name: file.originalName,
            size: file.size,
            mimeType: file.mimeType,
            uploadDate: file.uploadDate,
            downloadUrl: file.downloadUrl,
            isConverted: !!file.convertedFrom,
            originalFormat: file.convertedFrom?.originalFormat,
            convertedTo: file.convertedFrom?.conversionSettings?.format
        }));

        res.json(files);
    } catch (error) {
        console.error('Error al obtener archivos:', error);
        res.status(500).json({ 
            message: 'Error al obtener archivos',
            error: error.message 
        });
    }
};

const getUserVideos = async (req, res) => {
    try {
        const userId = req.user.id;

        // Obtener el usuario con sus archivos poblados
        const user = await User.findById(userId).populate({
            path: 'files',
            options: { sort: { uploadDate: -1 } },
            select: 'originalName fileName size mimeType uploadDate downloadUrl convertedFrom'
        });

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Filtrar solo archivos de video
        const videoFiles = user.files.filter(file => {
            const videoMimeTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv'];
            const videoExtensions = ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.wmv', '.mkv', '.flv'];
            
            return videoMimeTypes.includes(file.mimeType) || 
                   videoExtensions.some(ext => file.originalName.toLowerCase().endsWith(ext));
        });

        // Formatear la respuesta para compatibilidad con el frontend
        const videos = videoFiles.map(file => ({
            _id: file._id,
            title: file.originalName.replace(/\.[^/.]+$/, ""), // Remove extension
            artist: 'Unknown', // Default value for videos
            originalName: file.originalName,
            size: file.size,
            contentType: file.mimeType,
            uploadDate: file.uploadDate,
            downloadUrl: file.downloadUrl,
            convertedFrom: file.convertedFrom
        }));

        res.json(videos);
    } catch (error) {
        console.error('Error al obtener videos del usuario:', error);
        res.status(500).json({ message: 'Error al obtener videos del usuario' });
    }
};

const convertFile = async (req, res) => {
    try {
        const { fileId, format } = req.body;
        const userId = req.user.id;

        // Buscar el archivo
        const file = await File.findById(fileId);

        if (!file) {
            return res.status(404).json({ message: 'Archivo no encontrado' });
        }

        // Verificar si el usuario tiene permiso para convertir el archivo
        const user = await User.findById(userId);
        if (!user.files.includes(fileId) && file.owner.toString() !== userId && !file.isPublic) {
            // Verificar si el archivo está compartido con el usuario
            const isShared = file.sharedWith.some(share => 
                share.user.toString() === userId && 
                (share.permission === 'view' || share.permission === 'edit')
            );

            if (!isShared) {
                return res.status(403).json({ message: 'No tienes permiso para convertir este archivo' });
            }
        }

        // Verificar que sea un archivo de video
        if (!file.mimeType.startsWith('video/')) {
            return res.status(400).json({ message: 'Este archivo no es un video' });
        }

        // Obtener la extensión original
        const originalExtension = file.originalName.split('.').pop().toLowerCase();
        
        // Verificar que no sea el mismo formato
        if (originalExtension === format) {
            return res.status(400).json({ message: 'El archivo ya está en el formato solicitado' });
        }

        // Ruta del archivo original
        const originalPath = path.join(UPLOAD_DIR, file.fileName);
        
        // Generar nombre para el archivo convertido
        const convertedFileName = generateFileName();
        const convertedFileNameWithExt = `${convertedFileName}.${format}`;
        const convertedPath = path.join(CONVERTED_DIR, convertedFileNameWithExt);

        // Verificar que el archivo original exista
        if (!fs.existsSync(originalPath)) {
            return res.status(404).json({ message: 'Archivo original no encontrado' });
        }

        // Usar FFmpeg para convertir el video
        return new Promise((resolve, reject) => {
            const ffmpegCommand = ffmpeg(originalPath)
                .output(convertedPath)
                .format(format)
                .on('start', (commandLine) => {
                    console.log('FFmpeg command:', commandLine);
                })
                .on('progress', (progress) => {
                    console.log('Conversion progress:', progress.percent + '%');
                })
                .on('end', async () => {
                    try {
                        // Crear registro del archivo convertido
                        const convertedFile = new File({
                            originalName: `${file.originalName.split('.')[0]}.${format}`,
                            fileName: convertedFileNameWithExt,
                            size: fs.statSync(convertedPath).size,
                            mimeType: `video/${format}`,
                            owner: userId,
                            uploadDate: new Date(),
                            convertedFrom: {
                                originalFileId: file._id,
                                originalFormat: originalExtension,
                                conversionSettings: {
                                    format: format,
                                    quality: 'default'
                                }
                            }
                        });

                        await convertedFile.save();

                        // Agregar el archivo convertido al usuario
                        user.files.push(convertedFile._id);
                        await user.save();

                        res.json({
                            message: 'Video convertido exitosamente',
                            convertedFile: {
                                id: convertedFile._id,
                                name: convertedFile.originalName,
                                format: format,
                                size: convertedFile.size
                            }
                        });

                        resolve();
                    } catch (error) {
                        console.error('Error saving converted file:', error);
                        reject(error);
                    }
                })
                .on('error', (err) => {
                    console.error('Error en conversión FFmpeg:', err);
                    res.status(500).json({ message: 'Error al convertir el video', error: err.message });
                    reject(err);
                });

            ffmpegCommand.run();
        });

    } catch (error) {
        console.error('Error al convertir archivo:', error);
        res.status(500).json({ message: 'Error al convertir el archivo' });
    }
};

const streamFile = async (req, res) => {
    try {
        const fileId = req.params.id;
        let userId = req.user?.id;

        // Si no hay usuario en req (por streaming directo), intentar obtener del token en query
        if (!userId && req.query.token) {
            try {
                const jwt = require('jsonwebtoken');
                const decoded = jwt.verify(req.query.token, process.env.JWT_SECRET);
                userId = decoded.id;
            } catch (tokenError) {
                return res.status(401).json({ message: 'Token inválido' });
            }
        }

        if (!userId) {
            return res.status(401).json({ message: 'No autorizado' });
        }

        // Buscar el archivo
        const file = await File.findById(fileId);

        if (!file) {
            return res.status(404).json({ message: 'Archivo no encontrado' });
        }

        // Verificar si el usuario tiene permiso para acceder al archivo
        const user = await User.findById(userId);
        if (!user.files.includes(fileId) && file.owner.toString() !== userId && !file.isPublic) {
            // Verificar si el archivo está compartido con el usuario
            const isShared = file.sharedWith.some(share => 
                share.user.toString() === userId && 
                (share.permission === 'view' || share.permission === 'edit')
            );

            if (!isShared) {
                return res.status(403).json({ message: 'No tienes permiso para acceder a este archivo' });
            }
        }

        const filePath = path.join(UPLOAD_DIR, file.fileName);

        // Verificar si el archivo existe
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'Archivo no encontrado en el servidor' });
        }

        // Obtener estadísticas del archivo
        const stat = fs.statSync(filePath);
        const fileSize = stat.size;
        const range = req.headers.range;

        // Si no hay range header, enviar el archivo completo
        if (!range) {
            res.writeHead(200, {
                'Content-Length': fileSize,
                'Content-Type': file.mimeType,
                'Accept-Ranges': 'bytes'
            });
            
            const fileStream = fs.createReadStream(filePath);
            fileStream.pipe(res);
            return;
        }

        // Parsear el range header
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const fileStream = fs.createReadStream(filePath, { start, end });

        const head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': file.mimeType,
        };

        res.writeHead(206, head);
        fileStream.pipe(res);

    } catch (error) {
        console.error('Error al hacer streaming del archivo:', error);
        res.status(500).json({ message: 'Error al hacer streaming del archivo' });
    }
};

// Obtener archivos compartidos con el usuario
const getSharedFiles = async (req, res) => {
    try {
        const userId = req.user.id;
        const files = await File.find({
            $or: [
                { 'sharedWith.user': userId },
                { isPublic: true }
            ]
        })
        .populate('owner', 'email')
        .sort({ uploadDate: -1 });

        res.json(files);
    } catch (error) {
        console.error('Error al obtener archivos compartidos:', error);
        res.status(500).json({ 
            message: 'Error al obtener archivos compartidos',
            error: error.message 
        });
    }
};

// Compartir archivo
const shareFile = async (req, res) => {
    try {
        const fileId = req.params.id;
        const { email } = req.body;
        const userId = req.user.id;

        // Buscar al usuario con el que se quiere compartir
        const userToShare = await User.findOne({ email });
        
        if (!userToShare) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const file = await File.findById(fileId);
        
        if (!file) {
            return res.status(404).json({ message: 'Archivo no encontrado' });
        }

        // Verificar que el usuario que comparte es el propietario
        if (file.owner.toString() !== userId) {
            return res.status(403).json({ message: 'Solo el propietario puede compartir el archivo' });
        }

        // Compartir el archivo
        await file.shareWith(userToShare._id, email);
        
        res.json({ message: 'Archivo compartido exitosamente' });
    } catch (error) {
        console.error('Error al compartir archivo:', error);
        res.status(500).json({ 
            message: 'Error al compartir el archivo',
            error: error.message 
        });
    }
};

// Eliminar archivo
const deleteFile = async (req, res) => {
    try {
        const fileId = req.params.id;
        const userId = req.user.id;

        const file = await File.findById(fileId);
        
        if (!file) {
            return res.status(404).json({ message: 'Archivo no encontrado' });
        }

        // Verificar que el usuario es el propietario
        const ownerId = file.owner._id ? file.owner._id : file.owner;
        if (ownerId.toString() !== userId) {
            return res.status(403).json({ message: 'Solo el propietario puede eliminar el archivo' });
        }

        // Eliminar archivo físico
        if (fs.existsSync(file.filePath)) {
            fs.unlinkSync(file.filePath);
        }

        // Eliminar de la base de datos
        await File.findByIdAndDelete(fileId);
        
        res.json({ message: 'Archivo eliminado exitosamente' });
    } catch (error) {
        console.error('Error al eliminar archivo:', error);
        res.status(500).json({ 
            message: 'Error al eliminar el archivo',
            error: error.message 
        });
    }
};

// Obtener archivos convertidos
const getConvertedFiles = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Buscar archivos que tengan el campo convertedFrom (archivos convertidos)
        const files = await File.find({
            owner: userId,
            'convertedFrom': { $exists: true, $ne: null }
        }).sort({ uploadDate: -1 });

        res.status(200).json(files);
    } catch (error) {
        console.error('Error al obtener archivos convertidos:', error);
        res.status(500).json({ message: 'Error al obtener archivos convertidos' });
    }
};

module.exports = {
    uploadFile,
    downloadFile,
    getUserFiles,
    deleteFile,
    shareFile,
    getSharedFiles,
    getConvertedFiles,
    getUserVideos,
    streamFile,
    convertFile
};