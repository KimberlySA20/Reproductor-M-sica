const mongoose = require('mongoose');
require('dotenv').config();
const File = require('./models/File');
const fs = require('fs');

async function createTestFiles() {
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
        
        // ID del usuario actual
        const currentUserId = '6919368c6d5d29b4746be448';
        
        // Archivos de prueba que necesitamos
        const testFiles = [
            {
                _id: '6917f924d428e5ee5c347099',
                originalName: 'test-song-converted.mp3',
                fileName: 'test-song-converted.mp3',
                filePath: 'C:\\Users\\Salaz\\Desktop\\ReproductorDeMusica\\music-player\\converted\\test-song-converted.mp3',
                size: 1048576,
                mimeType: 'audio/mpeg',
                owner: currentUserId,
                convertedFrom: {
                    originalName: 'test-song.wav',
                    originalFormat: 'wav',
                    conversionSettings: {
                        format: 'mp3',
                        quality: '320kbps',
                        bitrate: 320000
                    }
                },
                uploadDate: new Date()
            },
            {
                _id: '6917d5b74464fc5b2dc10b06',
                originalName: 'bensound-sweetandfunky.mp3',
                fileName: 'bensound-sweetandfunky.mp3',
                filePath: 'C:\\Users\\Salaz\\Desktop\\ReproductorDeMusica\\music-player\\converted\\bensound-sweetandfunky.mp3',
                size: 1048576,
                mimeType: 'audio/mpeg',
                owner: currentUserId,
                convertedFrom: {
                    originalName: 'bensound-sweetandfunky.wav',
                    originalFormat: 'wav',
                    conversionSettings: {
                        format: 'mp3',
                        quality: '320kbps',
                        bitrate: 320000
                    }
                },
                uploadDate: new Date()
            }
        ];
        
        // Crear archivos físicos y registros en BD
        for (const fileData of testFiles) {
            console.log(`\n📁 Creando: ${fileData.originalName}`);
            
            // Verificar si ya existe
            const existingFile = await File.findById(fileData._id);
            if (existingFile) {
                console.log('⚠️  El archivo ya existe en BD, actualizando...');
                await File.findByIdAndUpdate(fileData._id, fileData);
            } else {
                // Crear nuevo registro
                const newFile = new File(fileData);
                await newFile.save();
                console.log('✅ Registro creado en BD');
            }
            
            // Crear archivo físico si no existe
            if (!fs.existsSync(fileData.filePath)) {
                // Crear directorio si no existe
                const dir = fileData.filePath.substring(0, fileData.filePath.lastIndexOf('\\'));
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                
                // Crear archivo con tamaño correcto
                const buffer = Buffer.alloc(fileData.size, 'test');
                fs.writeFileSync(fileData.filePath, buffer);
                console.log('✅ Archivo físico creado');
            } else {
                console.log('✅ Archivo físico ya existe');
            }
        }
        
        console.log('\n✅ Archivos de prueba creados correctamente');
        console.log('📋 Ahora puedes intentar descargar los archivos:');
        console.log('   - test-song-converted.mp3 (ID: 6917f924d428e5ee5c347099)');
        console.log('   - bensound-sweetandfunky.mp3 (ID: 6917d5b74464fc5b2dc10b06)');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
    }
}

createTestFiles();
