const express = require('express');
require('dotenv').config();
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const multer = require('multer');
const fs = require('fs');
const auth = require('./middleware/auth');
const adminController = require('./controllers/adminController');
const crypto = require('crypto');
const { promisify } = require('util');
const stream = require('stream');
const pipeline = promisify(stream.pipeline);
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
ffmpeg.setFfmpegPath(ffmpegPath);
const si = require('systeminformation');
const axios = require('axios');


const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});
const PORT = process.env.PORT || 3000;

// Middleware
const corsOptions = {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Range', 'Authorization', 'X-Worker-Id', 'X-Worker-Version', 'x-auth-token'],
    exposedHeaders: ['Content-Length', 'Content-Range', 'x-auth-token'],
    credentials: true,
    maxAge: 600 // Tiempo de caché para preflight requests
};

// Aplicar CORS a todas las rutas
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Habilitar preflight para todas las rutas
app.use(express.json());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Almacenamiento de workers
const workers = new Map();

// Sistema de balanceo de carga
const loadBalancer = {
    // Umbral para considerar un nodo saturado (> 80%)
    saturationThreshold: 80,
    
    // Historial de tareas para redistribución
    taskHistory: new Map(),
    
    // Encontrar el mejor worker para una tarea
    findBestWorker: function(taskType = 'streaming') {
        const availableWorkers = Array.from(workers.values())
            .filter(worker => worker.status === 'idle' || worker.status === 'online')
            .filter(worker => (worker.load || 0) < this.saturationThreshold)
            .filter(worker => !worker.capabilities || worker.capabilities.includes(taskType));
        
        if (availableWorkers.length === 0) {
            return null;
        }
        
        // Ordenar por carga (menor carga primero)
        return availableWorkers.sort((a, b) => (a.load || 0) - (b.load || 0))[0];
    },
    
    // Verificar si hay nodos saturados y redistribuir
    checkAndRedistribute: function() {
        const saturatedWorkers = Array.from(workers.values())
            .filter(worker => (worker.load || 0) > this.saturationThreshold);
        
        if (saturatedWorkers.length > 0) {
            console.log(`Detectados ${saturatedWorkers.length} nodos saturados, iniciando redistribución...`);
            
            saturatedWorkers.forEach(worker => {
                this.redistributeTasksFromWorker(worker);
            });
        }
    },
    
    // Redistribuir tareas de un worker saturado
    redistributeTasksFromWorker: async function(saturatedWorker) {
        try {
            // Encontrar workers disponibles
            const availableWorkers = this.findBestWorker();
            
            if (!availableWorkers) {
                console.log('No hay workers disponibles para redistribución');
                return;
            }
            
            // Notificar al worker saturado que redirija nuevas conexiones
            console.log(`Redirigiendo tareas de ${saturatedWorker.workerId} a ${availableWorkers.workerId}`);
            
            // Actualizar estado del worker saturado
            saturatedWorker.status = 'redirecting';
            
        } catch (error) {
            console.error('Error en redistribución de tareas:', error);
        }
    },
    
    // Registrar tarea para seguimiento
    registerTask: function(taskId, workerId, taskType) {
        this.taskHistory.set(taskId, {
            workerId,
            taskType,
            startTime: new Date(),
            status: 'active'
        });
    },
    
    // Completar tarea
    completeTask: function(taskId) {
        const task = this.taskHistory.get(taskId);
        if (task) {
            task.status = 'completed';
            task.endTime = new Date();
            task.duration = task.endTime - task.startTime;
        }
    }
};

// Endpoint para obtener workers disponibles
app.get('/api/workers/available', (req, res) => {
    const bestWorker = loadBalancer.findBestWorker('streaming');
    
    if (bestWorker) {
        res.json(bestWorker);
    } else {
        res.status(404).json({ error: 'No hay workers disponibles' });
    }
});

