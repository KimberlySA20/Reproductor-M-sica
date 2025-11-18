const mongoose = require('mongoose');
require('dotenv').config();
const File = require('./models/File');

async function addTestFiles() {
    try {
        // Conectar a MongoDB usando las mismas credenciales que el worker
        const mongoUri = process.env.MONGODB_URI || 'mongodb://admin:password123@localhost:27017/musicdb?authSource=admin';
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 10000
        });
        
        console.log('✅ Conectado a MongoDB');
        
        // IDs que queremos agregar (deben ser ObjectId válidos de 24 caracteres hexadecimales)
        const testFiles = [
            {
                _id: '6917f924d428e5ee5c347099',
                originalName: 'test-song-converted.mp3',
                fileName: 'converted_6917f924d428e5ee5c347099.mp3',
                filePath: 'C:\\Users\\Salaz\\Desktop\\ReproductorDeMusica\\music-player\\converted\\test-song-converted.mp3',
                size: 5242880, // 5MB
                mimeType: 'audio/mpeg',
                owner: new mongoose.Types.ObjectId(), // Necesitarás un ID de usuario real
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
                _id: '6917f924d428e5ee5c347098',
                originalName: 'another-song-converted.mp3',
                fileName: 'converted_6917f924d428e5ee5c347098.mp3',
                filePath: 'C:\\Users\\Salaz\\Desktop\\ReproductorDeMusica\\music-player\\converted\\another-song-converted.mp3',
                size: 4194304, // 4MB
                mimeType: 'audio/mpeg',
                owner: new mongoose.Types.ObjectId(),
                convertedFrom: {
                    originalName: 'another-song.flac',
                    originalFormat: 'flac',
                    conversionSettings: {
                        format: 'mp3',
                        quality: '256kbps',
                        bitrate: 256000
                    }
                },
                uploadDate: new Date()
            }
        ];
        
        // Primero, buscar un usuario existente para usar como owner
        const User = require('./models/User');
        const existingUser = await User.findOne();
        
        if (!existingUser) {
            console.log('❌ No se encontró ningún usuario. Primero crea un usuario en la aplicación.');
            return;
        }
        
        console.log('✅ Usuario encontrado:', existingUser.email);
        
        // Asignar el owner real a los archivos de prueba
        testFiles.forEach(file => {
            file.owner = existingUser._id;
        });
        
        // Crear los archivos
        for (const fileData of testFiles) {
            try {
                // Verificar si ya existe
                const existingFile = await File.findById(fileData._id);
                if (existingFile) {
                    console.log(`⚠️ El archivo con ID ${fileData._id} ya existe. Actualizando...`);
                    await File.findByIdAndUpdate(fileData._id, fileData);
                    console.log(`✅ Archivo ${fileData._id} actualizado`);
                } else {
                    const file = new File(fileData);
                    await file.save();
                    console.log(`✅ Archivo creado: ${fileData.originalName} (ID: ${fileData._id})`);
                }
            } catch (error) {
                if (error.code === 11000) {
                    console.log(`⚠️ El archivo con ID ${fileData._id} ya existe (duplicado)`);
                } else {
                    console.error(`❌ Error creando archivo ${fileData._id}:`, error.message);
                }
            }
        }
        
        // Crear archivos físicos de prueba si no existen
        const fs = require('fs');
        testFiles.forEach(fileData => {
            if (!fs.existsSync(fileData.filePath)) {
                console.log(`📁 Creando archivo físico de prueba: ${fileData.filePath}`);
                // Crear un archivo vacío como placeholder
                fs.writeFileSync(fileData.filePath, 'Archivo de prueba para conversión');
            } else {
                console.log(`📁 El archivo físico ya existe: ${fileData.filePath}`);
            }
        });
        
        console.log('\n✅ Proceso completado. Ahora puedes intentar descargar los archivos.');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
    }
}

addTestFiles();
