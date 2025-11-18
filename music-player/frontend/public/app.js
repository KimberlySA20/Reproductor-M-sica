// Variables globales
let currentUser = null;
let songs = [];
let currentSongIndex = 0;
let isPlaying = false;

// Elementos del reproductor
let audioPlayer, playPauseBtn, prevBtn, nextBtn, progressBar, currentTimeEl, durationEl, songList, progressContainer;

// Media type selector functionality
function initializeMediaTypeSelector() {
    const mediaTabs = document.querySelectorAll('.media-tab');
    const audioContainer = document.getElementById('audioPlayerContainer');
    const videoContainer = document.getElementById('videoPlayerContainer');
    const uploadModalTitle = document.getElementById('uploadModalTitle');
    const mediaTypeSelect = document.getElementById('mediaType');
    const fileInputFormGroup = document.getElementById('fileInputFormGroup');
    const songFileInput = document.getElementById('songFile');

    mediaTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const mediaType = tab.dataset.media;
            
            // Update active tab
            mediaTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Show/hide containers
            if (mediaType === 'audio') {
                audioContainer.classList.add('active');
                videoContainer.classList.remove('active');
                uploadModalTitle.textContent = 'Upload New Song';
                fileInputFormGroup.querySelector('label').textContent = 'Audio File (MP3, WAV, OGG)';
                songFileInput.accept = 'audio/*';
                if (mediaTypeSelect) mediaTypeSelect.value = 'audio';
            } else {
                audioContainer.classList.remove('active');
                videoContainer.classList.add('active');
                uploadModalTitle.textContent = 'Upload New Video';
                fileInputFormGroup.querySelector('label').textContent = 'Video File (MP4, WebM, AVI)';
                songFileInput.accept = 'video/*';
                if (mediaTypeSelect) mediaTypeSelect.value = 'video';
                
                // Initialize video player if not already initialized
                if (!window.videoPlayer) {
                    window.videoPlayer = new VideoPlayer();
                }
            }
        });
    });

    // Handle media type change in upload form
    if (mediaTypeSelect) {
        mediaTypeSelect.addEventListener('change', (e) => {
            const isVideo = e.target.value === 'video';
            uploadModalTitle.textContent = isVideo ? 'Upload New Video' : 'Upload New Song';
            fileInputFormGroup.querySelector('label').textContent = isVideo ? 
                'Video File (MP4, WebM, AVI)' : 'Audio File (MP3, WAV, OGG)';
            songFileInput.accept = isVideo ? 'video/*' : 'audio/*';
        });
    }
}

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Initialize media type selector
    initializeMediaTypeSelector();
    
    // Obtener referencias a los elementos del DOM
    audioPlayer = document.getElementById('audioPlayer');
    playPauseBtn = document.getElementById('playPauseBtn');
    prevBtn = document.getElementById('prevBtn');
    nextBtn = document.getElementById('nextBtn');
    progressBar = document.querySelector('.progress');
    currentTimeEl = document.getElementById('currentTime');
    durationEl = document.getElementById('duration');
    songList = document.getElementById('songList');
    progressContainer = document.querySelector('.progress-container');
    const searchInput = document.getElementById('searchInput');
    const uploadBtn = document.getElementById('uploadBtn');
    const fileInput = document.getElementById('fileInput');
    const uploadModal = document.getElementById('uploadModal');
    const closeModal = document.querySelector('.close');
    const uploadForm = document.getElementById('uploadForm');
    const authModal = document.getElementById('authModal');
    const authForm = document.getElementById('authForm');
    const authModalTitle = document.getElementById('authModalTitle');
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const registerFields = document.getElementById('registerFields');
    const loginEmailField = document.getElementById('loginEmail');

    // Configurar manejadores de eventos del reproductor
    function setupPlayerEventListeners() {
        playPauseBtn.addEventListener('click', togglePlay);
        prevBtn.addEventListener('click', playPrevious);
        nextBtn.addEventListener('click', playNext);
        audioPlayer.addEventListener('timeupdate', updateProgress);
        audioPlayer.addEventListener('ended', playNext);
        if (progressContainer) {
            progressContainer.addEventListener('click', setProgress);
        }
        searchInput.addEventListener('input', filterSongs);
        uploadBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', handleFileSelect);
        closeModal.addEventListener('click', () => uploadModal.style.display = 'none');
        uploadForm.addEventListener('submit', handleUpload);
        
        // Configurar atajos de teclado
        document.addEventListener('keydown', handleKeyboardShortcuts);
    }
    
    // Manejador de atajos de teclado
    function handleKeyboardShortcuts(e) {
        if (e.code === 'Space') {
            e.preventDefault();
            togglePlay();
        } else if (e.code === 'ArrowRight') {
            e.preventDefault();
            if (e.shiftKey) {
                audioPlayer.currentTime = Math.min(audioPlayer.currentTime + 5, audioPlayer.duration);
            } else {
                playNext();
            }
        } else if (e.code === 'ArrowLeft') {
            e.preventDefault();
            if (e.shiftKey) {
                audioPlayer.currentTime = Math.max(audioPlayer.currentTime - 5, 0);
            } else {
                playPrevious();
            }
        } else if (e.code === 'ArrowUp') {
            e.preventDefault();
            audioPlayer.volume = Math.min(audioPlayer.volume + 0.1, 1);
        } else if (e.code === 'ArrowDown') {
            e.preventDefault();
            audioPlayer.volume = Math.max(audioPlayer.volume - 0.1, 0);
        } else if (e.code === 'KeyM') {
            e.preventDefault();
            audioPlayer.muted = !audioPlayer.muted;
        }
    }
    
    // Verificar autenticación al cargar la aplicación
    async function checkAuthOnLoad() {
        const token = localStorage.getItem('token');
        const currentPath = window.location.pathname;
        const isAuthPage = currentPath.endsWith('login.html') || currentPath.endsWith('register.html');
        
        // Si no hay token, redirigir a login sin importar la página actual
        if (!token) {
            if (!isAuthPage) {
                // Guardar la URL actual para redirigir después del login
                sessionStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search);
                window.location.href = 'login.html';
            }
            return false;
        }
        
        // Si hay token y estamos en una página de autenticación, redirigir al reproductor
        if (isAuthPage) {
            const redirectTo = sessionStorage.getItem('redirectAfterLogin') || 'index.html';
            sessionStorage.removeItem('redirectAfterLogin');
            window.location.href = redirectTo;
            return false;
        }
        
        // Verificar si el token es válido
        try {
            const response = await fetch('/api/auth/verify-token', {
                headers: { 'x-auth-token': token }
            });
            
            if (!response.ok) {
                // Token inválido o expirado
                localStorage.removeItem('token');
                sessionStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search);
                window.location.href = 'login.html';
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Error al verificar el token:', error);
            localStorage.removeItem('token');
            window.location.href = 'login.html';
            return false;
        }
    }

    // Inicializar la aplicación
    async function initApp() {
        // Verificar autenticación
        const isAuthenticated = await checkAuthOnLoad();
        if (!isAuthenticated) {
            return; // No continuar si no está autenticado o redirigimos
        }
        
        // Configurar autenticación primero
        setupAuth();
        
        // Configurar manejadores de eventos del reproductor
        setupPlayerEventListeners();
        
        // Cargar canciones después de verificar autenticación
        checkAuth()
            .then(loadSongs)
            .then(() => {
                console.log('Aplicación lista');
                // Habilitar reproducción después de la primera interacción
                document.addEventListener('click', enableAudioPlayback, { once: true });
                document.addEventListener('keydown', enableAudioPlayback, { once: true });
            })
            .catch(error => {
                console.error('Error al inicializar la aplicación:', error);
                // Si hay un error de autenticación, redirigir a login
                if (error.message.includes('autenticación') || error.message.includes('token')) {
                    window.location.href = 'login.html';
                }
            });
        
        // Manejar cierre de sesión cuando el token expira
        window.addEventListener('storage', handleStorageEvent);
    }
    
    // Manejador de eventos de almacenamiento
    function handleStorageEvent(e) {
        if (e.key === 'token' && !e.newValue) {
            currentUser = null;
            updateAuthUI();
            loadSongs().catch(error => {
                console.error('Error al recargar canciones:', error);
            });
        }
    }
    
    // Iniciar la aplicación
    initApp();
});

