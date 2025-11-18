const Node = require('../models/Node');
const Session = require('../models/Session');
const os = require('os');

// Almacenar nodos activos
const activeNodes = new Map();
const activeSessions = new Map();

// Registrar un nodo
const registerNode = async (nodeId, nodeUrl) => {
    const nodeInfo = {
        id: nodeId,
        url: nodeUrl,
        status: 'online',
        lastSeen: new Date(),
        cpu: 0,
        memory: 0,
        stats: []
    };

    // Actualizar o crear el nodo
    activeNodes.set(nodeId, nodeInfo);
    
    // Actualizar estadísticas del sistema
    updateSystemStats();
    
    return nodeInfo;
};

// Actualizar latido del nodo
const updateNodeHeartbeat = (nodeId) => {
    const node = activeNodes.get(nodeId);
    if (node) {
        node.lastSeen = new Date();
        node.status = 'online';
    }
};

// Registrar una sesión de usuario
const registerSession = (sessionId, userId, ip) => {
    activeSessions.set(sessionId, {
        id: sessionId,
        userId,
        ip,
        startTime: new Date(),
        lastActivity: new Date(),
        isActive: true
    });
    
    return activeSessions.get(sessionId);
};

// Actualizar actividad de sesión
const updateSessionActivity = (sessionId) => {
    const session = activeSessions.get(sessionId);
    if (session) {
        session.lastActivity = new Date();
        session.isActive = true;
    }
    return session;
};

// Cerrar sesión
const logoutSession = (sessionId) => {
    const session = activeSessions.get(sessionId);
    if (session) {
        session.isActive = false;
        session.endTime = new Date();
    }
    return session;
};

// Obtener nodos activos
const getActiveNodes = () => {
    // Marcar nodos inactivos
    const now = new Date();
    activeNodes.forEach((node, nodeId) => {
        const minutesSinceLastSeen = (now - node.lastSeen) / (1000 * 60);
        if (minutesSinceLastSeen > 2) { // 2 minutos de inactividad
            node.status = 'offline';
        }
    });
    
    return Array.from(activeNodes.values());
};

// Obtener sesiones activas
const getActiveSessions = () => {
    const now = new Date();
    const active = [];
    
    activeSessions.forEach(session => {
        const minutesInactive = (now - new Date(session.lastActivity)) / (1000 * 60);
        session.isActive = minutesInactive < 30; // 30 minutos de inactividad
        
        if (session.isActive) {
            active.push(session);
        }
    });
    
    return active;
};

// Obtener estadísticas del sistema
const getSystemStats = () => {
    // Calcular estadísticas de CPU y memoria
    const totalCpu = os.cpus().reduce((acc, cpu) => {
        const total = Object.values(cpu.times).reduce((sum, time) => sum + time, 0);
        const used = total - cpu.times.idle;
        return acc + (used / total) * 100;
    }, 0);
    
    const avgCpu = (totalCpu / os.cpus().length).toFixed(2);
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = ((totalMemory - freeMemory) / totalMemory * 100).toFixed(2);
    
    return {
        cpu: parseFloat(avgCpu),
        memory: parseFloat(usedMemory),
        totalMemory: (totalMemory / (1024 * 1024 * 1024)).toFixed(2) + ' GB',
        freeMemory: (freeMemory / (1024 * 1024 * 1024)).toFixed(2) + ' GB',
        platform: os.platform(),
        uptime: (os.uptime() / 3600).toFixed(2) + ' horas',
        loadAvg: os.loadavg().map(load => load.toFixed(2)).join(', ')
    };
};

// Actualizar estadísticas del sistema periódicamente
let systemStats = getSystemStats();
const updateSystemStats = () => {
    systemStats = getSystemStats();
    
    // Actualizar estadísticas en cada nodo
    activeNodes.forEach(node => {
        // Simular variación en las estadísticas del nodo
        node.cpu = Math.min(100, Math.max(0, systemStats.cpu + (Math.random() * 10 - 5))).toFixed(2);
        node.memory = Math.min(100, Math.max(0, systemStats.memory + (Math.random() * 5 - 2.5))).toFixed(2);
        
        // Mantener un historial de estadísticas
        node.stats.push({
            timestamp: new Date(),
            cpu: node.cpu,
            memory: node.memory
        });
        
        // Mantener solo las últimas 100 entradas
        if (node.stats.length > 100) {
            node.stats.shift();
        }
    });
};

// Iniciar la actualización periódica de estadísticas
setInterval(updateSystemStats, 5000);

// Controladores de la API
const getNodes = (req, res) => {
    try {
        const nodes = Array.from(activeNodes.values());
        res.json(nodes);
    } catch (error) {
        console.error('Error al obtener nodos:', error);
        res.status(500).json({ error: 'Error al obtener nodos' });
    }
};

const getSessions = (req, res) => {
    try {
        const sessions = Array.from(activeSessions.values())
            .filter(session => session.isActive);
        res.json(sessions);
    } catch (error) {
        console.error('Error al obtener sesiones:', error);
        res.status(500).json({ error: 'Error al obtener sesiones' });
    }
};

const getStats = (req, res) => {
    try {
        const nodes = getActiveNodes();
        const sessions = getActiveSessions();
        const stats = getSystemStats();
        
        // Calcular promedios
        const nodeCount = nodes.length;
        const activeNodeCount = nodes.filter(n => n.status === 'online').length;
        const sessionCount = sessions.length;
        const avgCpu = nodes.reduce((sum, node) => sum + (parseFloat(node.cpu) || 0), 0) / (nodeCount || 1);
        const avgMemory = nodes.reduce((sum, node) => sum + (parseFloat(node.memory) || 0), 0) / (nodeCount || 1);
        
        res.json({
            nodeCount,
            activeNodeCount,
            sessionCount,
            avgCpu: parseFloat(avgCpu.toFixed(2)),
            avgMemory: parseFloat(avgMemory.toFixed(2)),
            ...stats,
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
};

// Middleware para rastrear actividad de sesión
const trackSession = (req, res, next) => {
    const sessionId = req.headers['x-session-id'] || req.cookies?.sessionId;
    const userId = req.user?.id || 'anonymous';
    const ip = req.ip || req.connection.remoteAddress;
    
    if (sessionId) {
        if (!activeSessions.has(sessionId)) {
            registerSession(sessionId, userId, ip);
        } else {
            updateSessionActivity(sessionId);
        }
    }
    
    next();
};

// Exportar funciones para uso en otros módulos
module.exports = {
    // Funciones internas
    registerNode,
    updateNodeHeartbeat,
    registerSession,
    updateSessionActivity,
    logoutSession,
    getActiveNodes,
    getActiveSessions,
    getSystemStats,
    
    // Controladores de la API
    getNodes,
    getSessions,
    getStats,
    trackSession
};
