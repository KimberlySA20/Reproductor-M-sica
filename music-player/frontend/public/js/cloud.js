// Configuración
const API_URL = 'http://localhost:3000/api';
let selectedFiles = [];
let convertedFiles = [];

// Elementos del DOM
const selectFilesBtn = document.getElementById('selectFilesBtn');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const startUploadBtn = document.getElementById('startUploadBtn');
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');
const userFilesList = document.getElementById('userFilesList');
const sharedFilesList = document.getElementById('sharedFilesList');
const refreshFilesBtn = document.getElementById('refreshFilesBtn');
const convertToSelect = document.getElementById('convertTo');
const qualitySelect = document.getElementById('quality');

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
    loadUserFiles();
    loadSharedFiles();
});

// Configurar event listeners
function setupEventListeners() {
    // Navegación entre pestañas
    tabs.forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // Selección de archivos
    selectFilesBtn.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', handleFileSelect);
    
    // Arrastrar y soltar
    const dropZone = document.getElementById('dropZone');
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });
    
    dropZone.addEventListener('drop', handleDrop, false);
    
    // Subida de archivos
    startUploadBtn.addEventListener('click', startUpload);
    
    // Actualizar lista de archivos
    refreshFilesBtn && refreshFilesBtn.addEventListener('click', () => {
        loadUserFiles();
        loadSharedFiles();
    });
    
    // Actualizar lista de archivos convertidos
     const refreshConvertedBtn = document.getElementById('refreshConvertedBtn');
        if (refreshConvertedBtn) {
            refreshConvertedBtn.addEventListener('click', loadConvertedFiles);
        }
    
    refreshConvertedBtn && refreshConvertedBtn.addEventListener('click', loadConvertedFiles);
}

