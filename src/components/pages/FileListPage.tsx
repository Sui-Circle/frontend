import React from 'react';
import { Header } from '@/components/layout/Header';
import FileList from '@/components/FileList';

interface FileListPageProps {
  isAuthenticated?: boolean;
  user?: any;
  onLogout?: () => void;
  onNavigateToTransfer?: () => void;
  onNavigateToUpload?: () => void;
}

export const FileListPage: React.FC<FileListPageProps> = ({
  isAuthenticated = false,
  user,
  onLogout
}) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        isAuthenticated={isAuthenticated}
        user={user}
        onLogout={onLogout}
      />
      
      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-black mb-4">
            Your Files
          </h1>
          <p className="text-lg text-gray-600">
            Manage your uploaded files and initiate transfers
          </p>
        </div>

        

        {/* File List Component */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <FileList />
        </div>
      </div>
    </div>
  );
};