const mongoose = require('mongoose');
const File = require('./models/File');
const User = require('./models/User');
require('dotenv').config();

// Conectar a la base de datos
mongoose.connect('mongodb://admin:password123@localhost:27017/musicdb?authSource=admin', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function addTestVideo() {
    try {
        console.log('Buscando usuario de prueba...');
        
        // Buscar un usuario existente
        const user = await User.findOne();
        if (!user) {
            console.log('No se encontró ningún usuario. Creando usuario de prueba...');
            const testUser = new User({
                email: 'test@example.com',
                password: 'password123'
            });
            await testUser.save();
            console.log('Usuario de prueba creado');
            var userId = testUser._id;
        } else {
            console.log('Usuario encontrado:', user.email);
            var userId = user._id;
        }

        // Verificar si ya existe un video de prueba
        const existingVideo = await File.findOne({ mimeType: { $regex: /video/ } });
        if (existingVideo) {
            console.log('Ya existe un video de prueba:', existingVideo.originalName);
            console.log('ID del video:', existingVideo._id);
            console.log('URL de streaming:', `/api/files/stream/${existingVideo._id}`);
            return;
        }

        console.log('Creando video de prueba...');
        
        // Crear un video de prueba usando uno de los archivos .mp4 existentes
        const testVideo = new File({
            originalName: 'test-video.mp4',
            fileName: '2b84fcae801a2961139e68a78f30c992e80a5e0b01f87401d5795f773c6b8cf3.mp4',
            size: 7458269,
            mimeType: 'video/mp4',
            owner: userId,
            uploadDate: new Date(),
            downloadUrl: '/api/files/download/test-video-id'
        });

        await testVideo.save();
        
        // Agregar el video al usuario
        user.files.push(testVideo._id);
        await user.save();

        console.log('Video de prueba creado exitosamente:');
        console.log('- Nombre:', testVideo.originalName);
        console.log('- ID:', testVideo._id);
        console.log('- URL de streaming:', `/api/files/stream/${testVideo._id}`);
        console.log('- Tamaño:', testVideo.size, 'bytes');
        
    } catch (error) {
        console.error('Error al agregar video de prueba:', error);
    } finally {
        mongoose.connection.close();
    }
}

addTestVideo();