// Cambiar entre pestañas
function switchTab(tabName) {
    // Actualizar pestañas
    tabs.forEach(tab => {
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // Actualizar contenido
    tabContents.forEach(content => {
        if (content.id === `${tabName}-tab`) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
    
    // Cargar archivos si es necesario
    if (tabName === 'files') {
        loadUserFiles();
    } else if (tabName === 'shared') {
        loadSharedFiles();
    } else if (tabName === 'converted') {
        loadConvertedFiles();
    }
}

// Manejar selección de archivos
function handleFileSelect(e) {
    addFiles(Array.from(e.target.files));
    fileInput.value = ''; // Resetear el input para permitir seleccionar el mismo archivo de nuevo
}

// Manejar arrastrar y soltar
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function highlight() {
    dropZone.classList.add('highlight');
}

function unhighlight() {
    dropZone.classList.remove('highlight');
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    addFiles(Array.from(files));
}

// Añadir archivos a la lista de selección
function addFiles(files) {
    // Agregar archivos a la lista de selección
    files.forEach(file => {
        // Solo agregar si es un archivo nuevo (no tiene _id)
        if (!file._id) {
            // Agregar un ID temporal para el seguimiento
            file.tempId = 'temp-' + Math.random().toString(36).substr(2, 9);
            selectedFiles.push(file);
        } else {
            console.log('El archivo ya existe en la lista:', file.name);
        }
    });
    
    // Actualizar la interfaz de usuario
    renderFileList();
    startUploadBtn.disabled = selectedFiles.length === 0;
}

// Renderizar lista de archivos seleccionados
function renderFileList() {
    fileList.innerHTML = '';
    
    selectedFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        
        const fileInfo = document.createElement('div');
        fileInfo.textContent = `${file.name} (${formatFileSize(file.size)})`;
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'btn btn-small';
        removeBtn.innerHTML = '<i class="material-icons">delete</i>';
        removeBtn.onclick = () => removeFile(index);
        
        fileItem.appendChild(fileInfo);
        fileItem.appendChild(removeBtn);
        fileList.appendChild(fileItem);
    });
}

// Eliminar archivo de la lista
function removeFile(index) {
    selectedFiles.splice(index, 1);
    renderFileList();
    startUploadBtn.disabled = selectedFiles.length === 0;
}

// Formatear tamaño de archivo
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Iniciar subida de archivos
async function startUpload() {
    if (selectedFiles.length === 0) return;
    
    const convertTo = convertToSelect.value;
    const quality = qualitySelect.value;
    
    // Deshabilitar botón durante la subida
    startUploadBtn.disabled = true;
    startUploadBtn.innerHTML = '<i class="material-icons">hourglass_empty</i> Subiendo...';
    
    try {
        // Subir archivos uno por uno (para mejor manejo de errores)
        for (const file of selectedFiles) {
            try {
                console.log('Subiendo archivo:', file.name);
                await uploadFile(file, convertTo, quality);
                showNotification(`Archivo subido: ${file.name}`, 'success');
            } catch (error) {
                console.error(`Error al subir el archivo ${file.name}:`, error);
                showNotification(`Error al subir ${file.name}: ${error.message}`, 'error');
                // Continuar con el siguiente archivo en caso de error
                continue;
            }
        }
        
        // Limpiar lista de archivos seleccionados
        selectedFiles = [];
        fileList.innerHTML = '';
        
        // Recargar la lista de archivos
        await loadUserFiles();
        
    } catch (error) {
        console.error('Error en el proceso de subida:', error);
        showNotification('Error en el proceso de subida: ' + error.message, 'error');
    } finally {
        // Restaurar botón
        startUploadBtn.disabled = false;
        startUploadBtn.innerHTML = '<i class="material-icons">cloud_upload</i> Iniciar Subida';
        startUploadBtn.innerHTML = '<i class="material-icons">cloud_upload</i> Reintentar Subida';
    }
}

// Subir un archivo individual
async function uploadFile(file, convertTo, quality) {
    console.log('Preparando para subir archivo:', file.name);
    
    // Crear un nuevo objeto FormData
    const formData = new FormData();
    formData.append('file', file, file.name);
    
    // Agregar parámetros de conversión si es necesario
    if (convertTo && convertTo !== 'none') {
        formData.append('convertTo', convertTo);
        formData.append('quality', quality || 'medium');
        console.log('Parámetros de conversión:', { convertTo, quality });
    }
    
    // Obtener el token de autenticación
    const token = localStorage.getItem('token');
    if (!token) {
        const errorMsg = 'No se encontró el token de autenticación';
        console.error(errorMsg);
        throw new Error(errorMsg);
    }
    
    console.log('Iniciando subida del archivo:', file.name);
    
    try {
        const response = await fetch(`${API_URL}/files/upload`, {
            method: 'POST',
            headers: {
                'x-auth-token': token
                // No establecer 'Content-Type' para permitir que el navegador lo configure automáticamente
                // con el boundary correcto para FormData
            },
            body: formData,
            credentials: 'include' // Importante para incluir cookies de sesión
        });
        
        console.log('Respuesta del servidor:', response.status, response.statusText);
        
        // Procesar la respuesta
        const responseData = await response.json().catch(() => ({}));
        
        if (!response.ok) {
            const errorMessage = responseData.message || `Error al subir el archivo: ${response.status} ${response.statusText}`;
            console.error('Error en la respuesta del servidor:', errorMessage, responseData);
            throw new Error(errorMessage);
        }
        
        console.log('Archivo subido exitosamente:', responseData);
        return responseData;
        
    } catch (error) {
        console.error('Error en la solicitud de subida:', error);
        throw error;
    }
}

// Cargar archivos del usuario
async function loadUserFiles() {
    try {
        console.log('Cargando archivos del usuario...');
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('No se encontró token, redirigiendo a login...');
            window.location.href = '/login.html';
            return;
        }

        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        console.log('Obteniendo archivos de /files/my-files...');
        
        // Primero probamos solo con la ruta de archivos
        const filesResponse = await fetch(`${API_URL}/files/my-files`, { 
            headers,
            credentials: 'include' // Asegurar que se envíen las cookies
        });

        console.log('Respuesta de /files/my-files:', filesResponse.status, filesResponse.statusText);
        
        let files = [];

        if (filesResponse.ok) {
            const filesData = await filesResponse.json();
            console.log('Archivos recibidos:', filesData);
            files = files.concat(filesData);
        } else {
            const errorText = await filesResponse.text();
            console.error('Error en la respuesta de /files/my-files:', errorText);
            throw new Error(`Error al obtener archivos: ${filesResponse.status} ${filesResponse.statusText}`);
        }

        // Intentar obtener canciones solo si es necesario
        try {
            console.log('Obteniendo canciones de /songs...');
            const songsResponse = await fetch(`${API_URL}/songs`, { 
                headers,
                credentials: 'include' // Asegurar que se envíen las cookies
            });
            
            console.log('Respuesta de /songs:', songsResponse.status, songsResponse.statusText);

            if (songsResponse.ok) {
                const songsData = await songsResponse.json();
                console.log('Canciones recibidas:', songsData);
                // Mapear canciones al formato esperado
                const mappedSongs = songsData.map(song => ({
                    _id: song._id,
                    originalname: song.title || song.originalname || 'sin-titulo',
                    title: song.title,
                    artist: song.artist,
                    size: song.size,
                    mimeType: song.mimeType || 'audio/mpeg',
                    uploadDate: song.uploadDate || new Date().toISOString(),
                    duration: song.duration,
                    filePath: song.filePath,
                    downloadUrl: song.downloadUrl || `${API_URL}/songs/${song._id}/download`
                }));
                files = files.concat(mappedSongs);
            } else {
                const errorText = await songsResponse.text();
                console.warn('Advertencia al obtener canciones:', errorText);
            }
        } catch (songsError) {
            console.warn('Error al obtener canciones (se continuará con los archivos existentes):', songsError);
        }

        if (files.length === 0) {
            console.log('No se encontraron archivos para mostrar');
            renderUserFiles([]);
            return;
        }

        // Filtrar duplicados por _id
        const uniqueFiles = [];
        const fileIds = new Set();

        files.forEach(file => {
            if (file && file._id && !fileIds.has(file._id.toString())) {
                fileIds.add(file._id.toString());
                uniqueFiles.push(file);
            }
        });

        console.log('Archivos únicos a mostrar:', uniqueFiles);
        renderUserFiles(uniqueFiles);

        // Actualizar la variable global de songs si estamos en la página principal
        if (typeof window.songs !== 'undefined') {
            window.songs = uniqueFiles;
        }
    } catch (error) {
        console.error('Error al cargar archivos:', error);
        showNotification('Error al cargar los archivos: ' + (error.message || 'Error desconocido'), 'error');
    }
}

// Cargar archivos convertidos
async function loadConvertedFiles() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login.html';
            return;
        }

        const response = await fetch(`${API_URL}/files/converted`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Error al cargar archivos convertidos');
        }

        const data = await response.json();
        convertedFiles = Array.isArray(data) ? data : [];
        renderConvertedFiles(convertedFiles);
    } catch (error) {
        console.error('Error al cargar archivos convertidos:', error);
        showNotification('Error al cargar archivos convertidos', 'error');
    }
}

