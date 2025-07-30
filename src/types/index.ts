export interface FileUpload {
  id: string;
  name: string;
  type: 'image' | 'audio' | 'video' | 'document';
  size: number;
  url?: string;
}

export interface TransferConfig {
  transferType: 'wallet' | 'nft' | 'sbt' | 'email';
  encryptionEnabled: boolean;
  recipient: string;
  title: string;
  message?: string;
  duration: '1 Day' | '3 Days' | '7 Days' | '30 Days';
}

export interface User {
  email?: string;
  isAuthenticated: boolean;
}