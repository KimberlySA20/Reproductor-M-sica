const mongoose = require('mongoose');

// Conexión a MongoDB
mongoose.connect('mongodb://admin:password123@localhost:27017/musicdb?authSource=admin', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('✅ Conectado a MongoDB');
  
  // Limpiar índices problemáticos
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  
  for (const collection of collections) {
    if (collection.name === 'users') {
      console.log('🧹 Limpiando índices de la colección users...');
      await db.collection('users').dropIndexes();
      console.log('✅ Índices eliminados');
      break;
    }
  }
  
  // Importar el modelo User
  const User = require('./models/User');
  
  try {
    // Contar usuarios existentes
    const userCount = await User.countDocuments();
    console.log(`📊 Total de usuarios en la base de datos: ${userCount}`);
    
    // Mostrar todos los usuarios (sin contraseñas)
    const users = await User.find().select('-password');
    console.log('👥 Usuarios registrados:');
    users.forEach(user => {
      console.log(`  - Email: ${user.email}, ID: ${user._id}, Creado: ${user.createdAt}`);
    });
    
    // Probar crear un usuario de prueba
    console.log('\n🧪 Probando crear usuario de prueba...');
    const testUser = new User({
      email: 'test@example.com',
      password: '123456'
    });
    
    await testUser.save();
    console.log('✅ Usuario de prueba creado exitosamente');
    
    // Probar login
    console.log('\n🔐 Probando login...');
    const foundUser = await User.findOne({ email: 'test@example.com' });
    if (foundUser) {
      const isMatch = await foundUser.comparePassword('123456');
      console.log(`¿Contraseña correcta?: ${isMatch}`);
    } else {
      console.log('❌ Usuario no encontrado');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
  
}).catch(err => {
  console.error('❌ Error de conexión a MongoDB:', err.message);
  console.error('\n🔍 Posibles causas:');
  console.error('1. MongoDB no está corriendo');
  console.error('2. Las credenciales son incorrectas');
  console.error('3. La base de datos musicdb no existe');
  console.error('4. El usuario admin no tiene permisos');
  
  process.exit(1);
});
