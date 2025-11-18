const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const auth = require('../middleware/auth');

// Middleware para verificar si el usuario es administrador
const isAdmin = (req, res, next) => {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ error: 'Acceso denegado. Se requieren privilegios de administrador.' });
    }
    next();
};

// Ruta para obtener nodos activos
router.get('/nodes', auth, isAdmin, (req, res) => {
    adminController.getNodes(req, res);
});

// Ruta para obtener sesiones activas
router.get('/sessions', auth, isAdmin, (req, res) => {
    adminController.getSessions(req, res);
});

// Ruta para obtener estadísticas del sistema
router.get('/stats', auth, isAdmin, (req, res) => {
    adminController.getStats(req, res);
});

// Ruta para registrar un nodo (usada por los workers)
router.post('/nodes/register', auth, isAdmin, (req, res) => {
    const { nodeId, nodeUrl } = req.body;
    if (!nodeId || !nodeUrl) {
        return res.status(400).json({ error: 'Se requieren nodeId y nodeUrl' });
    }
    
    const node = adminController.registerNode(nodeId, nodeUrl);
    res.json(node);
});

// Ruta para actualizar el latido de un nodo
router.post('/nodes/:nodeId/heartbeat', auth, (req, res) => {
    const { nodeId } = req.params;
    adminController.updateNodeHeartbeat(nodeId);
    res.json({ status: 'ok' });
});

module.exports = router;