// Configuración de autenticación
function setupAuth() {
    // Verificar si los elementos del DOM existen antes de agregar event listeners
    const closeButtons = document.querySelectorAll('.close');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const uploadModal = document.getElementById('uploadModal');
            if (uploadModal) {
                uploadModal.style.display = 'none';
            }
        });
    });
    
    // Cerrar modal al hacer clic fuera
    window.addEventListener('click', (e) => {
        const uploadModal = document.getElementById('uploadModal');
        if (uploadModal && e.target === uploadModal) {
            uploadModal.style.display = 'none';
        }
    });
    
    // Configurar botón de cierre de sesión si existe
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            window.location.href = 'login.html';
        });
    }
}

// Funciones de autenticación
function showAuthModal(mode) {
    if (mode === 'login') {
        authModalTitle.textContent = 'Iniciar Sesión';
        registerFields.style.display = 'none';
        loginEmailField.closest('.form-group').style.display = 'block';
    } else {
        authModalTitle.textContent = 'Registrarse';
        registerFields.style.display = 'block';
        loginEmailField.closest('.form-group').style.display = 'none';
    }
    authModal.style.display = 'block';
}

async function handleAuth(e) {
    e.preventDefault();
    
    const isLogin = authModalTitle.textContent.includes('Iniciar');
    const email = isLogin ? 
        document.getElementById('loginEmail').value : 
        document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        const url = isLogin ? '/api/auth/login' : '/api/auth/register';
        let body = { email, password };
        
        if (!isLogin) {
            body.username = document.getElementById('username').value;
        }
        
        const response = await fetch(`${API_URL}/files/converted`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
});
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.message || 'Error de autenticación');
        
        // Guardar token y actualizar UI
        localStorage.setItem('token', data.token);
        currentUser = data.user;
        updateAuthUI();
        authModal.style.display = 'none';
        authForm.reset();
        
        // Recargar canciones para el usuario
        await loadSongs();
        
    } catch (error) {
        console.error('Error de autenticación:', error);
        alert(error.message);
    }
}

