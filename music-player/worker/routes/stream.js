const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const Song = require('../model/Song');

// Stream de una canción
router.get('/:id', async (req, res) => {
    try {
        const song = await Song.findById(req.params.id);
        if (!song) {
            return res.status(404).json({ message: 'Canción no encontrada' });
        }

        const filePath = path.join(__dirname, '../..', song.filePath);
        
        // Verificar si el archivo existe
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'Archivo de audio no encontrado' });
        }

        const stat = fs.statSync(filePath);
        const fileSize = stat.size;
        const range = req.headers.range;

        if (range) {
            // Manejar solicitud de rango (para streaming)
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunkSize = (end - start) + 1;
            const file = fs.createReadStream(filePath, { start, end });
            
            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunkSize,
                'Content-Type': 'audio/mpeg',
            };

            res.writeHead(206, head);
            file.pipe(res);
        } else {
            // Si no se especifica rango, enviar todo el archivo
            const head = {
                'Content-Length': fileSize,
                'Content-Type': 'audio/mpeg',
            };

            res.writeHead(200, head);
            fs.createReadStream(filePath).pipe(res);
        }
    } catch (error) {
        console.error('Error al transmitir canción:', error);
        res.status(500).json({ message: 'Error al transmitir canción' });
    }
});

module.exports = router;
