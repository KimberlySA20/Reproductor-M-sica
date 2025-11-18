const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const util = require('util');

// Configuración de directorios
const CONVERTED_DIR = path.join(__dirname, '..', '..', 'converted');

// Asegurarse de que el directorio convertido existe
if (!fs.existsSync(CONVERTED_DIR)) {
    console.log(`Creando directorio de salida: ${CONVERTED_DIR}`);
    fs.mkdirSync(CONVERTED_DIR, { recursive: true });
}

// Mapeo de formatos a MIME types
const FORMAT_TO_MIME = {
    'mp3': 'audio/mpeg',
    'aac': 'audio/aac',
    'ogg': 'audio/ogg',
    'wav': 'audio/wav',
    'm4a': 'audio/mp4'
};

// Mapeo de formatos a codecs y configuraciones específicas
const FORMAT_TO_CODEC = {
    'mp3': { codec: 'libmp3lame' },
    'aac': { 
        codec: 'aac',
        options: [
            '-profile:a', 'aac_low',
            '-f', 'adts'  // Usar formato ADTS para AAC
        ]
    },
    'ogg': { codec: 'libvorbis' },
    'wav': { codec: 'pcm_s16le' },
    'm4a': { 
        codec: 'aac',
        options: [
            '-profile:a', 'aac_low',
            '-f', 'mp4',  // Usar formato MP4 para M4A
            '-movflags', '+faststart'
        ]
    }
};

// Configuraciones de calidad
const QUALITY_PRESETS = {
    'low': { audioBitrate: '64k', audioChannels: 1, audioFrequency: 22050 },
    'medium': { audioBitrate: '128k', audioChannels: 2, audioFrequency: 44100 },
    'high': { audioBitrate: '320k', audioChannels: 2, audioFrequency: 48000 }
};

// Utilidad para generar nombres de archivo únicos
const generateFileName = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');

// Función para limpiar nombres de archivo
const sanitizeFilename = (filename) => {
    return filename.replace(/[^\w\d.-]/g, '_');
};

// Controlador de conversión
exports.convertFile = async (req, res) => {
    console.log('Iniciando proceso de conversión...');
    console.log('Archivo recibido:', req.file);
    console.log('Cuerpo de la solicitud:', req.body);

    const tempPath = req.file?.path;
    
    try {
        // Validar que se haya subido un archivo
        if (!req.file) {
            console.error('No se recibió ningún archivo en la solicitud');
            return res.status(400).json({ 
                success: false,
                message: 'No se ha proporcionado ningún archivo' 
            });
        }

        // Obtener parámetros de la solicitud
        const { convertTo, quality = 'medium', originalName } = req.body;
        
        console.log(`Parámetros de conversión: convertTo=${convertTo}, quality=${quality}`);

        // Validar formato de salida
        if (!convertTo || !FORMAT_TO_CODEC[convertTo]) {
            const errorMsg = `Formato de conversión no válido o no soportado: ${convertTo}`;
            console.error(errorMsg);
            return res.status(400).json({ 
                success: false,
                message: errorMsg,
                supportedFormats: Object.keys(FORMAT_TO_CODEC)
            });
        }

        // Configurar rutas de archivo
        const outputExtension = `.${convertTo}`;
        const outputFileName = `${generateFileName()}${outputExtension}`;
        const outputPath = path.join(CONVERTED_DIR, outputFileName);
        
        console.log(`Ruta de salida: ${outputPath}`);

        // Verificar que el archivo temporal existe
        if (!fs.existsSync(tempPath)) {
            const errorMsg = `El archivo temporal no existe: ${tempPath}`;
            console.error(errorMsg);
            return res.status(500).json({ 
                success: false,
                message: 'Error al procesar el archivo',
                error: errorMsg
            });
        }

        // Configuración de calidad
        const qualitySettings = QUALITY_PRESETS[quality] || QUALITY_PRESETS.medium;
        const codecConfig = FORMAT_TO_CODEC[convertTo] || { codec: 'copy' };
        
        console.log(`Configuración de conversión:`, {
            codec: codecConfig.codec,
            quality: qualitySettings,
            format: convertTo,
            options: codecConfig.options || []
        });

        // Realizar la conversión
        console.log('Iniciando conversión con FFMPEG...');
        await new Promise((resolve, reject) => {
            const command = ffmpeg(tempPath)
                .audioCodec(codecConfig.codec)
                .audioBitrate(qualitySettings.audioBitrate)
                .audioChannels(qualitySettings.audioChannels)
                .audioFrequency(qualitySettings.audioFrequency)
                .outputOptions(codecConfig.options || [])
                .on('start', (commandLine) => {
                    console.log('Comando FFMPEG ejecutado:', commandLine);
                })
                .on('progress', (progress) => {
                    console.log(`Progreso: ${Math.round(progress.percent || 0)}%`);
                })
                .on('error', (err, stdout, stderr) => {
                    console.error('Error en FFMPEG:');
                    console.error('Mensaje:', err.message);
                    console.error('Salida estándar:', stdout);
                    console.error('Error estándar:', stderr);
                    reject(new Error(`Error en la conversión: ${err.message}`));
                })
                .on('end', () => {
                    console.log(`Conversión completada: ${outputPath}`);
                    resolve();
                })
                .save(outputPath);

            // Agregar un manejador para el evento 'stderr' para capturar más detalles
            command.on('stderr', (stderrLine) => {
                console.log('FFMPEG stderr:', stderrLine);
            });
        });

        // Verificar que el archivo convertido existe
        if (!fs.existsSync(outputPath)) {
            throw new Error(`El archivo convertido no se creó correctamente en: ${outputPath}`);
        }

        // Obtener estadísticas del archivo convertido
        const stats = fs.statSync(outputPath);
        console.log(`Archivo convertido creado: ${outputPath} (${stats.size} bytes)`);

        // Enviar respuesta exitosa
        res.status(200).json({
            success: true,
            message: 'Archivo convertido exitosamente',
            filePath: outputPath,
            fileName: outputFileName,
            size: stats.size,
            mimeType: FORMAT_TO_MIME[convertTo] || 'application/octet-stream'
        });

    } catch (error) {
        console.error('Error en la conversión del worker:');
        console.error('Mensaje:', error.message);
        console.error('Stack:', error.stack);
        
        // Verificar si el error proviene de FFMPEG
        if (error.message.includes('ffmpeg')) {
            console.error('Posible problema con la instalación de FFMPEG');
        }

        res.status(500).json({ 
            success: false,
            message: 'Error al procesar el archivo',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    } finally {
        // Limpiar archivo temporal si existe
        if (tempPath && fs.existsSync(tempPath)) {
            try {
                console.log(`Eliminando archivo temporal: ${tempPath}`);
                fs.unlinkSync(tempPath);
            } catch (cleanupError) {
                console.error('Error al limpiar archivo temporal:', cleanupError);
            }
        }
    }
};
