const mongoose = require('mongoose');

// Conectar a MongoDB
mongoose.connect('mongodb://admin:password123@localhost:27017/musicdb?authSource=admin', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Definir el esquema de canciones
const songSchema = new mongoose.Schema({
    title: String,
    artist: String,
    filePath: String,
    duration: Number,
    uploadDate: Date
});

const Song = mongoose.model('Song', songSchema);

// Función para eliminar canciones
async function deleteSampleSongs() {
    try {
        // Eliminar las canciones de ejemplo
        const result = await Song.deleteMany({
            $or: [
                { title: "Canción de Ejemplo 1" },
                { title: "Canción de Ejemplo 2" },
                { title: "Canción de Ejemplo 3" }
            ]
        });
        
        console.log(`${result.deletedCount} canciones eliminadas correctamente.`);
        
        // Mostrar las canciones restantes
        const remainingSongs = await Song.find();
        console.log("Canciones restantes en la base de datos:", remainingSongs);
        
        process.exit(0);
    } catch (error) {
        console.error("Error al eliminar canciones:", error);
        process.exit(1);
    }
}

// Ejecutar la función
deleteSampleSongs();