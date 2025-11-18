const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
    originalName: {
        type: String,
        required: true
    },
    fileName: {
        type: String,
        required: true,
        unique: true
    },
    filePath: {
        type: String,
        required: true
    },
    size: {
        type: Number,
        required: true
    },
    mimeType: {
        type: String,
        required: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sharedWith: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        email: String,
        sharedAt: {
            type: Date,
            default: Date.now
        }
    }],
    convertedFrom: {
        originalName: String,
        originalFormat: String,
        conversionSettings: {
            format: String,
            quality: String,
            bitrate: Number
        }
    },
    uploadDate: {
        type: Date,
        default: Date.now
    },
    isPublic: {
        type: Boolean,
        default: false
    }
});

// Índices para búsquedas rápidas
fileSchema.index({ owner: 1 });
fileSchema.index({ 'sharedWith.user': 1 });
fileSchema.index({ isPublic: 1 });

// Método para obtener la URL de descarga
fileSchema.methods.getDownloadUrl = function() {
    return `/api/files/download/${this._id}`;
};

// Método para verificar si un usuario tiene permiso para acceder al archivo
fileSchema.methods.canAccess = function(userId) {
    // Si owner está populado (es un objeto), usar owner._id
    // Si no está populado, usar owner directamente
    const ownerId = this.owner._id ? this.owner._id : this.owner;
    
    if (ownerId.equals(userId) || this.isPublic) {
        return true;
    }
    
    return this.sharedWith.some(share => 
        share.user && share.user.equals(userId)
    );
};

// Método para compartir el archivo
fileSchema.methods.shareWith = async function(userId, email) {
    // Verificar si ya está compartido con este usuario
    const isAlreadyShared = this.sharedWith.some(share => 
        (share.user && share.user.equals(userId)) || 
        (email && share.email === email)
    );
    
    if (isAlreadyShared) {
        throw new Error('El archivo ya está compartido con este usuario');
    }
    
    this.sharedWith.push({
        user: userId,
        email: email
    });
    
    await this.save();
    return this;
};

// Método para eliminar un compartido
fileSchema.methods.removeShare = async function(userId) {
    const initialLength = this.sharedWith.length;
    this.sharedWith = this.sharedWith.filter(share => 
        !(share.user && share.user.equals(userId))
    );
    
    if (this.sharedWith.length === initialLength) {
        throw new Error('No se encontró el compartido para este usuario');
    }
    
    await this.save();
    return this;
};

const File = mongoose.model('File', fileSchema);

module.exports = File;
