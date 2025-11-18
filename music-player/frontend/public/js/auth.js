// Verificar autenticación al cargar la página
document.addEventListener('DOMContentLoaded', async () => {
    // No verificar autenticación en las páginas de login y registro
    if (window.location.pathname.endsWith('login.html') || 
        window.location.pathname.endsWith('register.html')) {
        return;
    }

    await checkAuth();
});

async function checkAuth() {
    const token = localStorage.getItem('token');
    const currentPath = window.location.pathname;
    
    if (!token) {
        // Si no hay token y no estamos en login/registro, redirigir a login
        if (!currentPath.endsWith('login.html') && !currentPath.endsWith('register.html')) {
            window.location.href = 'login.html';
        }
        return Promise.reject('No autenticado');
    }
    
    try {
        const response = await fetch('/api/auth/user', {
            headers: {
                'x-auth-token': token
            }
        });
        
        if (!response.ok) {
            throw new Error('Token inválido o expirado');
        }
        
        const userData = await response.json();
        currentUser = userData;
        
        // Si estamos en login/registro y ya estamos autenticados, redirigir al inicio
        if (currentPath.endsWith('login.html') || currentPath.endsWith('register.html')) {
            window.location.href = 'index.html';
            return Promise.resolve();
        }
        
        return Promise.resolve(userData);
    } catch (error) {
        console.error('Error verificando autenticación:', error);
        localStorage.removeItem('token');
        
        // Solo redirigir si no estamos ya en la página de login
        if (!currentPath.endsWith('login.html')) {
            window.location.href = 'login.html';
        }
        
        return Promise.reject('Error de autenticación');
    } finally {
        updateAuthUI();
    }
}

// Función para cerrar sesión
function logout() {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
}

// Función para obtener el token de autenticación
export function getAuthToken() {
    return localStorage.getItem('token');
}

// Función para verificar si el usuario está autenticado
export function isAuthenticated() {
    return !!localStorage.getItem('token');
}
