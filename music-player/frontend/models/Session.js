const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    ip: {
        type: String,
        required: true
    },
    userAgent: String,
    startTime: {
        type: Date,
        default: Date.now
    },
    lastActivity: {
        type: Date,
        default: Date.now
    },
    endTime: Date,
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    expiresAt: {
        type: Date,
        default: () => new Date(+new Date() + 24 * 60 * 60 * 1000), // 24 horas por defecto
        index: { expires: 0 } // Usamos TTL index manejado manualmente
    },
    data: mongoose.Schema.Types.Mixed
}, {
    timestamps: true
});

// Índice para búsquedas frecuentes
sessionSchema.index({ userId: 1, isActive: 1, lastActivity: -1 });

// Método para actualizar la última actividad
sessionSchema.methods.updateActivity = function() {
    this.lastActivity = new Date();
    this.isActive = true;
    return this.save();
};

// Método para cerrar la sesión
sessionSchema.methods.endSession = function() {
    this.isActive = false;
    this.endTime = new Date();
    return this.save();
};

// Método estático para limpiar sesiones expiradas
sessionSchema.statics.cleanupExpiredSessions = async function() {
    return this.deleteMany({
        $or: [
            { expiresAt: { $lt: new Date() } },
            { 
                isActive: true, 
                lastActivity: { $lt: new Date(Date.now() - 30 * 60 * 1000) } // 30 minutos de inactividad
            }
        ]
    });
};

// Middleware para actualizar automáticamente lastActivity
sessionSchema.pre('save', function(next) {
    if (this.isModified('isActive') && !this.isActive && !this.endTime) {
        this.endTime = new Date();
    }
    next();
});

// Tarea programada para limpiar sesiones expiradas
const cleanupJob = async () => {
    try {
        const Session = mongoose.model('Session');
        await Session.cleanupExpiredSessions();
    } catch (error) {
        console.error('Error al limpiar sesiones expiradas:', error);
    }
};

// Ejecutar la limpieza cada hora
setInterval(cleanupJob, 60 * 60 * 1000);

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;
