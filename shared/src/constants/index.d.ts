export declare const MEDIA_TYPES: {
    readonly AUDIO: "audio";
    readonly VIDEO: "video";
};
export declare const SUPPORTED_AUDIO_FORMATS: readonly ["mp3", "wav", "ogg", "aac", "m4a", "webm", "flac"];
export declare const SUPPORTED_VIDEO_FORMATS: readonly ["mp4", "webm", "ogg", "avi", "mov", "wmv", "mkv"];
export declare const CONVERSION_FORMATS: {
    readonly AUDIO: readonly ["mp3", "wav", "aac", "ogg"];
    readonly VIDEO: readonly ["mp4", "webm"];
};
export declare const MAX_FILE_SIZES: {
    readonly AUDIO: number;
    readonly VIDEO: number;
};
export declare const HTTP_STATUS: {
    readonly OK: 200;
    readonly CREATED: 201;
    readonly NO_CONTENT: 204;
    readonly BAD_REQUEST: 400;
    readonly UNAUTHORIZED: 401;
    readonly FORBIDDEN: 403;
    readonly NOT_FOUND: 404;
    readonly CONFLICT: 409;
    readonly UNPROCESSABLE_ENTITY: 422;
    readonly TOO_MANY_REQUESTS: 429;
    readonly INTERNAL_SERVER_ERROR: 500;
};
export declare const WORKER_STATUS: {
    readonly ONLINE: "online";
    readonly OFFLINE: "offline";
};
export declare const CONVERSION_STATUS: {
    readonly PENDING: "pending";
    readonly PROCESSING: "processing";
    readonly COMPLETED: "completed";
    readonly FAILED: "failed";
};
//# sourceMappingURL=index.d.ts.map