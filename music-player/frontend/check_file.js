const mongoose = require('mongoose');
require('dotenv').config();

// Importar el modelo File
const File = require('./models/File');

async function checkFile() {
    const fileId = '6917f924d428e5ee5c347099';
    
    try {
        console.log('Conectando a MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/musicdb', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        console.log('✅ Conectado a MongoDB');
        console.log('Buscando archivo con ID:', fileId);
        
        // Buscar el archivo
        const file = await File.findById(fileId);
        
        if (file) {
            console.log('✅ Archivo encontrado:');
            console.log('- ID:', file._id);
            console.log('- Nombre:', file.originalName);
            console.log('- Propietario:', file.owner);
            console.log('- Convertido desde:', file.convertedFrom);
            console.log('- Ruta:', file.filePath);
            console.log('- MIME Type:', file.mimeType);
            console.log('- Fecha de subida:', file.uploadDate);
        } else {
            console.log('❌ Archivo NO encontrado con ID:', fileId);
            
            // Buscar todos los archivos para comparar
            console.log('\n📋 Buscando todos los archivos...');
            const allFiles = await File.find({});
            console.log('Total de archivos en BD:', allFiles.length);
            
            if (allFiles.length > 0) {
                // Mostrar los últimos 5 archivos
                const recentFiles = await File.find({}).sort({ uploadDate: -1 }).limit(5);
                console.log('\nÚltimos 5 archivos:');
                recentFiles.forEach((f, i) => {
                    console.log(`${i+1}. ID: ${f._id}, Nombre: ${f.originalName}, Convertido: ${f.convertedFrom ? 'Sí' : 'No'}`);
                });
                
                // Buscar archivos convertidos
                const convertedFiles = await File.find({ 'convertedFrom': { $exists: true, $ne: null } });
                console.log('\nArchivos convertidos:', convertedFiles.length);
                convertedFiles.forEach((f, i) => {
                    console.log(`${i+1}. ID: ${f._id}, Nombre: ${f.originalName}, Desde: ${f.convertedFrom?.originalName || 'N/A'}`);
                });
            }
        }
        
        // Verificar si el ID tiene formato válido
        if (fileId.length !== 24) {
            console.log('\n⚠️ El ID no tiene 24 caracteres (formato MongoDB)');
        } else {
            console.log('\n✅ El ID tiene el formato correcto (24 caracteres)');
        }
        
    } catch (error) {
        console.error('Error al verificar archivo:', error.message);
        
        if (error.message.includes('Authentication')) {
            console.log('\n💡 Solución: MongoDB requiere autenticación');
            console.log('Verifica que el servidor frontend esté corriendo y conectado a MongoDB');
        }
    } finally {
        await mongoose.connection.close();
        console.log('\nConexión cerrada');
    }
}

checkFile();
