const mongoose = require('mongoose');

const nodeSchema = new mongoose.Schema({
    nodeId: {
        type: String,
        required: true,
        unique: true
    },
    url: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['online', 'offline', 'maintenance'],
        default: 'online'
    },
    lastSeen: {
        type: Date,
        default: Date.now
    },
    cpu: {
        type: Number,
        min: 0,
        max: 100
    },
    memory: {
        type: Number,
        min: 0,
        max: 100
    },
    stats: [{
        timestamp: Date,
        cpu: Number,
        memory: Number
    }]
}, {
    timestamps: true
});

// Índice para búsquedas frecuentes
nodeSchema.index({ nodeId: 1, status: 1, lastSeen: -1 });

// Método para actualizar el último latido del nodo
nodeSchema.methods.updateHeartbeat = function() {
    this.lastSeen = new Date();
    this.status = 'online';
    return this.save();
};

// Método para marcar el nodo como inactivo
nodeSchema.methods.markInactive = function() {
    this.status = 'offline';
    return this.save();
};

// Método estático para limpiar nodos inactivos
nodeSchema.statics.cleanupInactiveNodes = async function(inactiveMinutes = 30) {
    const cutoff = new Date(Date.now() - inactiveMinutes * 60 * 1000);
    return this.updateMany(
        { lastSeen: { $lt: cutoff }, status: 'online' },
        { $set: { status: 'offline' }}
    );
};

// Middleware para limpiar datos antiguos
nodeSchema.post('save', function(doc) {
    // Mantener solo las últimas 100 entradas de estadísticas
    if (doc.stats.length > 100) {
        doc.stats = doc.stats.slice(-100);
        doc.save();
    }
});

const Node = mongoose.model('Node', nodeSchema);

module.exports = Node;
