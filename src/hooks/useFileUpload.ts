import { useState } from 'react';
import { FileUpload } from '@/types';

export const useFileUpload = () => {
  const [uploadedFiles, setUploadedFiles] = useState<FileUpload[]>([]);

  const addFiles = (fileList: FileList) => {
    const newFiles: FileUpload[] = Array.from(fileList).map((file, index) => ({
      id: `${Date.now()}-${index}`,
      name: file.name,
      type: getFileType(file.type),
      size: file.size,
      url: URL.createObjectURL(file)
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  const getFileType = (mimeType: string): FileUpload['type'] => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('video/')) return 'video';
    return 'document';
  };

  const clearFiles = () => {
    setUploadedFiles([]);
  };

  return {
    uploadedFiles,
    addFiles,
    clearFiles
  };
};