// Endpoint para encontrar el mejor nodo para una tarea específica
app.get('/api/v1/nodes/best', (req, res) => {
    const { taskType = 'streaming' } = req.query;
    const bestWorker = loadBalancer.findBestWorker(taskType);
    
    if (bestWorker) {
        res.json({
            status: 'success',
            data: {
                node: {
                    id: bestWorker.workerId,
                    url: `http://${bestWorker.host}:${bestWorker.port}`,
                    load: bestWorker.load,
                    capabilities: bestWorker.capabilities
                }
            }
        });
    } else {
        res.status(503).json({
            status: 'error',
            message: 'No hay nodos disponibles para la tarea solicitada'
        });
    }
});

// Ruta de conversión
app.post('/api/convert', async (req, res) => {
    try {
        console.log('Solicitud de conversión recibida');
        // Lógica de conversión aquí
        res.status(200).json({ success: true, message: 'Conversión exitosa' });
    } catch (error) {
        console.error('Error en la conversión:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para registro de workers
app.post('/api/workers/register', (req, res) => {
    const { workerId, port, capabilities, host } = req.body;
    
    if (!workerId || !port) {
        return res.status(400).json({ error: 'workerId y port son requeridos' });
    }
    
    const worker = {
        workerId,
        host: host || req.ip.replace('::ffff:', ''), // Usar host del body o fallback a IP
        port,
        capabilities,
        status: 'idle',
        load: 0,
        lastHeartbeat: new Date()
    };
    
    workers.set(workerId, worker);
    console.log(`Worker registrado: ${workerId} (${worker.host}:${port})`);
    res.json({ status: 'ok', message: 'Worker registrado exitosamente' });
});

// Endpoint para heartbeat de workers
app.post('/api/workers/heartbeat', (req, res) => {
    try {
        const { workerId, status, load, currentTask, capabilities, loadTrend, network, performance } = req.body;
        
        if (!workerId) {
            return res.status(400).json({ error: 'workerId es requerido' });
        }
        
        const worker = workers.get(workerId);
        
        if (!worker) {
            console.log(`Worker no encontrado: ${workerId}. Se requiere registro previo.`);
            return res.status(404).json({ 
                error: 'Worker no registrado',
                reregister: true
            });
        }
        
        // Actualizar estado del worker con métricas extendidas
        worker.status = status || worker.status;
        worker.load = load || 0;
        worker.currentTask = currentTask || null;
        worker.capabilities = capabilities || worker.capabilities;
        worker.lastHeartbeat = new Date();
        
        // Agregar métricas extendidas si están disponibles
        if (loadTrend) worker.loadTrend = loadTrend;
        if (network) worker.network = network;
        if (performance) worker.performance = performance;
        
        console.log(`Heartbeat de ${workerId}: ${worker.status} (${worker.load}%)` + 
                   (currentTask ? ` - Tarea: ${currentTask}` : '') +
                   (loadTrend ? ` - Tendencia: ${loadTrend}` : ''));
        
        // Verificar si el worker está saturado y necesita redistribución
        if (worker.load > loadBalancer.saturationThreshold) {
            console.log(`Worker ${workerId} saturado con ${worker.load}% de carga`);
            loadBalancer.checkAndRedistribute();
        }
        
        res.json({ 
            status: 'ok',
            worker: {
                id: worker.workerId,
                status: worker.status,
                load: worker.load,
                redirecting: worker.status === 'redirecting'
            }
        });
    } catch (error) {
        console.error('Error en el manejo del heartbeat:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            message: error.message 
        });
    }
});

// MongoDB Connection
mongoose.connect('mongodb://admin:password123@localhost:27017/musicdb?authSource=admin', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// Song Schema
const songSchema = new mongoose.Schema({
  title: { type: String, required: true },
  artist: { type: String, required: true },
  filePath: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  duration: { type: Number, required: false }, // Cambiado a Number y hecho opcional
  uploadDate: { type: Date, default: Date.now },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const Song = mongoose.model('Song', songSchema);

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /\.(mp3|m4a|wav|ogg)$/i;
    const mimetype = file.mimetype.startsWith('audio/');
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Solo se permiten archivos de audio (MP3, M4A, WAV, OGG)'));
  }
});

// Configuración de rutas estáticas
app.use(express.static(path.join(__dirname, 'public')));

// Ruta para admin.html
app.get('/admin*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Middleware para rastrear sesiones
app.use(adminController.trackSession);

// Rutas de autenticación (sin autenticación requerida)
app.use('/api/auth', require('./routes/auth'));

// API Routes públicas
app.get('/api/songs', async (req, res) => {
  try {
    const songs = await Song.find().sort({ uploadDate: -1 });
    res.json(songs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Middleware de autenticación para las rutas protegidas
app.use(auth);

// Rutas de administración (protegidas)
app.use('/api/admin', require('./routes/admin'));

// Rutas de archivos (protegidas)
app.use('/api/files', require('./routes/files'));

// Endpoint de Monitoreo Agregado Mejorado
app.get('/api/monitoring', async (req, res) => {
  try {
    // 1. Obtener métricas del nodo frontend (master)
    const frontendCpu = await si.currentLoad();
    const frontendMem = await si.mem();
    const networkStats = await si.networkStats();

    const frontendStats = {
      nodeId: 'frontend-master',
      type: 'frontend',
      cpu: {
        currentLoad: frontendCpu.currentLoad.toFixed(2),
      },
      memory: {
        used: frontendMem.used,
        total: frontendMem.total,
        percent: ((frontendMem.used / frontendMem.total) * 100).toFixed(2)
      },
      network: {
        rx: networkStats[0]?.rx_bytes || 0,
        tx: networkStats[0]?.tx_bytes || 0
      },
      status: 'online',
      load: {
        current: frontendCpu.currentLoad,
        trend: 'stable'
      }
    };

    // 2. Obtener métricas de todos los workers registrados
    const workerStatsPromises = Array.from(workers.values()).map(async (worker) => {
      try {
        const response = await axios.get(`http://${worker.host}:${worker.port}/api/v1/node/stats`, { timeout: 1000 });
        return {
            nodeId: worker.workerId,
            type: 'worker',
            host: worker.host,
            port: worker.port,
            status: worker.status,
            ...response.data.data,
            load: {
              current: worker.load || 0,
              trend: worker.loadTrend || 'stable'
            },
            redirecting: worker.status === 'redirecting'
        };
      } catch (error) {
        console.error(`Error al contactar al worker ${worker.workerId}: ${error.message}`);
        // Si el worker no responde, marcarlo como offline
        return {
          nodeId: worker.workerId,
          type: 'worker',
          status: 'offline',
          error: error.message,
          load: { current: 0, trend: 'unknown' }
        };
      }
    });

    const workerStats = await Promise.all(workerStatsPromises);

    // 3. Calcular estadísticas agregadas del sistema
    const allNodes = [frontendStats, ...workerStats];
    const onlineNodes = allNodes.filter(node => node.status === 'online');
    const saturatedNodes = allNodes.filter(node => node.load?.current > loadBalancer.saturationThreshold);
    
    const avgCpu = onlineNodes.length > 0 ? 
      onlineNodes.reduce((sum, node) => sum + parseFloat(node.cpu?.currentLoad || 0), 0) / onlineNodes.length : 0;
    
    const avgMemory = onlineNodes.length > 0 ?
      onlineNodes.reduce((sum, node) => sum + parseFloat(node.memory?.percent || 0), 0) / onlineNodes.length : 0;

    // 3. Obtener sesiones activas
    let activeSessions = adminController.getActiveSessions();
    
    // Agregar sesión de prueba para demostración (temporal)
    if (activeSessions.length === 0) {
      activeSessions = [{
        id: 'demo-session',
        userId: 'admin',
        ip: '127.0.0.1',
        startTime: new Date(Date.now() - 60000),
        lastActivity: new Date(),
        isActive: true
      }];
    }

    // 4. Combinar todos los datos
    const fullSystemStats = {
      frontend: frontendStats,
      workers: workerStats,
      sessions: activeSessions,
      summary: {
        totalNodes: allNodes.length,
        onlineNodes: onlineNodes.length,
        saturatedNodes: saturatedNodes.length,
        avgCpu: avgCpu.toFixed(2),
        avgMemory: avgMemory.toFixed(2),
        systemLoad: saturatedNodes.length > 0 ? 'high' : avgCpu > 70 ? 'medium' : 'low'
      },
      lastUpdated: new Date().toISOString()
    };

    res.json(fullSystemStats);

  } catch (error) {
    console.error('Error al generar las estadísticas del sistema:', error);
    res.status(500).json({ error: 'Error interno del servidor al recolectar estadísticas.' });
  }
});

// Ruta para subir canciones (protegida)
// Función para obtener la duración de un archivo de audio
function getAudioDuration(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        console.error('Error al obtener metadatos del audio:', err);
        // Si hay un error, devolvemos 0 como duración por defecto
        return resolve(0);
      }
      resolve(metadata.format.duration || 0);
    });
  });
}

// Ruta para eliminar una canción (protegida)
app.delete('/api/songs/:id', auth, async (req, res) => {
  try {
    const song = await Song.findByIdAndDelete(req.params.id);
    
    if (!song) {
      return res.status(404).json({ message: 'Canción no encontrada' });
    }
    
    // Eliminar el archivo físico
    const filePath = path.join(__dirname, 'public', song.filePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    res.json({ message: 'Canción eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar la canción:', error);
    res.status(500).json({ message: 'Error al eliminar la canción', error: error.message });
  }
});

// Ruta para obtener información de una canción (protegida)
app.get('/api/songs/:id', auth, async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) {
      return res.status(404).json({ message: 'Canción no encontrada' });
    }
    
    // Asegurarse de que solo el propietario pueda ver la canción
    if (song.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    
    res.json(song);
  } catch (error) {
    console.error('Error al obtener la canción:', error);
    res.status(500).json({ message: 'Error al obtener la canción', error: error.message });
  }
});

// Ruta para descargar una canción (protegida)
app.get('/api/songs/download/:id', auth, async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) {
      return res.status(404).json({ message: 'Canción no encontrada' });
    }
    
    // Asegurarse de que solo el propietario pueda descargar la canción
    if (song.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    
    const filePath = path.join(__dirname, 'public', song.filePath);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Archivo no encontrado' });
    }
    
    // Enviar el archivo para descarga
    res.download(filePath, path.basename(song.filePath));
  } catch (error) {
    console.error('Error al descargar la canción:', error);
    res.status(500).json({ message: 'Error al descargar la canción', error: error.message });
  }
});

