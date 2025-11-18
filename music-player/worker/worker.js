// Importar librerías
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const os = require('os');
const ffmpeg = require('fluent-ffmpeg');
const si = require('systeminformation');
const ffmpegPath = require('ffmpeg-static');
const authRoutes = require('./routes/auth');
const mediaRoutes = require('./routes/media');
const songRoutes = require('./routes/songs');
const streamRoutes = require('./routes/stream');
const convertRoutes = require('./routes/convert');

// Estadísticas del nodo
const nodeStats = {
    cpu: 0,
    memory: 0,
    activeConnections: 0,
    streams: {},
    lastUpdate: new Date(),
    nodeId: process.env.NODE_ID || `node-${uuidv4()}`,
    startTime: new Date(),
    totalRequests: 0,
    totalErrors: 0,
    network: {
        bytesRead: 0,
        bytesWritten: 0,
        packetsIn: 0,
        packetsOut: 0
    },
    load: {
        current: 0,
        average: [0, 0, 0, 0, 0], // Últimos 5 intervalos
        trend: 'stable' // 'increasing', 'decreasing', 'stable'
    },
    performance: {
        avgResponseTime: 0,
        requestCount: 0,
        errorRate: 0
    }
};

// Función para calcular el uso de CPU
async function getCpuUsage() {
    try {
        const cpuData = await si.currentLoad();
        return Math.round(cpuData.currentLoad * 100) / 100;
    } catch (error) {
        console.error('Error al obtener uso de CPU:', error);
        return 0;
    }
}

// Función para calcular el uso de memoria
function getMemoryUsage() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    return Math.round((usedMemory / totalMemory) * 100);
}

// Calcular carga total del nodo (0-100)
function calculateNodeLoad() {
    // Ponderación de factores: CPU (40%), Memoria (30%), Conexiones (20%), Red (10%)
    const cpuWeight = 0.4;
    const memWeight = 0.3;
    const connWeight = 0.2;
    const netWeight = 0.1;
    
    const cpuLoad = nodeStats.cpu;
    const memLoad = nodeStats.memory;
    const connLoad = (nodeStats.activeConnections / MAX_CONCURRENT_STREAMS) * 100;
    const netLoad = Math.min((nodeStats.network.bytesRead + nodeStats.network.bytesWritten) / 10485760, 100); // 10MB = 100%
    
    const totalLoad = (cpuLoad * cpuWeight) + (memLoad * memWeight) + (connLoad * connWeight) + (netLoad * netWeight);
    
    // Actualizar tendencia de carga
    nodeStats.load.average.shift();
    nodeStats.load.average.push(totalLoad);
    
    const avg = nodeStats.load.average.reduce((a, b) => a + b, 0) / nodeStats.load.average.length;
    if (totalLoad > avg + 10) {
        nodeStats.load.trend = 'increasing';
    } else if (totalLoad < avg - 10) {
        nodeStats.load.trend = 'decreasing';
    } else {
        nodeStats.load.trend = 'stable';
    }
    
    nodeStats.load.current = totalLoad;
    return totalLoad;
}

// Actualizar estadísticas del nodo
async function updateNodeStats() {
    try {
        nodeStats.cpu = await getCpuUsage();
        nodeStats.memory = getMemoryUsage();
        nodeStats.lastUpdate = new Date();
        
        // Calcular carga total y guardarla en nodeStats
        const totalLoad = calculateNodeLoad();
        nodeStats.load.current = totalLoad;
        
        // Calcular tasa de error
        nodeStats.performance.errorRate = nodeStats.totalRequests > 0 ? 
            (nodeStats.totalErrors / nodeStats.totalRequests) * 100 : 0;
        
        // Enviar estadísticas actualizadas al nodo maestro
        if (process.env.MASTER_NODE_URL) {
            await axios.post(`${process.env.MASTER_NODE_URL}/api/v1/nodes/stats`, {
                nodeId: nodeStats.nodeId,
                cpu: nodeStats.cpu,
                memory: nodeStats.memory,
                load: totalLoad,
                loadTrend: nodeStats.load.trend,
                activeConnections: nodeStats.activeConnections,
                network: nodeStats.network,
                performance: nodeStats.performance,
                timestamp: new Date()
            }).catch(err => {
                console.error('Error al enviar estadísticas al nodo maestro:', err.message);
            });
        }
        
        // Enviar estadísticas actualizadas al panel de administración
        if (process.env.ADMIN_NODE_URL) {
            await axios.post(`${process.env.ADMIN_NODE_URL}/api/v1/nodes/stats`, {
                nodeId: nodeStats.nodeId,
                cpu: nodeStats.cpu,
                memory: nodeStats.memory,
                load: totalLoad,
                loadTrend: nodeStats.load.trend,
                activeConnections: nodeStats.activeConnections,
                network: nodeStats.network,
                performance: nodeStats.performance,
                timestamp: new Date()
            }).catch(err => {
                console.error('Error al enviar estadísticas al panel de administración:', err.message);
            });
        }
    } catch (error) {
        console.error('Error al actualizar estadísticas del nodo:', error);
    }
}

