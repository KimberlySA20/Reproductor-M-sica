// worker/controllers/songController.js
const Song = require('../model/Song');
const fs = require('fs');
const path = require('path');

// Subir una nueva canción
exports.uploadSong = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No se ha subido ningún archivo de audio' });
        }

        const { title, artist, album, genre } = req.body;
        
        const song = new Song({
            title,
            artist,
            album,
            genre,
            filePath: `/uploads/${req.file.filename}`,
            uploadedBy: req.user.id
        });

        await song.save();
        res.status(201).json({ message: 'Canción subida exitosamente', song });
    } catch (error) {
        console.error('Error al subir canción:', error);
        res.status(500).json({ message: 'Error al subir canción', error: error.message });
    }
};

// Obtener todas las canciones
exports.getSongs = async (req, res) => {
    try {
        const songs = await Song.find().populate('uploadedBy', 'username');
        res.json(songs);
    } catch (error) {
        console.error('Error al obtener canciones:', error);
        res.status(500).json({ message: 'Error al obtener canciones' });
    }
};

// Obtener una canción por ID
exports.getSongById = async (req, res) => {
    try {
        const song = await Song.findById(req.params.id).populate('uploadedBy', 'username');
        if (!song) {
            return res.status(404).json({ message: 'Canción no encontrada' });
        }
        res.json(song);
    } catch (error) {
        console.error('Error al obtener canción:', error);
        res.status(500).json({ message: 'Error al obtener canción' });
    }
};

// Eliminar una canción
exports.deleteSong = async (req, res) => {
    try {
        const song = await Song.findById(req.params.id);
        if (!song) {
            return res.status(404).json({ message: 'Canción no encontrada' });
        }

        // Verificar que el usuario sea el propietario
        if (song.uploadedBy.toString() !== req.user.id) {
            return res.status(401).json({ message: 'No autorizado' });
        }

        // Eliminar archivo físico
        const filePath = path.join(__dirname, '../..', song.filePath);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Eliminar de la base de datos
        await song.deleteOne();

        res.json({ message: 'Canción eliminada exitosamente' });
    } catch (error) {
        console.error('Error al eliminar canción:', error);
        res.status(500).json({ message: 'Error al eliminar canción' });
    }
};
