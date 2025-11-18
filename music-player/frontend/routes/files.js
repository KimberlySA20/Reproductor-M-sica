const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fileController = require('../controllers/fileController');
const auth = require('../middleware/auth');

const router = express.Router();


// Configuración de multer para la subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', '..', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Filtro de archivos permitidos
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/aac',
        'video/mp4', 'video/webm', 'video/quicktime',
        'application/octet-stream' // Para algunos archivos de audio sin tipo MIME específico
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Tipo de archivo no soportado'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 200 * 1024 * 1024, // 200MB
        files: 10 // Máximo 10 archivos a la vez
    }
});

// Middleware para manejar errores de multer
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        // Error de Multer (ej: archivo demasiado grande)
        return res.status(400).json({ message: `Error al subir el archivo: ${err.message}` });
    } else if (err) {
        // Otros errores
        return res.status(400).json({ message: err.message });
    }
    next();
};

// Rutas protegidas (requieren autenticación)
router.use(auth);

// Subir archivo
router.post('/upload', 
    upload.single('file'), 
    handleMulterError,
    (req, res, next) => {
        // Asegurarse de que los parámetros de conversión se pasen correctamente
        if (req.body.convertTo || req.body.quality) {
            req.convertTo = req.body.convertTo;
            req.quality = req.body.quality;
        }
        next();
    },
    fileController.uploadFile
);

// Descargar archivo
router.get('/download/:id', fileController.downloadFile);

// Streaming de archivo (para videos)
router.get('/stream/:id', fileController.streamFile);

// Obtener archivos del usuario
router.get('/my-files', fileController.getUserFiles);

// Obtener videos del usuario
router.get('/videos', fileController.getUserVideos);

// Convertir archivo
router.post('/convert', fileController.convertFile);

// Obtener archivos compartidos
router.get('/shared', fileController.getSharedFiles);

// Obtener archivos convertidos
router.get('/converted', fileController.getConvertedFiles);

// Compartir archivo
router.post('/share/:id', 
    express.json(),
    fileController.shareFile
);

// Eliminar archivo
router.delete('/:id', fileController.deleteFile);

module.exports = router;