// Iniciar el monitoreo de recursos
setInterval(updateNodeStats, 5000); // Actualizar cada 5 segundos

// Configurar ruta de ffmpeg
ffmpeg.setFfmpegPath(ffmpegPath);


// Configuración
const PORT = process.env.PORT || 3002;
const MASTER_NODE_URL = process.env.MASTER_NODE_URL || 'http://127.0.0.1:3000';
const NODE_ID = nodeStats.nodeId; // Usar el ID del nodo de las estadísticas
const HEARTBEAT_INTERVAL = 10000; // 10 segundos entre latidos
const CONVERTED_DIR = path.join(__dirname, '..', 'converted');
const MAX_CONCURRENT_STREAMS = process.env.MAX_CONCURRENT_STREAMS || 50; // Límite de transmisiones simultáneas

// Inicializar aplicación Express
const app = express();
const server = http.createServer(app);

// Middleware para rastrear conexiones activas
app.use((req, res, next) => {
    nodeStats.activeConnections++;
    nodeStats.totalRequests++;
    nodeStats.performance.requestCount++;
    
    const startHrTime = process.hrtime();
    const contentLength = parseInt(req.headers['content-length'] || '0');
    
    // Track network metrics
    nodeStats.network.packetsIn++;
    nodeStats.network.bytesRead += contentLength;
    
    res.on('finish', () => {
        nodeStats.activeConnections--;
        
        // Registrar métricas de rendimiento
        const elapsedHrTime = process.hrtime(startHrTime);
        const elapsedTimeInMs = elapsedHrTime[0] * 1000 + elapsedHrTime[1] / 1e6;
        
        // Actualizar tiempo de respuesta promedio
        const responseLength = res.get('content-length') || '0';
        nodeStats.network.bytesWritten += parseInt(responseLength);
        nodeStats.network.packetsOut++;
        
        // Actualizar tiempo de respuesta promedio (media móvil)
        nodeStats.performance.avgResponseTime = 
            (nodeStats.performance.avgResponseTime * 0.9) + (elapsedTimeInMs * 0.1);
        
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${elapsedTimeInMs.toFixed(2)}ms - Load: ${nodeStats.load.current.toFixed(1)}%`);
    });
    
    res.on('error', () => {
        nodeStats.totalErrors++;
    });
    
    next();
});

// Forzar a usar IPv4 para evitar problemas con ::1 (IPv6)

const HOST = process.env.HOST || 'localhost';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Configuración CORS y manejo de JSON
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Range, Authorization');
    res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Configuración de body parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/songs', songRoutes);
app.use('/api/stream', streamRoutes);
app.use('/api/convert', convertRoutes);

// Configuración de Socket.IO
const io = socketIo(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Middleware
app.use(express.json());
app.use(express.static('public'));



// Importar modelos
const { Song } = require('./model');

// Estado del worker
const workerState = {
    id: NODE_ID,
    status: 'idle', // 'idle', 'converting', 'streaming', 'error'
    currentTask: null,
    load: 0, // 0-100 representando la carga actual
    lastHeartbeat: new Date(),
    capabilities: ['audio_streaming', 'audio_conversion']
};

// Seguimiento de streams activos
const activeStreams = new Map();

// Registrar worker con el nodo maestro y el panel de administración
async function registerWithMaster(retryCount = 0) {
    const maxRetries = 5;
    const retryDelay = 5000; // 5 segundos

    try {
        console.log(`[${new Date().toISOString()}] Intentando registrar con el nodo maestro en ${MASTER_NODE_URL}... (Intento ${retryCount + 1}/${maxRetries})`);
        
        const response = await axios.post(
            `${MASTER_NODE_URL}/api/workers/register`,
            {
                workerId: NODE_ID,
                port: PORT,
                host: HOST,
                secret: process.env.WORKER_SECRET || 'af94b2a8aed4a9ab163fe5128a5db7f666d4d242035ed1e5f4b9902c4aba5e3f', // Añade esta línea
                status: 'online',
                capabilities: ['audio_streaming', 'audio_conversion']
            },
            {
                timeout: 10000, // 10 segundos de timeout
                headers: {
                    'Content-Type': 'application/json',
                    'X-Worker-Secret': process.env.WORKER_SECRET || 'af94b2a8aed4a9ab163fe5128a5db7f666d4d242035ed1e5f4b9902c4aba5e3f' // Añade esta línea
                }
            }
        );

        console.log('✅ Registrado exitosamente con el nodo maestro');
        console.log('Respuesta del servidor:', response.data);
        isRegistered = true;
        // Iniciar el primer heartbeat inmediatamente después del registro
        sendHeartbeat();
        return true;
    } catch (error) {
        console.error('❌ Error al registrar con el nodo maestro:');
        if (error.response) {
            console.error('Código de estado:', error.response.status);
            console.error('Datos de respuesta:', error.response.data);
        } else if (error.request) {
            console.error('No se recibió respuesta del servidor');
        } else {
            console.error('Error en la configuración de la solicitud:', error.message);
        }

        if (retryCount < maxRetries - 1) {
            console.log(`Reintentando en ${retryDelay/1000} segundos...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            return registerWithMaster(retryCount + 1);
        } else {
            console.error('Se agotaron los intentos de registro con el nodo maestro');
            return false;
        }
    }
}

// Enviar latido al nodo maestro
let isRegistered = false;

async function sendHeartbeat() {
    if (!isRegistered) return;

    try {
        // Actualizar estado del worker
        workerState.lastHeartbeat = new Date();
        workerState.load = nodeStats.load.current;
        
        // Enviar latido al nodo maestro
        const response = await axios.post(
            `${MASTER_NODE_URL}/api/workers/heartbeat`,
            {
                workerId: NODE_ID,
                status: workerState.status,
                load: workerState.load,
                loadTrend: nodeStats.load.trend,
                currentTask: workerState.currentTask,
                capabilities: workerState.capabilities
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Worker-Id': NODE_ID
                },
                timeout: 3000 // 3 segundos de timeout
            }
        );
        
        // Si el estado era 'starting', cambiarlo a 'idle' después del primer latido exitoso
        if (workerState.status === 'starting') {
            workerState.status = 'idle';
            console.log('Worker listo y en espera de tareas');
        }
        
        // Verificar si el servidor solicita re-registro
        if (response.data && response.data.reregister) {
            console.log('El nodo maestro solicitó re-registro, volviendo a registrar...');
            await registerWithMaster();
        }
    } catch (error) {
        console.error('Error al enviar latido:', error.message);
        
        // Manejar errores específicos
        if (error.response) {
            // El servidor respondió con un código de estado fuera del rango 2xx
            console.error('Latido fallido con estado:', error.response.status);
            
            // Si el worker no está registrado (404), intentar registrarse de nuevo
            if (error.response.status === 404) {
                console.log('Worker no registrado o sesión expirada, intentando re-registrar...');
                await registerWithMaster();
            }
        } else if (error.request) {
            // La solicitud fue hecha pero no se recibió respuesta
            console.error('No se recibió respuesta del nodo maestro. ¿Está en ejecución?');
        } else {
            // Algo más falló al configurar la solicitud
            console.error('Error al configurar la solicitud de latido:', error.message);
        }
    } finally {
        // Programar el próximo latido
        setTimeout(sendHeartbeat, HEARTBEAT_INTERVAL);
    }
}

