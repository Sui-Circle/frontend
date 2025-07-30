import React from 'react';
import { FileUpload } from '@/types';
import { FileIcon, Music, Video, Image as ImageIcon } from 'lucide-react';

interface FileListProps {
  files: FileUpload[];
}

const getFileIcon = (type: FileUpload['type']) => {
  switch (type) {
    case 'image':
      return <ImageIcon className="w-5 h-5 text-blue-600" />;
    case 'audio':
      return <Music className="w-5 h-5 text-green-600" />;
    case 'video':
      return <Video className="w-5 h-5 text-red-600" />;
    default:
      return <FileIcon className="w-5 h-5 text-gray-600" />;
  }
};

export const FileList: React.FC<FileListProps> = ({ files }) => {
  return (
    <div className="space-y-3">
      {files.map((file) => (
        <div
          key={file.id}
          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            {getFileIcon(file.type)}
            <span className="text-sm font-medium text-gray-900">
              {file.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </span>
            {getFileIcon(file.type)}
          </div>
        </div>
      ))}
    </div>
  );
};