// Ruta para subir canciones (protegida)
app.post('/api/songs/upload', auth, upload.single('song'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'No se ha subido ningún archivo' 
      });
    }

    let duration = 0;
    try {
      duration = await getAudioDuration(req.file.path);
      duration = Math.round(duration);
    } catch (err) {
      console.warn('No se pudo obtener la duración del audio, usando 0 por defecto:', err.message);
    }

    const newSong = new Song({
      title: req.body.title,
      artist: req.body.artist,
      filePath: '/uploads/' + req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      duration: duration,
      uploadDate: new Date(),
      uploadedBy: req.user.id
    });

    const savedSong = await newSong.save();
    
    // Emitir evento de socket para notificar a los clientes
    io.emit('song_uploaded', savedSong);
    
    res.status(201).json({
      success: true,
      data: savedSong
    });
  } catch (err) {
    console.error('Error al guardar la canción:', err);
    res.status(500).json({ 
      success: false,
      message: 'Error al guardar la canción',
      error: err.message 
    });
  }
});

app.post('/api/songs', upload.single('song'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a file' });
    }

    const newSong = new Song({
      title: req.body.title || path.parse(req.file.originalname).name,
      artist: req.body.artist || 'Unknown',
      filePath: `/uploads/${req.file.filename}`,
      duration: 0 // You might want to extract duration from the audio file
    });

    const savedSong = await newSong.save();
    res.status(201).json(savedSong);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Serve the frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar el servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Worker escuchando en http://localhost:${PORT}`);
});