// Calcular carga actual del worker
function calculateCurrentLoad() {
    // En una aplicación real, esto consideraría CPU, memoria y streams activos
    const baseLoad = activeStreams.size * 10; // 10% por stream
    return Math.min(baseLoad, 90); // Límite del 90%
}

// Función para convertir audio a formato estándar
async function convertAudio(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        console.log(`Iniciando conversión de ${inputPath} a ${outputPath}`);
        
        ffmpeg(inputPath)
            .audioCodec('libmp3lame')  // Usar codec MP3
            .audioBitrate(192)         // 192 kbps de calidad
            .audioChannels(2)          // Estéreo
            .audioFrequency(44100)     // 44.1kHz, calidad CD
            .format('mp3')             // Formato de salida
            .on('progress', (progress) => {
                console.log(`Progreso de conversión: ${Math.round(progress.percent || 0)}%`);
            })
            .on('end', () => {
                console.log('Conversión completada con éxito');
                resolve(outputPath);
            })
            .on('error', (err) => {
                console.error('Error en la conversión:', err);
                reject(err);
            })
            .save(outputPath);
    });
}

// Ruta para verificar el estado del nodo
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        nodeId: nodeStats.nodeId,
        uptime: process.uptime(),
        timestamp: new Date(),
        load: {
            cpu: nodeStats.cpu,
            memory: nodeStats.memory,
            activeConnections: nodeStats.activeConnections
        }
    });
});

