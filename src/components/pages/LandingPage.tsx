import React, { useState, useCallback, useEffect } from 'react';
import { Upload, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import FileUpload from '@/components/FileUpload';
import { SimpleVoiceAssistant } from '@/components/voice/SimpleVoiceAssistant';
import { toast } from 'sonner';

interface LandingPageProps {
  onFileUpload: (files: FileList) => void;
  onNavigateToAuth: () => void;
  onNavigateToFileList?: () => void;
  onNavigateToVoiceTest?: () => void;
  onUploadSuccess?: () => void;
  isAuthenticated?: boolean;
  user?: any;
  onLogout?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onFileUpload,
  onNavigateToAuth,
  onNavigateToFileList,
  onNavigateToVoiceTest,
  onUploadSuccess,
  isAuthenticated = false,
  user,
  onLogout
}) => {
  console.log('🏠 LandingPage component rendered');
  const [isDragOver, setIsDragOver] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Debug showUpload state changes
  useEffect(() => {
    console.log('📊 showUpload state changed to:', showUpload);
    if (showUpload) {
      console.trace('📍 showUpload set to true - call stack:');
    }
  }, [showUpload]);

  // Voice command handler for file attachment
  const handleVoiceFileAttach = useCallback(() => {
    console.log('📁 Voice command: Attach file triggered from LandingPage');
    console.trace('📍 Call stack for file attach');

    // Directly trigger the file input to open file manager
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
      toast.success('Voice command activated: Opening file manager');
    } else {
      // Fallback to showing upload component
      setShowUpload(true);
      toast.success('Voice command activated: Opening file upload');
    }
  }, []);

  // Check if speech recognition is supported (for the new voice assistant)
  const isSupported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      console.log('📁 Files dropped:', files.length);
      const filesArray = Array.from(files);
      setSelectedFiles(filesArray);
      // Show upload component when files are dropped
      setShowUpload(true);
      toast.success(`Dropped ${files.length} file(s) for upload`);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      console.log('📁 Files selected via file input:', e.target.files.length);
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(filesArray);
      // Show upload component when files are selected
      setShowUpload(true);
      toast.success(`Selected ${e.target.files.length} file(s) for upload`);
    }
  };

  const handleUploadSuccess = (result: any) => {
    console.log('Upload successful:', result);
    // Use the provided upload success handler or fallback to file list navigation
    if (onUploadSuccess) {
      onUploadSuccess();
    } else {
      onNavigateToFileList?.();
    }
  };

  const handleUploadError = (error: string) => {
    console.error('Upload failed:', error);
    // Stay on the page to allow retry
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        isAuthenticated={isAuthenticated}
        user={user}
        onLogout={onLogout}
        onNavigateToAuth={onNavigateToAuth}
        onNavigateToDashboard={onNavigateToFileList}
      />
      
      {/* Main Content */}
      <div className="flex flex-col items-center  px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16 max-w-4xl">
          <h1 className="text-6xl lg:text-7xl font-bold text-black mb-4 leading-tight">
            Send it. Own it. On Chain
          </h1>
          <p className="text-xl text-gray-600 font-medium">
            Powered by Sui
          </p>
        </div>

        {/* Upload Section */}
        <div className="w-full max-w-lg">
          {!showUpload ? (
            <div
              className={`relative border-2 border-dashed rounded-2xl p-16 text-center transition-all duration-200 ${
                isDragOver
                  ? 'border-black bg-gray-100'
                  : 'border-gray-300 bg-white hover:border-gray-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center gap-4">
                {/* Hidden file input - only triggered by the upload button */}
                <input
                  type="file"
                  multiple
                  onChange={handleFileInputChange}
                  className="hidden"
                  id="file-upload"
                />

                <Button
                  asChild
                  className="bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2"
                >
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <ImageIcon className="w-4 h-4" />
                    Upload File
                  </label>
                </Button>

                {/* Simple Voice Assistant */}
                {isSupported && (
                  <div className="flex flex-col items-center gap-2 mt-2">
                    <SimpleVoiceAssistant
                      onFileAttachCommand={handleVoiceFileAttach}
                    />
                    {onNavigateToVoiceTest && (
                      <Button
                        onClick={onNavigateToVoiceTest}
                        variant="ghost"
                        size="sm"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        🎤 Test Voice Commands
                      </Button>
                    )}
                  </div>
                )}

                <p className="text-gray-600 text-sm">
                  {isSupported
                    ? 'or drag and drop a file, or use voice commands'
                    : 'or drag and drop a file'
                  }
                </p>
              </div>
            </div>
          ) : (
            
              <FileUpload
                onUploadSuccess={handleUploadSuccess}
                onUploadError={handleUploadError}
                initialFiles={selectedFiles}
              />
            
          )}
        </div>
      </div>
    </div>
  );
};