"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONVERSION_STATUS = exports.WORKER_STATUS = exports.HTTP_STATUS = exports.MAX_FILE_SIZES = exports.CONVERSION_FORMATS = exports.SUPPORTED_VIDEO_FORMATS = exports.SUPPORTED_AUDIO_FORMATS = exports.MEDIA_TYPES = void 0;
exports.MEDIA_TYPES = {
    AUDIO: 'audio',
    VIDEO: 'video',
};
exports.SUPPORTED_AUDIO_FORMATS = [
    'mp3',
    'wav',
    'ogg',
    'aac',
    'm4a',
    'webm',
    'flac',
];
exports.SUPPORTED_VIDEO_FORMATS = [
    'mp4',
    'webm',
    'ogg',
    'avi',
    'mov',
    'wmv',
    'mkv',
];
exports.CONVERSION_FORMATS = {
    AUDIO: ['mp3', 'wav', 'aac', 'ogg'],
    VIDEO: ['mp4', 'webm'],
};
exports.MAX_FILE_SIZES = {
    AUDIO: 50 * 1024 * 1024, // 50MB
    VIDEO: 100 * 1024 * 1024, // 100MB
};
exports.HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
};
exports.WORKER_STATUS = {
    ONLINE: 'online',
    OFFLINE: 'offline',
};
exports.CONVERSION_STATUS = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
};
//# sourceMappingURL=index.js.map