// Ruta para obtener estadísticas del nodo
app.get('/api/v1/node/stats', (req, res) => {
    res.status(200).json({
        status: 'success',
        data: {
            ...nodeStats,
            cpu: {
                currentLoad: nodeStats.cpu
            },
            memory: {
                percent: nodeStats.memory
            },
            load: {
                current: nodeStats.load.current,
                trend: nodeStats.load.trend || 'stable'
            },
            network: {
                rx: nodeStats.network.bytesRead,
                tx: nodeStats.network.bytesWritten
            },
            uptime: process.uptime(),
            totalMemory: os.totalmem(),
            freeMemory: os.freemem(),
            platform: process.platform,
            arch: process.arch,
            nodeVersion: process.version,
            pid: process.pid
        }
    });
});

// Ruta para streaming de audio
app.get('/stream/:songId', async (req, res) => {
    // Verificar si el nodo puede manejar más conexiones
    if (nodeStats.activeConnections >= MAX_CONCURRENT_STREAMS) {
        // Redirigir a otro nodo si es posible
        try {
            const response = await axios.get(`${MASTER_NODE_URL}/api/v1/nodes/best`);
            if (response.data.data.node && response.data.data.node.url !== `http://localhost:${PORT}`) {
                return res.redirect(`${response.data.data.node.url}/stream/${req.params.songId}`);
            }
        } catch (err) {
            console.error('Error al redirigir a otro nodo:', err.message);
        }
        
        return res.status(503).json({
            status: 'error',
            message: 'Servidor sobrecargado, intente de nuevo más tarde'
        });
    }
    
    try {
        const { songId } = req.params;
        nodeStats.streams[songId] = (nodeStats.streams[songId] || 0) + 1;
        const range = req.headers.range;
        
        if (!range) {
            return res.status(400).send('Se requiere encabezado Range');
        }
        
        // Buscar la canción en la base de datos
        const song = await Song.findById(songId);
        if (!song) {
            console.error('Canción no encontrada en la base de datos');
            return res.status(404).json({ error: 'Canción no encontrada' });
        }
        
        // Construir rutas de archivos
        const inputPath = path.join(__dirname, '..', song.filePath);
        
        // Crear directorio de conversión si no existe
        if (!fs.existsSync(CONVERTED_DIR)) {
            fs.mkdirSync(CONVERTED_DIR, { recursive: true });
        }
        
        const outputPath = path.join(CONVERTED_DIR, `${songId}.mp3`);
        
        // Verificar si el archivo de origen existe
        if (!fs.existsSync(inputPath)) {
            console.error(`Archivo de audio no encontrado: ${inputPath}`);
            return res.status(404).json({ error: 'Archivo de audio no encontrado' });
        }
        
        // Convertir el archivo si no existe la versión convertida
        if (!fs.existsSync(outputPath)) {
            try {
                workerState.status = 'converting';
                workerState.currentTask = `Convirtiendo ${song.title} a MP3`;
                await convertAudio(inputPath, outputPath);
            } catch (error) {
                console.error('Error al convertir el audio:', error);
                workerState.status = 'error';
                workerState.currentTask = 'Error en conversión de audio';
                return res.status(500).json({ error: 'Error al procesar el audio' });
            }
        }
        
        // Obtener información del archivo convertido
        const audioSize = fs.statSync(outputPath).size;
        
        // Parsear el rango solicitado
        const CHUNK_SIZE = 10 ** 6; // 1MB
        const start = Number(range.replace(/\D/g, ""));
        const end = Math.min(start + CHUNK_SIZE, audioSize - 1);
        
        // Encabezados de respuesta
        const contentLength = end - start + 1;
        const headers = {
            'Content-Range': `bytes ${start}-${end}/${audioSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': contentLength,
            'Content-Type': 'audio/mp3',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        };
        
        console.log(`Sirviendo canción: ${song.title} (${start}-${end}/${audioSize})`);
        
        // Enviar la respuesta con el chunk de audio
        res.writeHead(206, headers);
        
        const audioStream = fs.createReadStream(outputPath, { start, end });
        
        // Actualizar el estado del worker
        workerState.status = 'streaming';
        workerState.currentTask = `Transmitiendo ${song.title}`;
        
        // Manejar eventos del stream
        audioStream.on('open', () => {
            audioStream.pipe(res);
        });
        
        audioStream.on('end', () => {
            workerState.status = 'idle';
            workerState.currentTask = null;
            console.log(`Transmisión finalizada: ${song.title}`);
        });
        
        audioStream.on('error', (error) => {
            console.error('Error en transmisión de audio:', error);
            workerState.status = 'error';
            workerState.currentTask = `Error transmitiendo ${song.title}`;
            if (!res.headersSent) {
                res.status(500).json({ error: 'Error al transmitir el audio' });
            }
        });
        
        // Manejar cierre de conexión
        res.on('close', () => {
            audioStream.destroy();
            workerState.status = 'idle';
            workerState.currentTask = null;
        });
        
    } catch (error) {
        console.error('Error en el endpoint de streaming:', error);
        workerState.status = 'error';
        workerState.currentTask = 'Error en el servidor';
        
        if (!res.headersSent) {
            res.status(500).json({ 
                error: 'Error interno del servidor',
                message: error.message 
            });
        }
    }
});

// Endpoint de salud
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        workerId: NODE_ID,
        status: workerState.status,
        load: workerState.load,
        currentTask: workerState.currentTask,
        lastHeartbeat: workerState.lastHeartbeat,
        activeStreams: activeStreams.size
    });
});

// Función para transmitir audio a un cliente
function streamAudio(socket, streamId, song, startTime = 0) {
    try {
        const audioPath = path.join(__dirname, '..', song.filePath);
        
        if (!fs.existsSync(audioPath)) {
            throw new Error('Archivo de audio no encontrado');
        }
        
        const stat = fs.statSync(audioPath);
        const fileSize = stat.size;
        
        // Configurar el stream de audio
        const stream = fs.createReadStream(audioPath, { 
            start: startTime,
            end: fileSize - 1 
        });
        
        // Manejar datos del stream
        stream.on('data', (chunk) => {
            socket.emit('audio-data', { 
                streamId,
                chunk: chunk.toString('base64') 
            });
        });
        
        // Manejar finalización del stream
        stream.on('end', () => {
            socket.emit('audio-end', { streamId });
            activeStreams.delete(streamId);
            updateWorkerState();
        });
        
        // Manejar errores del stream
        stream.on('error', (error) => {
            console.error('Error en el stream de audio:', error);
            socket.emit('audio-error', { 
                streamId, 
                error: 'Error en el stream de audio' 
            });
            activeStreams.delete(streamId);
            updateWorkerState();
        });
        
        // Almacenar referencia al stream
        activeStreams.set(streamId, {
            stream,
            songId: song._id,
            startTime: new Date()
        });
        
        // Actualizar estado del worker
        updateWorkerState();
        
    } catch (error) {
        console.error('Error al iniciar el stream de audio:', error);
        socket.emit('audio-error', { 
            streamId, 
            error: 'No se pudo iniciar el stream de audio' 
        });
    }
}

// Actualizar estado del worker
function updateWorkerState() {
    workerState.load = calculateCurrentLoad();
    workerState.activeStreams = activeStreams.size;
    
    if (activeStreams.size === 0 && workerState.status !== 'converting') {
        workerState.status = 'idle';
        workerState.currentTask = null;
    }
}

// Manejar conexiones de Socket.IO
io.on('connection', (socket) => {
    console.log('Cliente conectado:', socket.id);
    
    // Manejar solicitud de stream
    socket.on('start-stream', async ({ songId, startTime = 0 }) => {
        try {
            const song = await Song.findById(songId);
            if (!song) {
                throw new Error('Canción no encontrada');
            }
            
            const streamId = `stream-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            // Iniciar el stream de audio
            streamAudio(socket, streamId, song, startTime);
            
            // Confirmar al cliente que el stream ha comenzado
            socket.emit('stream-started', { 
                streamId,
                song: {
                    id: song._id,
                    title: song.title,
                    artist: song.artist,
                    duration: song.duration
                }
            });
            
        } catch (error) {
            console.error('Error al iniciar el stream:', error);
            socket.emit('stream-error', { 
                error: 'No se pudo iniciar el stream',
                message: error.message 
            });
        }
    });
    
    // Manejar pausa del stream
    socket.on('pause-stream', ({ streamId }) => {
        const streamInfo = activeStreams.get(streamId);
        if (streamInfo) {
            // Pausar el stream (en una implementación real, podrías querer pausar el stream real)
            socket.emit('stream-paused', { streamId });
        }
    });
    
    // Manejar reanudación del stream
    socket.on('resume-stream', ({ streamId, position }) => {
        // En una implementación real, podrías querer reanudar el stream desde la posición dada
        socket.emit('stream-resumed', { streamId, position });
    });
    
    // Manejar detención del stream
    socket.on('stop-stream', ({ streamId }) => {
        const streamInfo = activeStreams.get(streamId);
        if (streamInfo) {
            // Detener el stream
            if (streamInfo.stream) {
                streamInfo.stream.destroy();
            }
            activeStreams.delete(streamId);
            updateWorkerState();
            socket.emit('stream-stopped', { streamId });
        }
    });
    
    // Manejar desconexión del cliente
    socket.on('disconnect', () => {
        console.log('Cliente desconectado:', socket.id);
        // Limpiar cualquier stream activo de este cliente
        activeStreams.forEach((streamInfo, streamId) => {
            if (streamInfo && streamInfo.stream) {
                streamInfo.stream.destroy();
            }
            activeStreams.delete(streamId);
        });
        updateWorkerState();
    });
});

