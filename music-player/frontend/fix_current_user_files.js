const mongoose = require('mongoose');
require('dotenv').config();
const File = require('./models/File');

async function fixCurrentUserFiles() {
    try {
        // Conectar a MongoDB
        const mongoUri = process.env.MONGODB_URI || 'mongodb://admin:password123@localhost:27017/musicdb?authSource=admin';
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 10000
        });
        
        console.log('✅ Conectado a MongoDB');
        
        // ID del usuario actual que viene del token
        const currentUserId = '6919368c6d5d29b4746be448';
        
        // Verificar si este usuario existe
        const User = require('./models/User');
        const currentUser = await User.findById(currentUserId);
        
        if (!currentUser) {
            console.log('❌ Usuario con ID del token no encontrado');
            console.log('Buscando todos los usuarios...');
            const allUsers = await User.find({});
            console.log('Usuarios encontrados:');
            allUsers.forEach(user => {
                console.log(`- ${user.email} (ID: ${user._id})`);
            });
            return;
        }
        
        console.log('✅ Usuario actual encontrado:', currentUser.email);
        
        // Actualizar todos los archivos para que pertenezcan al usuario actual
        const result = await File.updateMany(
            {}, // Todos los archivos
            { owner: currentUserId } // Setear el owner al usuario actual
        );
        
        console.log(`✅ Actualizados ${result.modifiedCount} archivos para pertenecer a ${currentUser.email}`);
        
        // Verificar la actualización
        const updatedFiles = await File.find({ owner: currentUserId });
        console.log(`📋 Archivos del usuario actual: ${updatedFiles.length}`);
        
        updatedFiles.forEach((file, index) => {
            console.log(`${index + 1}. ${file.originalName} (ID: ${file._id})`);
        });
        
        // Probar el método canAccess
        const testFile = await File.findById('6917f924d428e5ee5c347099');
        if (testFile) {
            console.log(`\n🧪 Probando canAccess para ${testFile.originalName}:`);
            console.log(`- Resultado: ${testFile.canAccess(currentUserId)}`);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
    }
}

fixCurrentUserFiles();
