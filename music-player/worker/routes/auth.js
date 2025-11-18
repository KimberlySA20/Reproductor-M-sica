// worker/routes/auth.js
const express = require('express');
const router = express.Router();
const { User, Session } = require('../model');
const { authenticate } = require('../middleware/auth');

// Registro de usuario
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        // Verificar si el usuario ya existe
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ error: 'El usuario o correo ya está en uso' });
        }

        const user = new User({ username, email, password });
        await user.save();

        // Crear sesión
        const token = user.generateAuthToken();
        const session = new Session({
            userId: user._id,
            token,
            userAgent: req.headers['user-agent'],
            ip: req.ip,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 horas
        });
        await session.save();

        res.status(201).json({ 
            user: { id: user._id, username: user.username, email: user.email, role: user.role },
            token 
        });
    } catch (error) {
        console.error('Error en el registro:', error);
        res.status(500).json({ error: 'Error al registrar el usuario' });
    }
});

// Inicio de sesión
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Crear sesión
        const token = user.generateAuthToken();
        const session = new Session({
            userId: user._id,
            token,
            userAgent: req.headers['user-agent'],
            ip: req.ip,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 horas
        });
        await session.save();

        res.json({ 
            user: { id: user._id, username: user.username, email: user.email, role: user.role },
            token 
        });
    } catch (error) {
        console.error('Error en el inicio de sesión:', error);
        res.status(500).json({ error: 'Error al iniciar sesión' });
    }
});

// Cerrar sesión
router.post('/logout', authenticate, async (req, res) => {
    try {
        await Session.findByIdAndUpdate(req.session._id, { isActive: false });
        res.json({ message: 'Sesión cerrada correctamente' });
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        res.status(500).json({ error: 'Error al cerrar sesión' });
    }
});

module.exports = router;