// Video Player Module
class VideoPlayer {
    constructor() {
        this.videoPlayer = document.getElementById('videoPlayer');
        this.videoPlayPauseBtn = document.getElementById('videoPlayPauseBtn');
        this.videoProgressBar = document.querySelector('.video-progress');
        this.videoProgressBarContainer = document.querySelector('.video-progress-bar');
        this.videoCurrentTimeEl = document.getElementById('videoCurrentTime');
        this.videoDurationEl = document.getElementById('videoDuration');
        this.volumeBtn = document.getElementById('volumeBtn');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.fullscreenBtn = document.getElementById('fullscreenBtn');
        this.videoList = document.getElementById('videoList');
        this.videoSearchInput = document.getElementById('videoSearchInput');
        
        this.videos = [];
        this.currentVideoIndex = 0;
        this.isPlaying = false;
        
        this.initializeEventListeners();
        this.loadVideos();
        
        // Initialize delete button state
        this.updateDeleteButton();
    }

    initializeEventListeners() {
        // Play/Pause button
        this.videoPlayPauseBtn.addEventListener('click', () => this.togglePlayPause());
        
        // Video element events
        this.videoPlayer.addEventListener('timeupdate', () => this.updateProgress());
        this.videoPlayer.addEventListener('loadedmetadata', () => this.updateDuration());
        this.videoPlayer.addEventListener('ended', () => this.playNext());
        this.videoPlayer.addEventListener('click', () => this.togglePlayPause());
        
        // Progress bar
        this.videoProgressBarContainer.addEventListener('click', (e) => this.setProgress(e));
        
        // Volume controls
        this.volumeBtn.addEventListener('click', () => this.toggleMute());
        this.volumeSlider.addEventListener('input', (e) => this.setVolume(e.target.value));
        
        // Fullscreen
        this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        
        // Search
        this.videoSearchInput.addEventListener('input', () => this.filterVideos());
        
        // Action buttons
        document.getElementById('uploadVideoBtn').addEventListener('click', () => this.openVideoUpload());
        document.getElementById('convertVideoBtn').addEventListener('click', () => this.openConvertModal());
        document.getElementById('deleteVideoBtn').addEventListener('click', () => this.deleteSelectedVideos());
        
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (document.getElementById('videoPlayerContainer').classList.contains('active')) {
                this.handleKeyboardControls(e);
            }
        });
    }

    async loadVideos() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/files/videos', {
                headers: {
                    'x-auth-token': token
                }
            });

            if (!response.ok) {
                throw new Error('Error al cargar videos');
            }

            const files = await response.json();
            this.videos = files.filter(file => this.isVideoFile(file));
            this.renderVideoList();
        } catch (error) {
            console.error('Error al cargar videos:', error);
            this.videoList.innerHTML = '<p class="error">Error al cargar videos</p>';
        }
    }

    isVideoFile(file) {
        const videoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov', 'video/wmv'];
        const videoExtensions = ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.wmv', '.mkv', '.flv'];
        
        return videoTypes.includes(file.contentType) || 
               videoExtensions.some(ext => file.originalName.toLowerCase().endsWith(ext));
    }

    renderVideoList(videosToRender = this.videos) {
        this.videoList.innerHTML = '';

        if (videosToRender.length === 0) {
            this.videoList.innerHTML = '<p>No hay videos disponibles</p>';
            return;
        }

        videosToRender.forEach((video, index) => {
            const videoItem = document.createElement('li');
            videoItem.className = 'video-item';
            videoItem.dataset.index = this.videos.indexOf(video);
            videoItem.dataset.videoId = video._id;
            
            const videoInfo = document.createElement('div');
            videoInfo.className = 'video-info';
            
            // Add checkbox for selection
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'video-checkbox';
            checkbox.dataset.videoId = video._id;
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation();
                this.updateDeleteButton();
            });
            
            const format = this.getVideoFormat(video.originalName);
            
            videoInfo.innerHTML = `
                <h4>
                    <i class="material-icons">videocam</i>
                    ${video.title || video.originalName}
                </h4>
                <p>${video.artist || 'Unknown'} • ${this.formatFileSize(video.size)}</p>
            `;

            const videoMeta = document.createElement('div');
            videoMeta.className = 'video-meta';
            videoMeta.innerHTML = `
                <span class="video-format">${format}</span>
                <span class="video-duration">--:--</span>
            `;

            // Add checkbox to the item
            const checkboxContainer = document.createElement('div');
            checkboxContainer.className = 'video-checkbox-container';
            checkboxContainer.appendChild(checkbox);
            
            videoItem.appendChild(checkboxContainer);
            videoItem.appendChild(videoInfo);
            videoItem.appendChild(videoMeta);
            
            videoItem.addEventListener('click', (e) => {
                if (!e.target.classList.contains('video-checkbox')) {
                    this.playVideo(this.videos.indexOf(video));
                }
            });
            
            this.videoList.appendChild(videoItem);
        });
    }

    getVideoFormat(filename) {
        const extension = filename.split('.').pop().toLowerCase();
        const formatMap = {
            'mp4': 'MP4',
            'webm': 'WebM',
            'avi': 'AVI',
            'mov': 'MOV',
            'wmv': 'WMV',
            'mkv': 'MKV',
            'flv': 'FLV',
            'ogg': 'OGG'
        };
        return formatMap[extension] || extension.toUpperCase();
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async playVideo(index) {
        if (index < 0 || index >= this.videos.length) return;

        this.currentVideoIndex = index;
        const video = this.videos[index];

        try {
            const token = localStorage.getItem('token');
            
            // Para streaming, usamos la URL con el token como parámetro
            const videoUrl = `/api/files/stream/${video._id}?token=${token}`;
            this.videoPlayer.src = videoUrl;
            
            // Update UI
            this.updateNowPlaying(video);
            this.updateVideoListHighlight();
            
            // Auto play
            this.videoPlayer.play().then(() => {
                this.isPlaying = true;
                this.updatePlayPauseIcon();
            }).catch(error => {
                console.error('Error al reproducir video:', error);
            });

        } catch (error) {
            console.error('Error al cargar video:', error);
            this.showNotification('Error al cargar el video', 'error');
        }
    }

    updateNowPlaying(video) {
        const nowPlayingInfo = document.querySelector('#videoPlayerContainer .video-playlist h2');
        if (nowPlayingInfo) {
            nowPlayingInfo.innerHTML = `Video Library <small>• Now Playing: ${video.title || video.originalName}</small>`;
        }
    }

    updateVideoListHighlight() {
        const videoItems = this.videoList.querySelectorAll('.video-item');
        videoItems.forEach((item, index) => {
            item.classList.toggle('playing', parseInt(item.dataset.index) === this.currentVideoIndex);
        });
    }

    togglePlayPause() {
        if (this.isPlaying) {
            this.videoPlayer.pause();
        } else {
            this.videoPlayer.play();
        }
        this.isPlaying = !this.isPlaying;
        this.updatePlayPauseIcon();
    }

    updatePlayPauseIcon() {
        const icon = this.videoPlayPauseBtn.querySelector('i');
        icon.textContent = this.isPlaying ? 'pause' : 'play_arrow';
    }

    updateProgress() {
        if (!this.videoPlayer || isNaN(this.videoPlayer.duration)) return;

        const progress = (this.videoPlayer.currentTime / this.videoPlayer.duration) * 100;
        this.videoProgressBar.style.width = `${progress}%`;
        this.videoCurrentTimeEl.textContent = this.formatTime(this.videoPlayer.currentTime);
    }

    updateDuration() {
        if (!this.videoPlayer || isNaN(this.videoPlayer.duration)) return;
        this.videoDurationEl.textContent = this.formatTime(this.videoPlayer.duration);
    }

    setProgress(e) {
        if (!this.videoProgressBarContainer || !this.videoPlayer) return;

        const width = this.videoProgressBarContainer.clientWidth;
        const clickX = e.offsetX;
        const duration = this.videoPlayer.duration;
        this.videoPlayer.currentTime = (clickX / width) * duration;
    }

    setVolume(value) {
        this.videoPlayer.volume = value / 100;
        this.updateVolumeIcon();
    }

    toggleMute() {
        this.videoPlayer.muted = !this.videoPlayer.muted;
        this.updateVolumeIcon();
        this.volumeSlider.value = this.videoPlayer.muted ? 0 : this.videoPlayer.volume * 100;
    }

    updateVolumeIcon() {
        const icon = this.volumeBtn.querySelector('i');
        const volume = this.videoPlayer.volume;
        const muted = this.videoPlayer.muted;

        if (muted || volume === 0) {
            icon.textContent = 'volume_off';
        } else if (volume < 0.5) {
            icon.textContent = 'volume_down';
        } else {
            icon.textContent = 'volume_up';
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            this.videoPlayer.requestFullscreen().catch(err => {
                console.error('Error attempting to enable fullscreen:', err);
            });
        } else {
            document.exitFullscreen();
        }
    }

    playNext() {
        const nextIndex = (this.currentVideoIndex + 1) % this.videos.length;
        this.playVideo(nextIndex);
    }

    playPrevious() {
        const prevIndex = this.currentVideoIndex === 0 ? this.videos.length - 1 : this.currentVideoIndex - 1;
        this.playVideo(prevIndex);
    }

    filterVideos() {
        const searchTerm = this.videoSearchInput.value.toLowerCase();
        const filteredVideos = this.videos.filter(video =>
            (video.title && video.title.toLowerCase().includes(searchTerm)) ||
            (video.artist && video.artist.toLowerCase().includes(searchTerm)) ||
            video.originalName.toLowerCase().includes(searchTerm)
        );
        this.renderVideoList(filteredVideos);
    }

    handleKeyboardControls(e) {
        switch(e.key) {
            case ' ':
                e.preventDefault();
                this.togglePlayPause();
                break;
            case 'ArrowLeft':
                this.skipBy(-5);
                break;
            case 'ArrowRight':
                this.skipBy(5);
                break;
            case 'ArrowUp':
                this.setVolume(Math.min(100, this.volumeSlider.value + 10));
                break;
            case 'ArrowDown':
                this.setVolume(Math.max(0, this.volumeSlider.value - 10));
                break;
            case 'KeyF':
                this.toggleFullscreen();
                break;
            case 'KeyN':
                this.playNext();
                break;
            case 'KeyP':
                this.playPrevious();
                break;
        }
    }

    openVideoUpload() {
        // Switch to video mode if not already active
        if (!document.getElementById('videoPlayerContainer').classList.contains('active')) {
            document.getElementById('videoTab').click();
        }
        // Open the upload modal
        document.getElementById('uploadModal').style.display = 'flex';
    }

    openConvertModal() {
        const selectedVideos = this.getSelectedVideos();
        if (selectedVideos.length === 0) {
            this.showNotification('Please select at least one video to convert', 'error');
            return;
        }
        
        // Create convert modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Convert Videos</h3>
                <p>Convert ${selectedVideos.length} video(s) to selected format</p>
                <div class="convert-options">
                    <label>Select output format:</label>
                    <select id="convertFormat">
                        <option value="mp4">MP4</option>
                        <option value="webm">WebM</option>
                        <option value="avi">AVI</option>
                        <option value="mov">MOV</option>
                    </select>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-primary" id="startConvertBtn">Start Conversion</button>
                    <button class="btn btn-secondary" id="cancelConvertBtn">Cancel</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.style.display = 'flex';
        
        // Handle modal actions
        document.getElementById('startConvertBtn').addEventListener('click', () => {
            const format = document.getElementById('convertFormat').value;
            this.convertVideos(selectedVideos, format);
            document.body.removeChild(modal);
        });
        
        document.getElementById('cancelConvertBtn').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
    }

    async convertVideos(videos, format) {
        try {
            this.showNotification('Starting video conversion...', 'info');
            
            for (const video of videos) {
                const response = await fetch('/api/files/convert', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-auth-token': localStorage.getItem('token')
                    },
                    body: JSON.stringify({
                        fileId: video._id,
                        format: format
                    })
                });
                
                if (response.ok) {
                    this.showNotification(`Conversion started for ${video.title || video.originalName}`, 'success');
                } else {
                    this.showNotification(`Failed to convert ${video.title || video.originalName}`, 'error');
                }
            }
            
            // Refresh video list after conversion
            setTimeout(() => this.loadVideos(), 2000);
            
        } catch (error) {
            console.error('Error converting videos:', error);
            this.showNotification('Error converting videos', 'error');
        }
    }

    getSelectedVideos() {
        const checkboxes = document.querySelectorAll('.video-checkbox:checked');
        const selectedVideos = [];
        
        checkboxes.forEach(checkbox => {
            const videoId = checkbox.dataset.videoId;
            const video = this.videos.find(v => v._id === videoId);
            if (video) {
                selectedVideos.push(video);
            }
        });
        
        return selectedVideos;
    }

    updateDeleteButton() {
        const selectedCount = document.querySelectorAll('.video-checkbox:checked').length;
        const deleteBtn = document.getElementById('deleteVideoBtn');
        
        if (selectedCount > 0) {
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = `<i class="material-icons">delete</i> Delete (${selectedCount})`;
        } else {
            deleteBtn.disabled = true;
            deleteBtn.innerHTML = `<i class="material-icons">delete</i> Delete Selected`;
        }
    }

    async deleteSelectedVideos() {
        const selectedVideos = this.getSelectedVideos();
        
        if (selectedVideos.length === 0) {
            this.showNotification('Please select at least one video to delete', 'error');
            return;
        }
        
        // Confirm deletion
        const confirmDelete = confirm(`Are you sure you want to delete ${selectedVideos.length} video(s)?`);
        if (!confirmDelete) return;
        
        try {
            this.showNotification('Deleting videos...', 'info');
            
            for (const video of selectedVideos) {
                const response = await fetch(`/api/files/${video._id}`, {
                    method: 'DELETE',
                    headers: {
                        'x-auth-token': localStorage.getItem('token')
                    }
                });
                
                if (response.ok) {
                    this.showNotification(`Deleted: ${video.title || video.originalName}`, 'success');
                } else {
                    this.showNotification(`Failed to delete: ${video.title || video.originalName}`, 'error');
                }
            }
            
            // Refresh video list
            await this.loadVideos();
            
            // Clear selection
            document.querySelectorAll('.video-checkbox').forEach(cb => {
                cb.checked = false;
            });
            this.updateDeleteButton();
            
        } catch (error) {
            console.error('Error deleting videos:', error);
            this.showNotification('Error deleting videos', 'error');
        }
    }

    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Initialize video player when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if video elements exist
    if (document.getElementById('videoPlayer')) {
        window.videoPlayer = new VideoPlayer();
    }
});