function updateAuthUI() {
    const authButtons = document.querySelector('.auth-buttons');
    if (!authButtons) return;
    
    if (currentUser) {
        authButtons.innerHTML = `
            <span>Hola, ${currentUser.username}</span>
            <button id="logoutBtn" class="btn btn-outline">
                <i class="material-icons">logout</i> Cerrar Sesión
            </button>
        `;
        document.getElementById('logoutBtn').addEventListener('click', logout);
        document.getElementById('uploadBtn').style.display = 'inline-flex';
    } else {
        authButtons.innerHTML = `
            <button id="loginBtn" class="btn btn-outline">
                <i class="material-icons">login</i> Iniciar Sesión
            </button>
            <button id="registerBtn" class="btn">
                <i class="material-icons">person_add</i> Registrarse
            </button>
        `;
        document.getElementById('uploadBtn').style.display = 'none';
        
        // Reasignar los event listeners
        document.getElementById('loginBtn').addEventListener('click', () => showAuthModal('login'));
        document.getElementById('registerBtn').addEventListener('click', () => showAuthModal('register'));
    }
}

async function logout() {
    try {
        const token = localStorage.getItem('token');
        if (token) {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        }
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
    }
    
    localStorage.removeItem('token');
    currentUser = null;
    updateAuthUI();
    await loadSongs(); // Recargar canciones públicas
}

