import mongoose, { Schema, Document } from 'mongoose';

export interface IPlaylist extends Document {
  _id: string;
  name: string;
  description?: string;
  files: mongoose.Types.ObjectId[];
  createdBy: mongoose.Types.ObjectId;
  isPublic: boolean;
  coverImage?: string;
  duration?: number;
  createdAt: Date;
  updatedAt: Date;
  addFile(fileId: mongoose.Types.ObjectId): Promise<IPlaylist>;
  removeFile(fileId: mongoose.Types.ObjectId): Promise<IPlaylist>;
  calculateDuration(): Promise<number>;
  canAccess(userId: mongoose.Types.ObjectId): boolean;
}

const playlistSchema = new Schema<IPlaylist>({
  name: {
    type: String,
    required: [true, 'Nombre es requerido'],
    trim: true,
    maxlength: [100, 'Nombre no puede exceder 100 caracteres']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Descripción no puede exceder 500 caracteres']
  },
  files: [{
    type: Schema.Types.ObjectId,
    ref: 'Media'
  }],
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creador es requerido']
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  coverImage: String,
  duration: {
    type: Number,
    default: 0,
    min: [0, 'Duración no puede ser negativa']
  }
}, {
  timestamps: true
});

// Índices para mejor rendimiento
playlistSchema.index({ createdBy: 1 });
playlistSchema.index({ isPublic: 1 });
playlistSchema.index({ name: 'text', description: 'text' });
playlistSchema.index({ createdAt: -1 });

// Método para agregar un archivo a la playlist
playlistSchema.methods.addFile = async function(
  fileId: mongoose.Types.ObjectId
): Promise<IPlaylist> {
  if (!this.files.includes(fileId)) {
    this.files.push(fileId);
    await this.calculateDuration();
    return await this.save();
  }
  return this;
};

// Método para eliminar un archivo de la playlist
playlistSchema.methods.removeFile = async function(
  fileId: mongoose.Types.ObjectId
): Promise<IPlaylist> {
  const initialLength = this.files.length;
  this.files = this.files.filter((id: mongoose.Types.ObjectId) => !id.equals(fileId));
  
  if (this.files.length === initialLength) {
    throw new Error('El archivo no está en la playlist');
  }
  
  await this.calculateDuration();
  return await this.save();
};

// Método para calcular la duración total de la playlist
playlistSchema.methods.calculateDuration = async function(): Promise<number> {
  try {
    const MediaFile = mongoose.model('Media');
    const files = await MediaFile.find({ _id: { $in: this.files } });
    
    this.duration = files.reduce((total: number, file: any) => {
      return total + (file.duration || 0);
    }, 0);
    
    return this.duration;
  } catch (error) {
    console.error('Error calculando duración:', error);
    return 0;
  }
};

// Método para verificar si un usuario tiene permiso para acceder a la playlist
playlistSchema.methods.canAccess = function(userId: mongoose.Types.ObjectId): boolean {
  const ownerId = this.createdBy instanceof mongoose.Types.ObjectId 
    ? this.createdBy 
    : this.createdBy._id;
  
  return ownerId.equals(userId) || this.isPublic;
};

// Virtual para obtener el número de archivos
playlistSchema.virtual('fileCount').get(function() {
  return this.files.length;
});

// Virtual para obtener la duración formateada
playlistSchema.virtual('formattedDuration').get(function() {
  if (!this.duration || this.duration < 0) return '0:00';
  
  const hours = Math.floor(this.duration / 3600);
  const minutes = Math.floor((this.duration % 3600) / 60);
  const seconds = Math.floor(this.duration % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

// Middleware para calcular la duración cuando se guarda
playlistSchema.pre('save', async function(next) {
  if (this.isModified('files')) {
    await this.calculateDuration();
  }
  next();
});

const Playlist = mongoose.model<IPlaylist>('Playlist', playlistSchema);

export default Playlist;
