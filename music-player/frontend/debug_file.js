const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const File = require('./models/File');

const app = express();

// Middleware para parsear JSON
app.use(express.json());

// Endpoint para verificar archivo
app.get('/debug/file/:id', async (req, res) => {
    const fileId = req.params.id;
    
    try {
        console.log('Buscando archivo con ID:', fileId);
        
        // Buscar el archivo
        const file = await File.findById(fileId);
        
        if (file) {
            console.log('✅ Archivo encontrado:', file.originalName);
            res.json({
                found: true,
                file: {
                    id: file._id,
                    originalName: file.originalName,
                    owner: file.owner,
                    convertedFrom: file.convertedFrom,
                    filePath: file.filePath,
                    mimeType: file.mimeType,
                    uploadDate: file.uploadDate
                }
            });
        } else {
            console.log('❌ Archivo NO encontrado');
            
            // Buscar todos los archivos
            const allFiles = await File.find({});
            console.log('Total de archivos:', allFiles.length);
            
            res.json({
                found: false,
                totalFiles: allFiles.length,
                recentFiles: await File.find({}).sort({ uploadDate: -1 }).limit(5),
                convertedFiles: await File.find({ 'convertedFrom': { $exists: true, $ne: null } })
            });
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Iniciar servidor en puerto diferente
const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Servidor de depuración corriendo en http://localhost:${PORT}`);
    console.log(`Verifica el archivo en: http://localhost:${PORT}/debug/file/6917f924d428e5ee5c347099`);
});