// Iniciar el worker
async function startWorker() {
    try {
        // Asegurar que exista el directorio converted
        if (!fs.existsSync(CONVERTED_DIR)) {
            fs.mkdirSync(CONVERTED_DIR, { recursive: true });
            console.log(`Directorio 'converted' creado en: ${CONVERTED_DIR}`);
        }

        // Cerrar cualquier conexión existente primero
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
            await new Promise(resolve => setTimeout(resolve, 1000)); // Pequeña pausa
        }

        // Conectar a MongoDB
        const mongoUri = process.env.MONGODB_URI || 'mongodb://admin:password123@localhost:27017/musicdb?authSource=admin';
        console.log(`Conectando a MongoDB en: ${mongoUri.split('@')[1] || mongoUri}`);
        
        try {
            await mongoose.connect(mongoUri, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 5000,
                connectTimeoutMS: 10000
            });
            console.log('✅ Worker conectado a MongoDB');
        } catch (dbError) {
            console.error('❌ Error al conectar a MongoDB:', dbError.message);
            throw dbError;
        }

        // Iniciar servidor HTTP
        return new Promise((resolve, reject) => {
            const httpServer = server.listen(PORT, HOST, async () => {
                console.log(`🚀 Worker ${NODE_ID} escuchando en: http://${HOST}:${PORT}`);
                console.log(`🎵 Endpoint de streaming: http://${HOST}:${PORT}/stream/:songId`);
                
                try {
                    console.log('🔄 Registrando con el nodo maestro...');
                    await registerWithMaster();
                    console.log('✅ Registrado exitosamente con el nodo maestro');
                    resolve(httpServer);
                } catch (err) {
                    console.error('❌ Error al registrar con el nodo maestro:', err.message);
                    reject(err);
                }
            });

            // Manejar errores del servidor
            httpServer.on('error', (error) => {
                console.error('❌ Error en el servidor:', error.message);
                if (error.code === 'EADDRINUSE') {
                    console.error(`El puerto ${PORT} está en uso. Por favor, detén cualquier otro proceso que lo use o usa un puerto diferente.`);
                }
                reject(error);
            });
        });
    } catch (error) {
        console.error('Error al iniciar el worker:', error);
        process.exit(1);
    }
}

