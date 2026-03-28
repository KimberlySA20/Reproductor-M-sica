import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '@shared/types';
import { HTTP_STATUS } from '@shared/constants';

// Clases de errores personalizadas
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  public details: any;

  constructor(message: string, details?: any) {
    super(message, HTTP_STATUS.BAD_REQUEST);
    this.details = details;
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Recurso') {
    super(`${resource} no encontrado`, HTTP_STATUS.NOT_FOUND);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'No autorizado') {
    super(message, HTTP_STATUS.UNAUTHORIZED);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Acceso denegado') {
    super(message, HTTP_STATUS.FORBIDDEN);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflicto de datos') {
    super(message, HTTP_STATUS.CONFLICT);
  }
}

// Middleware principal de manejo de errores
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): void => {
  let statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let message = 'Error interno del servidor';
  let details: any = undefined;

  // Manejar errores de MongoDB
  if (error.name === 'ValidationError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = 'Error de validación';
    details = Object.values((error as any).errors).map((err: any) => ({
      field: err.path,
      message: err.message,
    }));
  }
  // Error de duplicado (unique constraint)
  else if (error.name === 'MongoServerError' && (error as any).code === 11000) {
    statusCode = HTTP_STATUS.CONFLICT;
    message = 'Registro duplicado';
    const field = Object.keys((error as any).keyValue)[0];
    details = { field, value: (error as any).keyValue[field] };
  }
  // Error de Cast de MongoDB
  else if (error.name === 'CastError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = 'Formato de ID inválido';
  }
  // Error JWT expirado
  else if (error.name === 'TokenExpiredError') {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    message = 'Token expirado';
  }
  // Error JWT inválido
  else if (error.name === 'JsonWebTokenError') {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    message = 'Token inválido';
  }
  // Error de multer (subida de archivos)
  else if (error.name === 'MulterError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    if ((error as any).code === 'LIMIT_FILE_SIZE') {
      message = 'Archivo demasiado grande';
    } else if ((error as any).code === 'LIMIT_FILE_COUNT') {
      message = 'Demasiados archivos';
    } else {
      message = 'Error al subir archivo';
    }
  }
  // Errores personalizados de la aplicación
  else if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    if (error instanceof ValidationError) {
      details = error.details;
    }
  }

  // Registrar el error para debugging
  console.error('Error:', {
    message: error.message,
    stack: error.stack,
    statusCode,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // En producción, no enviar el stack trace
  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(isDevelopment && { stack: error.stack }),
    ...(details && { details }),
  });
};

// Middleware para errores 404 (rutas no encontradas)
export const notFoundHandler = (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): void => {
  const error = new NotFoundError(`Ruta ${req.originalUrl}`);
  next(error);
};

// Middleware para manejar errores asíncronos
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Middleware para validar entorno
export const requireEnv = (vars: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const missing = vars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
      const error = new AppError(
        `Variables de entorno requeridas: ${missing.join(', ')}`,
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
      return next(error);
    }
    
    next();
  };
};
