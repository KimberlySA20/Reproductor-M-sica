import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationError } from 'express-validator';
import { ApiResponse } from '@shared/types';
import { HTTP_STATUS } from '@shared/constants';
import { ValidationError as CustomValidationError } from './errorHandler';

// Middleware para validar los resultados de express-validator
export const validateRequest = (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((error: any) => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value,
    }));

    const validationError = new CustomValidationError(
      'Error de validación',
      formattedErrors
    );
    
    return next(validationError);
  }
  
  next();
};

// Validadores personalizados
export const customValidators = {
  // Validar formato de archivo
  isValidFile: (mimetype: string, allowedTypes: string[]): boolean => {
    return allowedTypes.includes(mimetype);
  },

  // Validar tamaño de archivo
  isValidFileSize: (size: number, maxSize: number): boolean => {
    return size <= maxSize;
  },

  // Validar contraseña fuerte
  isStrongPassword: (password: string): boolean => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return password.length >= minLength &&
           hasUpperCase &&
           hasLowerCase &&
           hasNumbers &&
           hasSpecialChar;
  },

  // Validar username
  isValidUsername: (username: string): boolean => {
    return /^[a-zA-Z0-9_]{3,30}$/.test(username);
  },

  // Validar tags
  isValidTags: (tags: string[]): boolean => {
    return tags.every(tag => 
      typeof tag === 'string' && 
      tag.length >= 1 && 
      tag.length <= 50 &&
      /^[a-zA-Z0-9\s\-_]+$/.test(tag)
    );
  },

  // Validar formato de audio/video
  isValidMediaType: (mimetype: string, mediaType: 'audio' | 'video'): boolean => {
    const audioTypes = [
      'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac', 
      'audio/m4a', 'audio/webm', 'audio/flac'
    ];
    
    const videoTypes = [
      'video/mp4', 'video/webm', 'video/ogg', 'video/avi',
      'video/mov', 'video/wmv', 'video/mkv'
    ];
    
    return mediaType === 'audio' 
      ? audioTypes.includes(mimetype)
      : videoTypes.includes(mimetype);
  },
};

// Funciones de sanitización
export const sanitizers = {
  // Sanitizar string
  sanitizeString: (input: string): string => {
    return input.trim().replace(/[<>]/g, '');
  },

  // Sanitizar array de strings
  sanitizeStringArray: (input: string[]): string[] => {
    return input
      .filter(item => typeof item === 'string')
      .map(item => item.trim().toLowerCase())
      .filter(item => item.length > 0);
  },

  // Sanitizar filename
  sanitizeFilename: (filename: string): string => {
    return filename
      .replace(/[^a-zA-Z0-9\-_\.]/g, '_')
      .replace(/_{2,}/g, '_')
      .toLowerCase();
  },
};

// Middleware para validar ID de MongoDB
export const validateObjectId = (paramName = 'id') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const id = req.params[paramName];
    
    // Validar formato de ObjectId de MongoDB
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    
    if (!id || !objectIdRegex.test(id)) {
      const error = new CustomValidationError(
        `ID inválido en parámetro "${paramName}"`
      );
      return next(error);
    }
    
    next();
  };
};

// Middleware para validar paginación
export const validatePagination = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  
  if (page < 1 || limit < 1 || limit > 100) {
    const error = new CustomValidationError(
      'Parámetros de paginación inválidos'
    );
    return next(error);
  }
  
  // Agregar valores validados al request
  (req as any).pagination = { page, limit };
  
  next();
};

// Middleware para validar query parameters de búsqueda
export const validateSearchQuery = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { q, type, sortBy, sortOrder } = req.query;
  
  // Validar query de búsqueda
  if (q && typeof q === 'string' && q.length > 100) {
    const error = new CustomValidationError(
      'Query de búsqueda demasiado largo (máximo 100 caracteres)'
    );
    return next(error);
  }
  
  // Validar tipo de medio
  if (type && !['audio', 'video'].includes(type as string)) {
    const error = new CustomValidationError(
      'Tipo de medio inválido (debe ser audio o video)'
    );
    return next(error);
  }
  
  // Validar ordenamiento
  const allowedSortFields = ['title', 'artist', 'createdAt', 'playCount', 'duration'];
  const allowedSortOrders = ['asc', 'desc'];
  
  if (sortBy && !allowedSortFields.includes(sortBy as string)) {
    const error = new CustomValidationError(
      'Campo de ordenamiento inválido'
    );
    return next(error);
  }
  
  if (sortOrder && !allowedSortOrders.includes(sortOrder as string)) {
    const error = new CustomValidationError(
      'Orden de ordenamiento inválido (debe ser asc o desc)'
    );
    return next(error);
  }
  
  next();
};
