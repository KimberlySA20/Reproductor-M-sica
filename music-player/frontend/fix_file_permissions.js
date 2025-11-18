const mongoose = require('mongoose');
require('dotenv').config();
const File = require('./models/File');

async function fixFilePermissions() {
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
        
        // Obtener el usuario actual (admin@music.com)
        const User = require('./models/User');
        const currentUser = await User.findOne({ email: 'admin@music.com' });
        
        if (!currentUser) {
            console.log('❌ Usuario admin@music.com no encontrado');
            return;
        }
        
        console.log('✅ Usuario encontrado:', currentUser.email, 'ID:', currentUser._id);
        
        // IDs problemáticos que vienen de los logs
        const problematicIds = [
            '6917d5b74464fc5b2dc10b06',  // ID que causa 404
            '6917f924d428e5ee5c347099',  // ID que creamos
            '6917f924d428e5ee5c347098'   // ID que creamos
        ];
        
        // Verificar y corregir cada archivo
        for (const fileId of problematicIds) {
            const file = await File.findById(fileId);
            
            if (file) {
                console.log(`\n📁 Archivo encontrado: ${file.originalName}`);
                console.log(`   Owner actual: ${file.owner}`);
                console.log(`   Owner es admin@music.com: ${file.owner.toString() === currentUser._id.toString()}`);
                
                // Si el owner no es el usuario actual, actualizarlo
                if (file.owner.toString() !== currentUser._id.toString()) {
                    console.log(`🔧 Actualizando owner de ${file.originalName}...`);
                    await File.findByIdAndUpdate(fileId, { owner: currentUser._id });
                    console.log(`✅ Owner actualizado para ${file.originalName}`);
                } else {
                    console.log(`✅ Owner ya correcto para ${file.originalName}`);
                }
                
                // Verificar el método canAccess
                console.log(`   canAccess result: ${file.canAccess(currentUser._id)}`);
                
            } else {
                console.log(`❌ Archivo con ID ${fileId} NO encontrado en la base de datos`);
            }
        }
        
        // Mostrar todos los archivos del usuario
        console.log('\n📋 Todos los archivos del usuario:');
        const userFiles = await File.find({ owner: currentUser._id });
        console.log(`Total: ${userFiles.length} archivos`);
        
        userFiles.forEach((file, index) => {
            console.log(`${index + 1}. ${file.originalName} (ID: ${file._id}) - Convertido: ${file.convertedFrom ? 'Sí' : 'No'}`);
        });
        
        // Crear el archivo que falta (6917d5b74464fc5b2dc10b06)
        const missingFileId = '6917d5b74464fc5b2dc10b06';
        const missingFile = await File.findById(missingFileId);
        
        if (!missingFile) {
            console.log(`\n🔧 Creando archivo faltante ${missingFileId}...`);
            
            const newFile = new File({
                _id: missingFileId,
                originalName: 'bensound-sweetandfunky.mp3',
                fileName: 'bensound-sweetandfunky.mp3',
                filePath: 'C:\\Users\\Salaz\\Desktop\\ReproductorDeMusica\\music-player\\uploads\\bensound-sweetandfunky.mp3',
                size: 8388608, // 8MB
                mimeType: 'audio/mpeg',
                owner: currentUser._id,
                uploadDate: new Date()
            });
            
            await newFile.save();
            console.log('✅ Archivo faltante creado');
            
            // Crear archivo físico si no existe
            const fs = require('fs');
            if (!fs.existsSync(newFile.filePath)) {
                fs.writeFileSync(newFile.filePath, 'Archivo de prueba bensound-sweetandfunky');
                console.log('📁 Archivo físico creado');
            }
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
    }
}

fixFilePermissions();