// Función para notificar al nodo maestro que este nodo se está apagando
async function notifyShutdown() {
    try {
        if (process.env.MASTER_NODE_URL) {
            await axios.post(`${process.env.MASTER_NODE_URL}/api/v1/nodes/unregister`, {
                nodeId: nodeStats.nodeId,
                reason: 'shutdown',
                timestamp: new Date()
            });
        }
    } catch (err) {
        console.error('Error al notificar el apagado al nodo maestro:', err.message);
    }
}

// Manejar cierre del proceso
async function gracefulShutdown() {
    console.log('Apagando worker...');
    
    // Cerrar conexiones limpiamente
    try {
        // Detener todos los streams activos
        if (activeStreams && activeStreams.size > 0) {
            activeStreams.forEach((streamInfo) => {
                if (streamInfo && streamInfo.stream) {
                    streamInfo.stream.destroy();
                }
            });
            console.log(`Se cerraron ${activeStreams.size} streams activos`);
            activeStreams.clear();
        }
        
        // Cerrar conexión a MongoDB si está abierta
        if (mongoose.connection && mongoose.connection.readyState === 1) { // 1 = connected
            await mongoose.connection.close();
            console.log('Conexión a MongoDB cerrada');
        }
        
        // Cerrar servidor HTTP
        if (server) {
            server.close(() => {
                console.log('Servidor HTTP cerrado');
                process.exit(0);
            });
            
            // Forzar cierre después de 5 segundos si no se cierra limpiamente
            setTimeout(() => {
                console.warn('Forzando cierre del servidor...');
                process.exit(1);
            }, 5000);
        } else {
            process.exit(0);
        }
    } catch (error) {
        console.error('Error durante el apagado:', error);
        process.exit(1);
    }
}

