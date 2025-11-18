const mongoose = require('mongoose');
require('dotenv').config();
const File = require('./models/File');

async function checkFiles() {
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
        
        // Buscar todos los archivos
        const allFiles = await File.find({});
        console.log(`\n📋 Total de archivos en BD: ${allFiles.length}`);
        
        console.log('\n📁 Lista de archivos:');
        allFiles.forEach((file, index) => {
            console.log(`${index + 1}. ID: ${file._id}`);
            console.log(`   Nombre: ${file.originalName}`);
            console.log(`   Owner: ${file.owner}`);
            console.log(`   Path: ${file.filePath}`);
            console.log(`   Size: ${file.size}`);
            console.log(`   Converted: ${file.convertedFrom ? 'Sí' : 'No'}`);
            console.log('');
        });
        
        // Verificar archivo específico
        const targetId = '6917f924d428e5ee5c347099';
        const targetFile = await File.findById(targetId);
        
        console.log(`\n🔍 Buscando archivo ${targetId}:`);
        if (targetFile) {
            console.log('✅ Archivo encontrado:');
            console.log(`   Nombre: ${targetFile.originalName}`);
            console.log(`   Path: ${targetFile.filePath}`);
            console.log(`   Owner: ${targetFile.owner}`);
        } else {
            console.log('❌ Archivo no encontrado');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
    }
}

checkFiles();
