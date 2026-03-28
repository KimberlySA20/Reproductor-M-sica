import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Validar que las variables requeridas existan
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.warn('⚠️  Missing environment variables:', missingEnvVars.join(', '));
  console.log('💡 Using default values for development');
}

// Configuración de la aplicación
export const config = {
  // Servidor
  PORT: parseInt(process.env.PORT || '3001'),
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Base de datos
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/music-streamer',
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'tu_clave_secreta_muy_segura',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  
  // CORS
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  
  // Archivos
  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '100000000'), // 100MB
  
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutos
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'),
  
  // Workers
  WORKER_PORTS: (process.env.WORKER_PORTS || '3002,3003,3004').split(',').map(Number),
  
  // Streaming
  STREAM_CHUNK_SIZE: parseInt(process.env.STREAM_CHUNK_SIZE || '1024'), // 1KB chunks
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  
  // Redis (para futuras implementaciones)
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
};

// Exportar variables de entorno para compatibilidad
export default config;
