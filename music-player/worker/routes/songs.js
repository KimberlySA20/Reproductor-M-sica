// worker/routes/songs.js
const express = require('express');
const router = express.Router();
const songController = require('../controllers/songController');
const { authenticate } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Configuración de Multer para subir archivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../../uploads');
        require('fs').mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de archivo no soportado. Solo se permiten archivos de audio.'));
        }
    }
});

// Ruta para subir una nueva canción
router.post('/', 
    authenticate, 
    upload.single('audio'), 
    songController.uploadSong
);

// Ruta para obtener todas las canciones
router.get('/', songController.getSongs);

// Ruta para obtener una canción por ID
router.get('/:id', songController.getSongById);

// Ruta para eliminar una canción
router.delete('/:id', 
    authenticate, 
    songController.deleteSong
);

module.exports = router;
