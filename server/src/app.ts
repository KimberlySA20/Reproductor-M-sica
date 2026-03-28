import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

// Importar rutas
import authRoutes from '@/routes/auth';
import musicRoutes from '@/routes/music';

// Importar middleware
import { errorHandler, notFoundHandler } from '@/middleware/errorHandler';
import { connectDatabase } from '@/config/database';

// Crear aplicación Express
const app = express();

// Conectar a la base de datos
connectDatabase().catch(console.error);

// Middleware de seguridad
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      mediaSrc: ["'self'"],
      connectSrc: ["'self'"],
    },
  },
}));

// Configuración CORS
const corsOptions = {
  origin: function (origin: string | undefined, callback: Function) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3001',
      process.env.FRONTEND_URL,
    ].filter(Boolean);

    // Permitir requests sin origin (como mobile apps o Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token', 'Range'],
  exposedHeaders: ['Content-Range', 'Accept-Ranges'],
};

app.use(cors(corsOptions));

// Middleware de compresión
app.use(compression());

// Middleware de logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting global
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // límite por IP
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Middleware para parsear JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware para manejar rangos (para streaming)
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Accept-Ranges', 'bytes');
  next();
});

// Rutas de salud
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '2.0.0',
  });
});

// Rutas de API
app.use('/api/auth', authRoutes);
app.use('/api/music', musicRoutes);

// Ruta por defecto
app.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Music Streamer API v2.0',
    documentation: '/api/docs',
    health: '/health',
  });
});

// Middleware para rutas no encontradas
app.use(notFoundHandler);

// Middleware de manejo de errores (debe ir al final)
app.use(errorHandler);

export default app;