// Verificar autenticación al cargar
async function checkAuth() {
    // No verificar autenticación en las páginas de login y registro
    if (window.location.pathname.endsWith('login.html') || 
        window.location.pathname.endsWith('register.html')) {
        return Promise.resolve();
    }

    const token = localStorage.getItem('token');
    
    if (!token) {
        // Si no hay token, redirigir a login
        window.location.href = 'login.html';
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
        
        // Si estamos en la página de login o registro y ya estamos autenticados, redirigir al inicio
        if (window.location.pathname.endsWith('login.html') || 
            window.location.pathname.endsWith('register.html')) {
            window.location.href = 'index.html';
        }
        
        return Promise.resolve();
    } catch (error) {
        console.error('Error verificando autenticación:', error);
        localStorage.removeItem('token');
        
        // Solo redirigir si no estamos ya en la página de login
        if (!window.location.pathname.endsWith('login.html')) {
            window.location.href = 'login.html';
        }
        
        return Promise.reject('Error de autenticación');
    }
}

// Función para resaltar la canción recién subida
function highlightUploadedSong(index) {
    const songItems = document.querySelectorAll('.song-item');
    songItems.forEach(item => item.classList.remove('recently-uploaded'));
    
    if (songItems[index]) {
        songItems[index].classList.add('recently-uploaded');
        songItems[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// Funciones del reproductor
async function loadSongs() {
    try {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json'
        };
        
        // Solo agregar el token si existe
        if (token) {
            headers['x-auth-token'] = token;
        }
        
        const response = await fetch('/api/songs', { 
            headers: headers,
            credentials: 'include' // Importante para enviar cookies si las hay
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                // Token inválido o expirado
                localStorage.removeItem('token');
                window.location.href = 'login.html';
                return;
            }
            throw new Error('Error al cargar las canciones');
        }
        
        songs = await response.json();
        if (songs && songs.length > 0) {
            renderSongList(songs);
            loadSong(0);
        } else {
            // Mostrar mensaje si no hay canciones
            songList.innerHTML = '<p>No hay canciones disponibles. ¡Sube tu primera canción!</p>';
        }
    } catch (error) {
        console.error('Error al cargar las canciones:', error);
        songList.innerHTML = `<p class="error">Error al cargar las canciones: ${error.message}</p>`;
    }
    }

    function renderSongList(songsToRender) {
        songList.innerHTML = '';
        songsToRender.forEach((song, index) => {
            const li = document.createElement('li');
            li.className = 'song-item';
            li.innerHTML = `
                <div class="song-info">
                    <h4>${song.title}</h4>
                    <p>${song.artist}</p>
                </div>
                <span class="song-duration">${formatTime(song.duration || 0)}</span>
            `;
            li.addEventListener('click', () => playSong(index));
            songList.appendChild(li);
        });
    }

    function getPreferredFormat(originalFormat) {
        // Mapeo de formatos a formatos compatibles
        const formatMap = {
            'm4a': 'aac',
            'mp4': 'aac',
            'weba': 'ogg',
            'wav': 'wav',
            'mp3': 'mp3',
            'aac': 'aac',
            'ogg': 'ogg',
            'oga': 'ogg',
            'webm': 'webm',
            'flac': 'flac'
        };
        
        // Obtener la extensión sin el punto
        const ext = originalFormat ? originalFormat.toLowerCase().replace(/^\./, '') : 'mp3';
        return formatMap[ext] || 'mp3';
    }
    
    function getAudioMimeType(format) {
        const mimeTypes = {
            'mp3': 'audio/mpeg',
            'wav': 'audio/wav',
            'aac': 'audio/aac',
            'ogg': 'audio/ogg',
            'oga': 'audio/ogg',
            'webm': 'audio/webm',
            'flac': 'audio/flac'
        };
        return mimeTypes[format] || 'audio/mpeg';
    }
    
    function needsConversion(originalFormat, targetFormat) {
        if (!originalFormat) return false;
        const format = originalFormat.toLowerCase().replace(/^\./, '');
        return format !== targetFormat;
    }
    
    async function convertSong(songId, targetFormat) {
        try {
            const token = localStorage.getItem('token');
            const headers = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            const response = await fetch(`/api/songs/${songId}/convert?format=${targetFormat}`, {
                headers
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Error al convertir la canción');
            }
            
            const data = await response.json();
            return data.url || data.filePath;
        } catch (error) {
            console.error('Error en la conversión:', error);
            throw error;
        }
    }
    
    async function findAvailableWorker() {
    try {
        const response = await fetch('/api/workers/available', {
            signal: AbortSignal.timeout(3000) // Tiempo de espera de 3 segundos
        });
        
        if (response.ok) {
            const worker = await response.json();
            if (worker && worker.host && worker.port) {
                const host = worker.host.includes(':') ? 'localhost' : worker.host;
                return `http://${host}:${worker.port}`;
            }
        }
    } catch (error) {
        console.warn('Error al buscar workers disponibles:', error);
    }
    return null;
}
    
    async function loadSong(songIndex) {
    if (songIndex < 0 || songIndex >= songs.length) return;
    
    currentSongIndex = songIndex;
    const song = songs[songIndex];
    
    // Actualizar interfaz
    updateNowPlayingUI(song);
    
    try {
        // Primero intenta cargar desde el worker
        const workerUrl = await findAvailableWorker();
        if (workerUrl) {
            console.log(`Reproduciendo desde worker: ${workerUrl}`);
            const streamUrl = `${workerUrl}/stream/${song._id}`;
            
            // Configura un tiempo de espera (ej. 10 segundos)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            try {
                // Verifica si el stream está accesible
                const response = await fetch(streamUrl, {
                    method: 'HEAD',
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    audioPlayer.src = streamUrl;
                    audioPlayer.type = song.mimetype || 'audio/mpeg';
                    await audioPlayer.play();
                    isPlaying = true;
                    updatePlayPauseIcon(isPlaying);
                    return;
                }
            } catch (err) {
                console.warn('Error al cargar desde worker, intentando carga directa...', err);
                // Continúa con la carga directa
            }
        }
        
        // Si falla, carga el archivo directamente
        console.log('Cargando archivo directamente:', song.filePath);
        audioPlayer.src = song.filePath;
        audioPlayer.type = song.mimetype || 'audio/mpeg';
        await audioPlayer.play();
        isPlaying = true;
        updatePlayPauseIcon(isPlaying);
        
    } catch (error) {
        console.error('Error al cargar la canción:', error);
        showNotification('Error al cargar la canción', 'error');
    }
}

    function updateNowPlayingUI(song) {
        document.querySelectorAll('.song-item').forEach((item, i) => {
            item.classList.toggle('playing', i === currentSongIndex);
        });

        const nowPlayingInfo = document.getElementById('nowPlayingInfo');
        nowPlayingInfo.innerHTML = `
            <h3>${song.title}</h3>
            <p>${song.artist}</p>
        `;
    }

    async function togglePlay() {
        if (songs.length === 0) return;
        
        if (isPlaying) {
            audioPlayer.pause();
            updatePlayPauseIcon(false);
        } else {
            try {
                // Si no hay fuente, cargar la canción actual
                if (!audioPlayer.src || audioPlayer.src === '') {
                    console.log('Cargando canción...');
                    const loaded = await loadSong(currentSongIndex);
                    if (!loaded) throw new Error('No se pudo cargar la canción');
                }
                
                // Intentar reproducir
                await audioPlayer.play();
                updatePlayPauseIcon(true);
                
                // Si llegamos aquí, la reproducción comenzó correctamente
                console.log('Reproducción iniciada');
            } catch (error) {
                console.error('Error al reproducir:', error);
                // Mostrar mensaje al usuario
                const nowPlaying = document.getElementById('nowPlayingInfo');
                if (nowPlaying) {
                    const errorMsg = document.createElement('div');
                    errorMsg.className = 'error-message';
                    errorMsg.textContent = 'Haz clic en cualquier parte de la página y luego en reproducir';
                    nowPlaying.appendChild(errorMsg);
                    
                    // Eliminar el mensaje después de 3 segundos
                    setTimeout(() => {
                        if (errorMsg.parentNode === nowPlaying) {
                            nowPlaying.removeChild(errorMsg);
                        }
                    }, 3000);
                }
            }
        }
    }

    function updatePlayPauseIcon(playing) {
        isPlaying = playing;
        const icon = playPauseBtn.querySelector('i');
        icon.textContent = playing ? 'pause' : 'play_arrow';
    }

    function playPrevious() {
        if (songs.length === 0) return;
        
        currentSongIndex--;
        if (currentSongIndex < 0) {
            currentSongIndex = songs.length - 1;
        }
        loadSong(currentSongIndex);
    }

    function playNext() {
        if (songs.length === 0) return;
        
        currentSongIndex++;
        if (currentSongIndex >= songs.length) {
            currentSongIndex = 0;
        }
        loadSong(currentSongIndex);
    }

    function updateProgress() {
        if (!audioPlayer || isNaN(audioPlayer.duration)) return;
        
        const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
        
        // Actualizar tiempo actual
        if (currentTimeEl) {
            currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
        }
        
        // Actualizar duración si aún no está establecida
        if (durationEl && (durationEl.textContent === '0:00' || durationEl.textContent === '')) {
            durationEl.textContent = formatTime(audioPlayer.duration);
        }
    }

    function setProgress(e) {
        if (!progressBar || !audioPlayer) return;
        
        const width = this.clientWidth;
        const clickX = e.offsetX;
        const duration = audioPlayer.duration;
        audioPlayer.currentTime = (clickX / width) * duration;
    }

    function playSong(index) {
        currentSongIndex = index;
        loadSong(index);
        audioPlayer.play()
            .then(() => updatePlayPauseIcon(true))
            .catch(error => console.error('Error playing song:', error));
    }

    function filterSongs() {
        const searchTerm = searchInput.value.toLowerCase();
        const filteredSongs = songs.filter(song => 
            song.title.toLowerCase().includes(searchTerm) || 
            song.artist.toLowerCase().includes(searchTerm)
        );
        renderSongList(filteredSongs);
    }

    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            // Show the upload modal
            uploadModal.style.display = 'flex';
            // Set the file in the form
            document.getElementById('songFile').files = e.target.files;
            // Set the title field to the filename (without extension)
            const fileName = file.name.replace(/\.[^/.]+$/, '');
            document.getElementById('songTitle').value = fileName;
        }
    }

async function handleUpload(e) {
    e.preventDefault();

    const title = document.getElementById('songTitle').value.trim();
    const artist = document.getElementById('songArtist').value.trim();
    const mediaType = document.getElementById('mediaType').value;
    const fileInput = document.getElementById('songFile');
    const file = fileInput.files[0];

    // Validación de campos
    if (!title || !artist || !file) {
        showNotification('Por favor completa todos los campos', 'error');
        return;
    }

    // Validar tamaño del archivo (máximo 100MB para video, 50MB para audio)
    const MAX_FILE_SIZE = mediaType === 'video' ? 100 * 1024 * 1024 : 50 * 1024 * 1024;
    const sizeText = mediaType === 'video' ? '100MB' : '50MB';
    if (file.size > MAX_FILE_SIZE) {
        showNotification(`El archivo es demasiado grande. El tamaño máximo permitido es de ${sizeText}.`, 'error');
        return;
    }

    // Validar tipo de archivo según el tipo de medio
    if (mediaType === 'audio') {
        const validAudioTypes = ['audio/mp3', 'audio/wav', 'audio/mpeg', 'audio/ogg', 'audio/aac', 'audio/m4a', 'audio/webm', 'audio/flac'];
        const validAudioExtensions = ['.mp3', '.wav', '.ogg', '.aac', '.m4a', '.webm', '.flac'];
        
        if (!validAudioTypes.includes(file.type) && !file.name.match(new RegExp(`(${validAudioExtensions.join('|')})$`, 'i'))) {
            showNotification('Formato de archivo no soportado. Por favor sube un archivo de audio válido.', 'error');
            return;
        }
    } else if (mediaType === 'video') {
        const validVideoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov', 'video/wmv', 'video/mkv'];
        const validVideoExtensions = ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.wmv', '.mkv', '.flv'];
        
        if (!validVideoTypes.includes(file.type) && !file.name.match(new RegExp(`(${validVideoExtensions.join('|')})$`, 'i'))) {
            showNotification('Formato de archivo no soportado. Por favor sube un archivo de video válido (MP4, WebM, AVI).', 'error');
            return;
        }
    }

    // Mostrar indicador de carga
    const uploadBtn = uploadForm.querySelector('button[type="submit"]');
    const originalBtnText = uploadBtn.innerHTML;
    uploadBtn.disabled = true;
    uploadBtn.innerHTML = '<i class="material-icons">hourglass_empty</i> Subiendo...';

    const formData = new FormData();
    formData.append('title', title);
    formData.append('artist', artist);
    formData.append('mediaType', mediaType);
    formData.append('song', file);

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('No estás autenticado. Por favor inicia sesión.');
        }
        
        const endpoint = mediaType === 'video' ? '/api/files/upload' : '/api/songs/upload';
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: formData
        });
        
        const responseData = await response.json();
        
        if (!response.ok) {
            throw new Error(responseData.message || `Error al subir el ${mediaType === 'video' ? 'video' : 'canción'}`);
        }

        // Éxito
        showNotification(`${mediaType === 'video' ? 'Video' : 'Canción'} subida exitosamente`, 'success');

        // Cerrar el modal y limpiar el formulario
        uploadModal.style.display = 'none';
        uploadForm.reset();

        // Recargar lista según el tipo de medio
        if (mediaType === 'video' && window.videoPlayer) {
            await window.videoPlayer.loadVideos();
        } else {
            // Forzar recarga completa de la lista de canciones
            songs = [];
            await loadSongs();
        }

        // Actualizar la interfaz de usuario
        if (mediaType === 'audio' && songs && songs.length > 0) {
            // La canción recién subida debería estar al principio (ordenadas por fecha descendente)
            highlightUploadedSong(0);

            // Actualizar la vista de "Mis Archivos" si existe
            if (typeof updateMyFilesView === 'function') {
                updateMyFilesView();
            }
        }
        
    } catch (error) {
        console.error(`Error al subir el ${mediaType === 'video' ? 'video' : 'canción'}:`, error);
        showNotification(error.message || `Error al subir el ${mediaType === 'video' ? 'video' : 'canción'}`, 'error');
    } finally {
        // Restaurar el botón de subida
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = originalBtnText;
    }
}

    function formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    }

    // Función para mostrar notificaciones
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Ocultar notificación después de 3 segundos
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Habilitar reproducción después de la primera interacción
    function enableAudioPlayback() {
        // Remove the event listeners since we only need this to happen once
        document.removeEventListener('click', enableAudioPlayback);
        document.removeEventListener('keydown', enableAudioPlayback);
        
        // If there's a song loaded, try to play it
        if (audioPlayer.src && !isPlaying) {
            audioPlayer.play()
                .then(() => updatePlayPauseIcon(true))
                .catch(error => console.log('Aún no se puede reproducir automáticamente:', error));
        }
    }