// Renderizar archivos convertidos
function renderConvertedFiles(files) {
    const container = document.getElementById('convertedFilesList');
    if (!container) return;

    console.log('Rendering converted files:', files.map(f => ({ 
        id: f._id || f.id, 
        name: f.originalName || f.originalname,
        fileId: f.fileId 
    })));

    if (!files || files.length === 0) {
        container.innerHTML = '<p class="no-files">No hay archivos convertidos disponibles.</p>';
        return;
    }

    container.innerHTML = files.map(file => {
        // Asegurarse de que el objeto file tenga las propiedades necesarias
        const fileId = file._id || file.id;
        const fileName = file.originalName || file.filename || 'archivo';
        const fileSize = file.size ? formatFileSize(file.size) : '';
        
        console.log('Processing file for render:', {
            fileId: fileId,
            fileName: fileName,
            fileObject: file,
            hasFileId: !!fileId,
            hasUnderscoreId: !!file._id,
            hasRegularId: !!file.id
        });
        const uploadDate = file.uploadDate ? new Date(file.uploadDate).toLocaleDateString() : '';
        const convertedFrom = file.convertedFrom ? 
            `• Convertido de ${file.convertedFrom.originalFormat || 'desconocido'} a ${file.convertedFrom.conversionSettings?.format || file.format || 'desconocido'}` : 
            '';

        return `
            <div class="file-item" data-id="${fileId}">
                <div class="file-info">
                    <i class="material-icons">${getFileIcon(file.mimeType || '')}</i>
                    <div>
                        <div class="file-name" title="${fileName}">${fileName}</div>
                        <div class="file-meta">
                            ${fileSize} 
                            ${uploadDate ? `• ${uploadDate}` : ''}
                            ${convertedFrom}
                        </div>
                    </div>
                </div>
                <div class="file-actions">
                    <button onclick="downloadFile('${file._id}', '${file.originalName.replace(/'/g, "\\'").replace(/"/g, '\\"')}')" 
                            class="btn-icon" 
                            title="Descargar">
                        <i class="material-icons">download</i>
                    </button>
                    <button onclick="deleteConvertedFile('${fileId}')" 
                            class="btn-icon btn-danger" 
                            title="Eliminar">
                        <i class="material-icons">delete</i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

async function deleteConvertedFile(fileId) {
    if (!confirm('¿Estás seguro de que deseas eliminar este archivo convertido? Esta acción no se puede deshacer.')) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login.html';
            return;
        }

        const response = await fetch(`${API_URL}/files/${fileId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            showNotification('Archivo convertido eliminado correctamente', 'success');
            loadConvertedFiles(); // Recargar la lista de archivos convertidos
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Error al eliminar el archivo');
        }
    } catch (error) {
        console.error('Error al eliminar archivo convertido:', error);
        showNotification(`Error al eliminar archivo: ${error.message}`, 'error');
    }
}


// Obtener ícono según el tipo de archivo
function getFileIcon(mimeType) {
    if (!mimeType) return 'insert_drive_file';
    
    if (mimeType.includes('audio')) return 'audiotrack';
    if (mimeType.includes('video')) return 'videocam';
    if (mimeType.includes('image')) return 'image';
    if (mimeType.includes('pdf')) return 'picture_as_pdf';
    
    return 'insert_drive_file';
}

// Renderizar archivos del usuario
function renderUserFiles(files) {
    if (!files || files.length === 0) {
        userFilesList.innerHTML = '<p>No hay archivos subidos.</p>';
        return;
    }

    // Ordenar por fecha de subida (más recientes primero)
    const sortedFiles = [...files].sort((a, b) => {
        return new Date(b.uploadDate || b.createdAt) - new Date(a.uploadDate || a.createdAt);
    });

    userFilesList.innerHTML = sortedFiles.map(file => {
        const isAudio = file.mimeType && file.mimeType.startsWith('audio/');
        const fileSize = file.size ? formatFileSize(file.size) : 'Tamaño desconocido';
        const uploadDate = file.uploadDate || file.createdAt;
        const formattedDate = uploadDate ? new Date(uploadDate).toLocaleDateString() : 'Fecha desconocida';
        
        return `
        <div class="file-item">
            <div class="file-info">
                <h4>${file.originalname || file.title || 'Sin título'}</h4>
                <p>${file.artist || 'Artista desconocido'} • ${fileSize} • ${formattedDate}</p>
                ${file.duration ? `<p class="duration">Duración: ${formatTime(file.duration)}</p>` : ''}
            </div>
            <div class="file-actions">
                <button class="btn btn-sm" onclick="downloadFile('${file._id || file.id}', '${(file.originalname || file.title || 'file').replace(/'/g, "\\'").replace(/"/g, '\\"')}')">
                    <i class="material-icons">download</i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteFile('${file._id || file.id}')">
                    <i class="material-icons">delete</i>
                </button>
            </div>
        </div>`;
    }).join('');
}

// Función para formatear el tiempo (MM:SS)
function formatTime(seconds) {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Función para mostrar notificaciones
function showNotification(message, type = 'info') {
    // Verificar si ya existe un contenedor de notificaciones
    let notificationContainer = document.getElementById('notification-container');
    
    // Si no existe, crearlo
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        notificationContainer.style.position = 'fixed';
        notificationContainer.style.top = '20px';
        notificationContainer.style.right = '20px';
        notificationContainer.style.zIndex = '1000';
        document.body.appendChild(notificationContainer);
    }
    
    // Crear la notificación
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.padding = '15px';
    notification.style.margin = '10px 0';
    notification.style.borderRadius = '4px';
    notification.style.color = 'white';
    notification.style.display = 'flex';
    notification.style.justifyContent = 'space-between';
    notification.style.alignItems = 'center';
    notification.style.minWidth = '300px';
    notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    
    // Establecer colores según el tipo de notificación
    switch(type) {
        case 'success':
            notification.style.backgroundColor = '#4CAF50';
            break;
        case 'error':
            notification.style.backgroundColor = '#f44336';
            break;
        case 'warning':
            notification.style.backgroundColor = '#ff9800';
            break;
        default:
            notification.style.backgroundColor = '#2196F3';
    }
    
    // Agregar el mensaje
    const messageElement = document.createElement('span');
    messageElement.textContent = message;
    notification.appendChild(messageElement);
    
    // Agregar botón de cerrar
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;';
    closeButton.style.background = 'none';
    closeButton.style.border = 'none';
    closeButton.style.color = 'white';
    closeButton.style.fontSize = '20px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.padding = '0 0 0 15px';
    closeButton.onclick = () => notification.remove();
    notification.appendChild(closeButton);
    
    // Agregar la notificación al contenedor
    notificationContainer.appendChild(notification);
    
    // Eliminar la notificación después de 5 segundos
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.5s';
        setTimeout(() => notification.remove(), 500);
    }, 5000);
}

