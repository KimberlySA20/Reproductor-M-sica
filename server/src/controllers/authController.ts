import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import User, { IUser } from '@/models/User';
import { AuthRequest, ApiResponse, AuthToken } from '@shared/types';
import { HTTP_STATUS } from '@shared/constants';

const JWT_SECRET: string = process.env.JWT_SECRET || 'tu_clave_secreta_muy_segura';
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '24h';

// Registrar un nuevo usuario
export const register = async (req: Request, res: Response<ApiResponse<AuthToken>>) => {
  try {
    const { email, password, username } = req.body;

    // Validar entrada
    if (!email || !password) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Email y contraseña son requeridos',
      });
    }

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        error: 'El usuario ya existe',
      });
    }

    // Crear nuevo usuario
    const user = new User({
      email,
      password,
      username: username || email.split('@')[0],
    });

    await user.save();

    // Crear y firmar el token JWT
    const payload = {
      user: {
        id: user._id.toString(),
        email: user.email,
        username: user.username,
      },
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data: {
        token,
        user: {
          _id: user._id.toString(),
          id: user._id.toString(),
          email: user.email,
          username: user.username,
          files: user.files.map(id => id.toString()),
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
      message: 'Usuario registrado exitosamente',
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Error en el servidor',
    });
  }
};

// Iniciar sesión
export const login = async (req: Request, res: Response<ApiResponse<AuthToken>>) => {
  try {
    const { email, password } = req.body;

    // Validar entrada
    if (!email || !password) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Email y contraseña son requeridos',
      });
    }

    // Verificar si el usuario existe
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: 'Credenciales inválidas',
      });
    }

    // Verificar la contraseña
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: 'Credenciales inválidas',
      });
    }

    // Crear y firmar el token JWT
    const payload = {
      user: {
        id: user._id.toString(),
        email: user.email,
        username: user.username,
      },
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.json({
      success: true,
      data: {
        token,
        user: {
          _id: user._id.toString(),
          id: user._id.toString(),
          email: user.email,
          username: user.username,
          files: user.files.map(id => id.toString()),
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
      message: 'Inicio de sesión exitoso',
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Error en el servidor',
    });
  }
};

// Obtener usuario autenticado
export const getUser = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: 'No autorizado',
      });
    }

    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: 'Usuario no encontrado',
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Error en el servidor',
    });
  }
};

// Verificar token
export const verifyToken = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: 'Token inválido',
      });
    }

    res.json({
      success: true,
      data: {
        valid: true,
        user: {
          _id: req.user.id,
          email: req.user.email,
          username: req.user.username,
        },
      },
    });
  } catch (error) {
    console.error('Error verificando token:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Error en el servidor',
    });
  }
};

// Cerrar sesión
export const logout = async (req: Request, res: Response) => {
  try {
    // En una implementación real, podríamos invalidar el token
    // Por ahora, simplemente respondemos con éxito
    res.json({
      success: true,
      message: 'Sesión cerrada exitosamente',
    });
  } catch (error) {
    console.error('Error en logout:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Error en el servidor',
    });
  }
};
