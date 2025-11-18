const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Conectar a MongoDB
mongoose.connect('mongodb://admin:password123@localhost:27017/musicdb?authSource=admin', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Definir el esquema de canciones
const songSchema = new mongoose.Schema({
    title: { type: String, required: true },
    artist: { type: String, required: true },
    filePath: { type: String, required: true },
    duration: { type: Number, required: true },
    uploadDate: { type: Date, default: Date.now }
});

const Song = mongoose.model('Song', songSchema);

// Datos de ejemplo
const sampleSongs = [
    {
        title: "Canción de Ejemplo 1",
        artist: "Artista 1",
        filePath: "frontend/public/uploads/ejemplo1.wav",
        duration: 180
    },
    {
        title: "Canción de Ejemplo 2",
        artist: "Artista 2",
        filePath: "frontend/public/uploads/ejemplo2.wav",
        duration: 210
    },
    {
        title: "Canción de Ejemplo 3",
        artist: "Artista 3",
        filePath: "frontend/public/uploads/ejemplo3.wav",
        duration: 210
    }
];

// Función para insertar canciones
async function insertSongs() {
    try {
        // Eliminar canciones existentes (opcional)
        await Song.deleteMany({});
        
        // Insertar nuevas canciones
        const result = await Song.insertMany(sampleSongs);
        console.log(`${result.length} canciones insertadas correctamente.`);
        
        // Mostrar las canciones insertadas
        const songs = await Song.find();
        console.log("Canciones en la base de datos:", songs);
        
        process.exit(0);
    } catch (error) {
        console.error("Error al insertar canciones:", error);
        process.exit(1);
    }
}

// Ejecutar la función
insertSongs();