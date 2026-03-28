import mongoose, { Schema, Document } from 'mongoose';

export interface IMediaFile extends Document {
  _id: string;
  title: string;
  artist: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  duration?: number;
  filePath: string;
  convertedPath?: string;
  thumbnailPath?: string;
  mediaType: 'audio' | 'video';
  uploadedBy: mongoose.Types.ObjectId;
  isPublic: boolean;
  tags?: string[];
  playCount?: number;
  convertedFrom?: {
    originalName: string;
    originalFormat: string;
    conversionSettings: {
      format: string;
      quality: string;
      bitrate: number;
    };
  };
  sharedWith?: Array<{
    user: mongoose.Types.ObjectId;
    email: string;
    sharedAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
  getDownloadUrl(): string;
  canAccess(userId: mongoose.Types.ObjectId): boolean;
  shareWith(userId: mongoose.Types.ObjectId, email: string): Promise<IMediaFile>;
  removeShare(userId: mongoose.Types.ObjectId): Promise<IMediaFile>;
  incrementPlayCount(): Promise<IMediaFile>;
}

const mediaFileSchema = new Schema<IMediaFile>({
  title: {
    type: String,
    required: [true, 'Título es requerido'],
    trim: true,
    maxlength: [200, 'Título no puede exceder 200 caracteres']
  },
  artist: {
    type: String,
    required: [true, 'Artista es requerido'],
    trim: true,
    maxlength: [100, 'Artista no puede exceder 100 caracteres']
  },
  filename: {
    type: String,
    required: [true, 'Nombre de archivo es requerido'],
    unique: true,
    trim: true
  },
  originalName: {
    type: String,
    required: [true, 'Nombre original es requerido'],
    trim: true
  },
  mimetype: {
    type: String,
    required: [true, 'Tipo MIME es requerido'],
  },
  size: {
    type: Number,
    required: [true, 'Tamaño es requerido'],
    min: [1, 'Tamaño debe ser mayor a 0']
  },
  duration: {
    type: Number,
    min: [0, 'Duración no puede ser negativa']
  },
  filePath: {
    type: String,
    required: [true, 'Ruta del archivo es requerida']
  },
  convertedPath: String,
  thumbnailPath: String,
  mediaType: {
    type: String,
    required: [true, 'Tipo de medio es requerido'],
    enum: {
      values: ['audio', 'video'],
      message: 'Tipo de medio debe ser audio o video'
    }
  },
  uploadedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Usuario es requerido']
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [50, 'Tag no puede exceder 50 caracteres']
  }],
  playCount: {
    type: Number,
    default: 0,
    min: [0, 'Contador de reproducciones no puede ser negativo']
  },
  convertedFrom: {
    originalName: String,
    originalFormat: String,
    conversionSettings: {
      format: String,
      quality: String,
      bitrate: Number
    }
  },
  sharedWith: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email inválido']
    },
    sharedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Índices para mejor rendimiento
mediaFileSchema.index({ uploadedBy: 1 });
mediaFileSchema.index({ 'sharedWith.user': 1 });
mediaFileSchema.index({ isPublic: 1 });
mediaFileSchema.index({ mediaType: 1 });
mediaFileSchema.index({ title: 'text', artist: 'text', tags: 'text' });
mediaFileSchema.index({ playCount: -1 });
mediaFileSchema.index({ createdAt: -1 });

// Método para obtener la URL de descarga
mediaFileSchema.methods.getDownloadUrl = function(): string {
  return `/api/media/download/${this._id}`;
};

// Método para obtener la URL de streaming
mediaFileSchema.methods.getStreamUrl = function(): string {
  return `/api/media/stream/${this._id}`;
};

// Método para verificar si un usuario tiene permiso para acceder al archivo
mediaFileSchema.methods.canAccess = function(userId: mongoose.Types.ObjectId): boolean {
  const ownerId = this.uploadedBy instanceof mongoose.Types.ObjectId 
    ? this.uploadedBy 
    : this.uploadedBy._id;
  
  if (ownerId.equals(userId) || this.isPublic) {
    return true;
  }
  
  return this.sharedWith?.some(share => 
    share.user && share.user.equals(userId)
  ) || false;
};

// Método para compartir el archivo
mediaFileSchema.methods.shareWith = async function(
  userId: mongoose.Types.ObjectId, 
  email: string
): Promise<IMediaFile> {
  const isAlreadyShared = this.sharedWith?.some(share => 
    (share.user && share.user.equals(userId)) || 
    (email && share.email === email)
  );
  
  if (isAlreadyShared) {
    throw new Error('El archivo ya está compartido con este usuario');
  }
  
  if (!this.sharedWith) {
    this.sharedWith = [];
  }
  
  this.sharedWith.push({
    user: userId,
    email,
    sharedAt: new Date()
  });
  
  return await this.save();
};

// Método para eliminar un compartido
mediaFileSchema.methods.removeShare = async function(
  userId: mongoose.Types.ObjectId
): Promise<IMediaFile> {
  if (!this.sharedWith) {
    throw new Error('No hay compartidos para este archivo');
  }
  
  const initialLength = this.sharedWith.length;
  this.sharedWith = this.sharedWith.filter(share => 
    !(share.user && share.user.equals(userId))
  );
  
  if (this.sharedWith.length === initialLength) {
    throw new Error('No se encontró el compartido para este usuario');
  }
  
  return await this.save();
};

// Método para incrementar el contador de reproducciones
mediaFileSchema.methods.incrementPlayCount = async function(): Promise<IMediaFile> {
  this.playCount = (this.playCount || 0) + 1;
  return await this.save();
};

// Virtual para obtener el tamaño formateado
mediaFileSchema.virtual('formattedSize').get(function() {
  const bytes = this.size;
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

// Virtual para obtener la duración formateada
mediaFileSchema.virtual('formattedDuration').get(function() {
  if (!this.duration || this.duration < 0) return '0:00';
  
  const hours = Math.floor(this.duration / 3600);
  const minutes = Math.floor((this.duration % 3600) / 60);
  const seconds = Math.floor(this.duration % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

// Middleware para validar el tamaño máximo según el tipo de medio
mediaFileSchema.pre('save', function(next) {
  const maxSize = this.mediaType === 'video' ? 100 * 1024 * 1024 : 50 * 1024 * 1024; // 100MB video, 50MB audio
  
  if (this.size > maxSize) {
    const error = new Error(`Tamaño de archivo excede el máximo permitido para ${this.mediaType}`) as any;
    error.code = 'FILE_TOO_LARGE';
    return next(error);
  }
  
  next();
});

const MediaFile = mongoose.model<IMediaFile>('Media', mediaFileSchema);

export default MediaFile;
