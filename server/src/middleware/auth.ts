import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { AuthRequest, ApiResponse } from '@shared/types';
import { HTTP_STATUS } from '@shared/constants';
import User from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'tu_clave_secreta_muy_segura';

// Middleware para verificar autenticación
export const authenticateToken = async (
  req: AuthRequest,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    // Obtener el token de múltiples fuentes
    let token = req.header('x-auth-token') || 
                req.header('Authorization') || 
                req.query.token as string;

    // Verificar si no hay token
    if (!token) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: 'No hay token, autorización denegada',
      });
      return;
    }

    // Eliminar 'Bearer ' del token si está presente
    if (token.startsWith('Bearer ')) {
      token = token.substring(7);
    }

    // Verificar el token
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Obtener información completa del usuario
    const user = await User.findById(decoded.user.id);
    
    if (!user) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: 'Usuario no encontrado',
      });
      return;
    }

    // Agregar información del usuario al request
    req.user = {
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      files: user.files,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    next();
  } catch (error) {
    console.error('Error al verificar el token:', error);
    
    let errorMessage = 'Token no válido o expirado';
    if (error instanceof jwt.TokenExpiredError) {
      errorMessage = 'Token expirado';
    } else if (error instanceof jwt.JsonWebTokenError) {
      errorMessage = 'Token inválido';
    }

    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      error: errorMessage,
    });
  }
};

// Middleware opcional - no falla si no hay token
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Obtener el token
    let token = req.header('x-auth-token') || 
                req.header('Authorization') || 
                req.query.token as string;

    if (!token) {
      // No hay token, continuar sin autenticación
      return next();
    }

    // Eliminar 'Bearer ' del token si está presente
    if (token.startsWith('Bearer ')) {
      token = token.substring(7);
    }

    // Verificar el token
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Obtener información del usuario
    const user = await User.findById(decoded.user.id);
    
    if (user) {
        req.user = {
        id: user._id.toString(),
        email: user.email,
        username: user.username,
        files: user.files,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

    }

    next();
  } catch (error) {
    // En caso de error con el token, continuar sin autenticación
    console.warn('Error verificando token opcional:', error);
    next();
  }
};

// Middleware para verificar si el usuario es propietario del recurso
export const checkOwnership = (resourceField = 'uploadedBy') => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: 'Autenticación requerida',
      });
      return;
    }

    // El ownership check se hará en los controllers individuales
    // ya que necesitan acceso a los modelos específicos
    next();
  };
};

// Middleware para verificar roles (para futuras implementaciones)
export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: 'Autenticación requerida',
      });
      return;
    }

    // Por ahora, todos los usuarios tienen el mismo rol
    // Esta función está preparada para futuras implementaciones de roles
    next();
  };
};

// Middleware para limitar requests por usuario
export const rateLimitByUser = new Map<string, { count: number; resetTime: number }>();

export const userRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: 'Autenticación requerida',
      });
      return;
    }

    const userId = req.user.id;
    const now = Date.now();
    const userLimit = rateLimitByUser.get(userId);

    if (!userLimit || now > userLimit.resetTime) {
      // Resetear o inicializar el contador
      rateLimitByUser.set(userId, {
        count: 1,
        resetTime: now + windowMs,
      });
      return next();
    }

    if (userLimit.count >= maxRequests) {
      res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
        success: false,
        error: 'Too many requests, please try again later',
      });
      return;
    }

    // Incrementar contador
    userLimit.count++;
    next();
  };
};
