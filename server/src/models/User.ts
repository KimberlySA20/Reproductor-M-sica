import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  _id: string;
  email: string;
  password: string;
  username?: string;
  files: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>({
  email: {
    type: String,
    required: [true, 'Email es requerido'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email inválido']
  },
  password: {
    type: String,
    required: [true, 'Contraseña es requerida'],
    minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
    select: false
  },
  username: {
    type: String,
    trim: true,
    default: function() {
      return this.email?.split('@')[0] || '';
    }
  },
  files: [{
    type: Schema.Types.ObjectId,
    ref: 'Media'
  }]
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      return ret;
    }
  }
});

// Índices para mejor rendimiento
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });

// Hash de la contraseña antes de guardar
userSchema.pre('save', async function(next) {
  try {
    // Solo hashear si la contraseña ha sido modificada o es nueva
    if (!this.isModified('password')) {
      return next();
    }

    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Método para comparar contraseñas
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Error comparando contraseñas');
  }
};

// Método estático para encontrar usuario por email con contraseña
userSchema.statics.findByEmailWithPassword = function(email: string) {
  return this.findOne({ email }).select('+password');
};

// Middleware para validar email único
userSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('email')) {
    try {
      const existingUser = await this.constructor.findOne({ email: this.email });
      if (existingUser && !existingUser._id.equals(this._id)) {
        const error = new Error('Email ya está en uso') as any;
        error.code = 'DUPLICATE_EMAIL';
        return next(error);
      }
    } catch (error) {
      return next(error as Error);
    }
  }
  next();
});

// Virtual para obtener el número de archivos
userSchema.virtual('fileCount').get(function() {
  return this.files.length;
});

const User = mongoose.model<IUser>('User', userSchema);

export default User;
