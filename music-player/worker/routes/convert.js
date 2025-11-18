const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const convertController = require('../controllers/convertController');

const router = express.Router();

// Configurar directorios
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'temp');
const CONVERTED_DIR = path.join(__dirname, '..', '..', 'converted');

// Asegurarse de que los directorios existan
[UPLOAD_DIR, CONVERTED_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        console.log(`Creando directorio: ${dir}`);
        fs.mkdirSync(dir, { recursive: true });
    } else {
        console.log(`Directorio ya existe: ${dir}`);
    }
});

// Configuración de almacenamiento
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        console.log(`Guardando archivo en: ${UPLOAD_DIR}`);
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const safeFilename = file.originalname.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
        const filename = `${uniqueSuffix}-${safeFilename}`;
        console.log(`Guardando archivo como: ${filename}`);
        cb(null, filename);
    }
});

// Configuración de multer
const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 200 * 1024 * 1024, // 200MB
        files: 1
    }
});

// Middleware para manejar errores de multer
const handleMulterError = (err, req, res, next) => {
    if (err) {
        console.error('Error en multer:', err);
        return res.status(400).json({ 
            success: false, 
            message: 'Error al procesar el archivo',
            error: err.message 
        });
    }
    next();
};

// Ruta de conversión
router.post('/', 
    upload.single('file'),
    handleMulterError,
    (req, res, next) => {
        console.log('Archivo recibido:', req.file);
        console.log('Cuerpo de la solicitud:', req.body);
        next();
    },
    convertController.convertFile
);

module.exports = router;
