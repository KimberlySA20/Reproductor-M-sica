import { Router } from 'express';
import { body } from 'express-validator';
import {
  register,
  login,
  getUser,
  verifyToken,
  logout
} from '@/controllers/authController';
import { authenticateToken } from '@/middleware/auth';
import { asyncHandler } from '@/middleware/errorHandler';
import { validateRequest } from '@/middleware/validation';

const router = Router();

// Middleware de validación
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('La contraseña debe contener mayúsculas, minúsculas y números'),
  body('username')
    .optional()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username debe tener entre 3 y 30 caracteres')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username solo puede contener letras, números y guiones bajos'),
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('password')
    .notEmpty()
    .withMessage('Contraseña es requerida'),
];

// Rutas públicas
router.post('/register', registerValidation, validateRequest, asyncHandler(register));
router.post('/login', loginValidation, validateRequest, asyncHandler(login));
router.post('/logout', asyncHandler(logout));

// Rutas protegidas
router.get('/me', authenticateToken, asyncHandler(getUser));
router.get('/verify', authenticateToken, asyncHandler(verifyToken));

export default router;
