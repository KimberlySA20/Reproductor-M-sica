import { Request } from 'express';

export interface User {
  _id: string;
  id: string;
  email: string;
  password: string;
  username?: string;
  files: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MediaFile {
  _id: string;
  title: string;
  artist: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  duration?: number;
  filePath: string;
  convertedPath?: string;
  thumbnailPath?: string;
  mediaType: 'audio' | 'video';
  uploadedBy: string;
  isPublic: boolean;
  tags?: string[];
  playCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthToken {
  token: string;
  user: Omit<User, 'password'>;
}

export interface AuthRequest extends Request {
  user?: User;
  query: any;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface UploadResponse {
  file: MediaFile;
  message: string;
}

export interface ConversionJob {
  _id: string;
  inputFile: string;
  outputFile: string;
  format: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkerInfo {
  _id: string;
  host: string;
  port: number;
  status: 'online' | 'offline';
  load: number;
  capabilities: string[];
  lastSeen: Date;
  createdAt: Date;
}

export interface StreamRequest {
  fileId: string;
  range?: string;
  quality?: 'low' | 'medium' | 'high';
}

export interface Playlist {
  _id: string;
  name: string;
  description?: string;
  files: string[];
  createdBy: string;
  isPublic: boolean;
  coverImage?: string;
  duration?: number;
  createdAt: Date;
  updatedAt: Date;
}