// Hacer que la función esté disponible globalmente
window.deleteFile = async function(fileId) {
    if (!confirm('¿Estás seguro de que deseas eliminar este archivo? Esta acción no se puede deshacer.')) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login.html';
            return;
        }

        // Primero intentamos eliminar con /api/files/
        let response = await fetch(`${API_URL}/files/${fileId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        // Si falla, intentamos con /api/songs/
        if (!response.ok) {
            response = await fetch(`${API_URL}/songs/${fileId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
        }

        // Verificar si la respuesta es JSON
        const contentType = response.headers.get('content-type');
        let data;
        
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            const text = await response.text();
            try {
                data = JSON.parse(text);
            } catch (e) {
                throw new Error('Respuesta del servidor no válida');
            }
        }

        if (!response.ok) {
            throw new Error(data.message || 'Error al eliminar el archivo');
        }

        // Recargar la lista de archivos
        loadUserFiles();
        showNotification(data.message || 'Archivo eliminado correctamente', 'success');
    } catch (error) {
        console.error('Error al eliminar el archivo:', error);
        showNotification('Error al eliminar el archivo: ' + (error.message || 'Error desconocido'), 'error');
    }
}

// Hacer que la función esté disponible globalmente
window.downloadFile = async function(fileId, fileName) {
    console.log('downloadFile called with:', { fileId, fileName });
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('No token found, redirecting to login');
            window.location.href = '/login.html';
            return;
        }

        // Limpiar el token si tiene el prefijo 'Bearer '
        const cleanToken = token.startsWith('Bearer ') ? token.substring(7) : token;
        console.log('Using cleanToken:', cleanToken.substring(0, 20) + '...');
        console.log('Token length:', cleanToken.length);

        // Validar que el token tenga un formato JWT válido (3 partes separadas por puntos)
        const tokenParts = cleanToken.split('.');
        if (tokenParts.length !== 3) {
            console.error('Token inválido - no tiene formato JWT (debe tener 3 partes):', tokenParts.length);
            showNotification('Sesión inválida. Por favor inicia sesión nuevamente.', 'error');
            setTimeout(() => window.location.href = '/login.html', 2000);
            return;
        }
        console.log('Token format valid - 3 parts found');

        // Crear un enlace temporal para la descarga
        const downloadLink = document.createElement('a');
        
        // Usar la ruta correcta del backend
        const url = new URL(`${API_URL}/files/download/${fileId}`);
        console.log('Download URL:', url.toString());
        
        downloadLink.href = url.toString();
        downloadLink.setAttribute('download', fileName || 'archivo');
        
        // Agregar los headers de autenticación usando fetch
        try {
            console.log('Starting fetch request...');
            const headers = {
                'x-auth-token': cleanToken
            };
            console.log('Request headers:', { 'x-auth-token': cleanToken.substring(0, 20) + '...' });
            
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: headers,
                credentials: 'include'
            });

            console.log('Response status:', response.status);
            console.log('Response headers:', Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Response error:', errorText);
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            // Obtener el blob del archivo
            console.log('Creating blob...');
            const blob = await response.blob();
            console.log('Blob created, size:', blob.size, 'type:', blob.type);
            
            // Crear una URL temporal para el blob
            const blobUrl = window.URL.createObjectURL(blob);
            console.log('Blob URL created:', blobUrl);
            
            // Configurar el enlace de descarga
            downloadLink.href = blobUrl;
            downloadLink.setAttribute('download', fileName || 'archivo');
            
            // Agregar el enlace al documento y hacer clic en él
            document.body.appendChild(downloadLink);
            console.log('Triggering download...');
            downloadLink.click();
            
            // Limpiar después de la descarga
            setTimeout(() => {
                document.body.removeChild(downloadLink);
                window.URL.revokeObjectURL(blobUrl);
                console.log('Cleanup completed');
            }, 100);
            
            showNotification('Archivo descargado exitosamente', 'success');
            
        } catch (error) {
            console.error('Error al descargar el archivo:', error);
            showNotification('No se pudo descargar el archivo. Intente nuevamente.', 'error');
        }
        
    } catch (error) {
        console.error('Error inesperado al descargar:', error);
        showNotification('Ocurrió un error al intentar descargar el archivo.', 'error');
    }
}

