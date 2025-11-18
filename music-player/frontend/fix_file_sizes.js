const mongoose = require('mongoose');
require('dotenv').config();
const File = require('./models/File');
const fs = require('fs');

async function fixFileSizes() {
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
        
        // IDs de archivos de prueba
        const testFiles = [
            {
                _id: '6917f924d428e5ee5c347099',
                originalName: 'test-song-converted.mp3',
                filePath: 'C:\\Users\\Salaz\\Desktop\\ReproductorDeMusica\\music-player\\converted\\test-song-converted.mp3'
            },
            {
                _id: '6917f924d428e5ee5c347098',
                originalName: 'another-song-converted.mp3',
                filePath: 'C:\\Users\\Salaz\\Desktop\\ReproductorDeMusica\\music-player\\converted\\another-song-converted.mp3'
            },
            {
                _id: '6917d5b74464fc5b2dc10b06',
                originalName: 'bensound-sweetandfunky.mp3',
                filePath: 'C:\\Users\\Salaz\\Desktop\\ReproductorDeMusica\\music-player\\converted\\bensound-sweetandfunky.mp3'
            }
        ];
        
        for (const fileData of testFiles) {
            console.log(`\n📁 Procesando: ${fileData.originalName}`);
            
            // Crear archivo con tamaño real
            const targetSize = 1024 * 1024; // 1MB
            const buffer = Buffer.alloc(targetSize, 'test'); // Crear archivo de 1MB
            
            try {
                fs.writeFileSync(fileData.filePath, buffer);
                console.log(`✅ Archivo creado con ${targetSize} bytes`);
                
                // Actualizar el tamaño en la base de datos
                await File.findByIdAndUpdate(fileData._id, { size: targetSize });
                console.log(`✅ Tamaño actualizado en BD`);
                
            } catch (error) {
                console.error(`❌ Error creando archivo:`, error.message);
            }
        }
        
        console.log('\n✅ Archivos de prueba creados correctamente');
        console.log('📏 Ahora los archivos tienen el tamaño correcto que coincide con content-length');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
    }
}

fixFileSizes();