// Manejadores de señales de terminación
process.on('SIGINT', async () => {
    console.log('\n🛑 Recibida señal de apagado (SIGINT)...');
    await notifyShutdown();
    await gracefulShutdown();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Recibida señal de terminación (SIGTERM)...');
    await notifyShutdown();
    await gracefulShutdown();
    process.exit(0);
});

process.on('SIGUSR2', async () => { // Para nodemon
    console.log('\n🔄 Reinicio del servidor...');
    await notifyShutdown();
    await gracefulShutdown();
    process.exit(0);
});

// Manejar errores no capturados
process.on('uncaughtException', (error) => {
    console.error('Error no capturado:', error);
    gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Promesa rechazada no manejada en:', promise, 'Razón:', reason);
    // No es necesario hacer nada aquí, ya que el manejador de 'uncaughtException' lo manejará
});

// Middleware de manejo de errores
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({ 
        error: 'Algo salió mal!',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Error interno del servidor'
    });
});

// Iniciar el worker
async function main() {
    try {
        const httpServer = await startWorker();
        
        // Manejar cierre limpio
        const shutdown = async () => {
            console.log('\n🛑 Recibida señal de apagado...');
            await gracefulShutdown();
            process.exit(0);
        };
        
        // Manejadores de señales
        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
        
        // Manejar errores inesperados
        process.on('uncaughtException', (err) => {
            console.error('Error no manejado:', err);
            gracefulShutdown().finally(() => process.exit(1));
        });
        
        process.on('unhandledRejection', (reason, promise) => {
            console.error('Promesa rechazada no manejada en:', promise, 'Razón:', reason);
        });
        
    } catch (error) {
        console.error('❌ Error fatal al iniciar el worker:', error);
        await gracefulShutdown();
        process.exit(1);
    }
}

// Agrega al final del archivo worker.js
process.on('SIGINT', () => {
  console.log('\n🛑 Recibida señal de apagado...');
  // No cerrar el proceso inmediatamente
  // process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Recibida señal de terminación...');
  // No cerrar el proceso inmediatamente
  // process.exit(0);
});


// Iniciar la aplicación
main();
