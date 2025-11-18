const jwt = require('jsonwebtoken');
require('dotenv').config();

// Usar una variable de entorno para la clave secreta o un valor por defecto
const JWT_SECRET = process.env.JWT_SECRET || 'tu_clave_secreta_muy_segura';

module.exports = function(req, res, next) {
    // Obtener el token de los encabezados 'x-auth-token', 'Authorization' o del query parameter 'token'
    let token = req.header('x-auth-token') || 
                req.header('Authorization') || 
                req.query.token;

    // Verificar si no hay token
    if (!token) {
        return res.status(401).json({ 
            success: false,
            message: 'No hay token, autorización denegada' 
        });
    }

    // Eliminar 'Bearer ' del token si está presente
    if (typeof token === 'string' && token.startsWith('Bearer ')) {
        token = token.substring(7, token.length);
    }

    // Verificar el token
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded.user;
        next();
    } catch (err) {
        console.error('Error al verificar el token:', err);
        return res.status(401).json({ 
            success: false,
            message: 'Token no válido o expirado' 
        });
    }
};
