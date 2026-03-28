import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import app from './app';
import { disconnectDatabase } from './config/database';

// Configuración del servidor
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Crear servidor HTTP
const server = createServer(app);

// Configurar Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Manejo de conexiones Socket.IO
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // Unirse a room personal del usuario
  socket.on('join-user-room', (userId) => {
    socket.join(`user-${userId}`);
    console.log(`👤 User ${userId} joined room`);
  });

  // Eventos de streaming
  socket.on('play-track', (data) => {
    socket.to(`user-${data.userId}`).emit('track-playing', data);
  });

  socket.on('pause-track', (data) => {
    socket.to(`user-${data.userId}`).emit('track-paused', data);
  });

  socket.on('seek-track', (data) => {
    socket.to(`user-${data.userId}`).emit('track-seeked', data);
  });

  // Eventos de conversión
  socket.on('conversion-progress', (data) => {
    socket.to(`user-${data.userId}`).emit('conversion-update', data);
  });

  // Manejo de desconexión
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });

  // Manejo de errores
  socket.on('error', (error) => {
    console.error(`❌ Socket error for ${socket.id}:`, error);
  });
});

// Iniciar servidor
server.listen(PORT, () => {
  console.log(`🚀 Music Streamer Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${NODE_ENV}`);
  console.log(`📡 Socket.IO server ready`);
});

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Manejo de terminación graceful
const gracefulShutdown = async (signal: string) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  
  // Cerrar servidor HTTP
  server.close(async () => {
    console.log('✅ HTTP server closed');
    
    // Cerrar conexiones Socket.IO
    io.close(() => {
      console.log('✅ Socket.IO server closed');
    });
    
    // Desconectar base de datos
    try {
      await disconnectDatabase();
      console.log('✅ Database disconnected');
    } catch (error) {
      console.error('❌ Error disconnecting database:', error);
    }
    
    console.log('👋 Graceful shutdown completed');
    process.exit(0);
  });
  
  // Forzar cierre después de 10 segundos
  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Escuchar señales de terminación
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Exportar para testing
export { server, io };
