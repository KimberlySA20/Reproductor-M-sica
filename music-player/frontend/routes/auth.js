const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

// @route   POST api/auth/register
// @desc    Registrar un nuevo usuario
// @access  Público
router.post('/register', authController.register);

// @route   POST api/auth/login
// @desc    Iniciar sesión
// @access  Público
router.post('/login', authController.login);

// @route   GET api/auth/user
// @desc    Obtener información del usuario autenticado
// @access  Privado
router.get('/user', auth, authController.getUser);

// @route   GET api/auth/verify-token
// @desc    Verificar si un token es válido
// @access  Privado
router.get('/verify-token', auth, (req, res) => {
    res.status(200).json({ valid: true, user: req.user });
});

module.exports = router;