// Cargar archivos compartidos
async function loadSharedFiles() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/files/shared`, {
            headers: {
                'x-auth-token': token
            }
        });
        
        if (!response.ok) {
            throw new Error('Error al cargar archivos compartidos');
        }
        
        const files = await response.json();
        renderSharedFiles(files);
    } catch (error) {
        console.error('Error al cargar archivos compartidos:', error);
        sharedFilesList.innerHTML = `<p class="error">Error al cargar archivos compartidos: ${error.message}</p>`;
    }
}

// Renderizar archivos compartidos
function renderSharedFiles(files) {
    if (!files || files.length === 0) {
        sharedFilesList.innerHTML = '<p>No tienes archivos compartidos contigo.</p>';
        return;
    }
    
    sharedFilesList.innerHTML = '';
    
    files.forEach(file => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        
        const fileInfo = document.createElement('div');
        fileInfo.innerHTML = `
            <div><strong>${file.originalName}</strong> (Compartido por: ${file.owner.email})</div>
            <div>${formatFileSize(file.size)} • ${new Date(file.uploadDate).toLocaleString()}</div>
            <div>${file.contentType}</div>
        `;
        
        // Botón para descargar
        const downloadBtn = document.createElement('a');
        downloadBtn.href = `${API_URL}/files/download/${file._id}`;
        downloadBtn.className = 'btn btn-small';
        downloadBtn.title = 'Descargar';
        downloadBtn.innerHTML = '<i class="material-icons">file_download</i>';
        downloadBtn.download = file.originalName;
        
        fileItem.appendChild(fileInfo);
        fileItem.appendChild(downloadBtn);
        
        sharedFilesList.appendChild(fileItem);
    });
}

// Compartir archivo
async function shareFile(fileId) {
    const email = prompt('Ingresa el correo electrónico con el que quieres compartir el archivo:');
    if (!email) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/files/share/${fileId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            body: JSON.stringify({ email })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error al compartir el archivo');
        }
        
        alert('Archivo compartido exitosamente');
    } catch (error) {
        console.error('Error al compartir archivo:', error);
        alert('Error al compartir el archivo: ' + error.message);
    }
}

// Verificar autenticación
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
    }
}
