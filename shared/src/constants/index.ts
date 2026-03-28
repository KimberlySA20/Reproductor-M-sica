export const MEDIA_TYPES = {
  AUDIO: 'audio',
  VIDEO: 'video',
} as const;

export const SUPPORTED_AUDIO_FORMATS = [
  'mp3',
  'wav',
  'ogg',
  'aac',
  'm4a',
  'webm',
  'flac',
] as const;

export const SUPPORTED_VIDEO_FORMATS = [
  'mp4',
  'webm',
  'ogg',
  'avi',
  'mov',
  'wmv',
  'mkv',
] as const;

export const CONVERSION_FORMATS = {
  AUDIO: ['mp3', 'wav', 'aac', 'ogg'],
  VIDEO: ['mp4', 'webm'],
} as const;

export const MAX_FILE_SIZES = {
  AUDIO: 50 * 1024 * 1024, // 50MB
  VIDEO: 100 * 1024 * 1024, // 100MB
} as const;

export const HTTP_STATUS = {
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
} as const;

export const WORKER_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
} as const;

export const CONVERSION_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;
