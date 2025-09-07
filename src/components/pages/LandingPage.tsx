import React, { useState, useCallback, useEffect } from 'react';
import { Upload, ImageIcon, Plus, X, Copy, Check, ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { FileUpload } from '@/components/dashboard';
import { accessControlService } from '../../services/accessControlService';
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

interface UploadedFileInfo {
  cid: string;
  filename: string;
  fileSize: number;
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
  console.log('🏠 LandingPage component rendered', { isAuthenticated, user });
  
  const [isDragOver, setIsDragOver] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showAccessControl, setShowAccessControl] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<UploadedFileInfo | null>(null);
  
  // Access control form state
  const [walletAddresses, setWalletAddresses] = useState<string[]>(['']);
  const [maxAccessCount, setMaxAccessCount] = useState<number | ''>('');
  const [isCreatingAccessControl, setIsCreatingAccessControl] = useState(false);
  const [generatedShareLink, setGeneratedShareLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [currentStep, setCurrentStep] = useState<'upload' | 'access-control' | 'success'>('upload');

  // Animation states
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Debug showUpload state changes
  useEffect(() => {
    console.log('📊 showUpload state changed to:', showUpload);
    if (showUpload) {
      console.trace('📍 showUpload set to true - call stack:');
    }
  }, [showUpload]);

  //  // Check if speech recognition is supported
  //  const isSupported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;

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

  const transitionToStep = (step: 'upload' | 'access-control' | 'success') => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentStep(step);
      setIsTransitioning(false);
    }, 300);
  };

  const handleUploadSuccess = (result: any) => {
    console.log('🎉 handleUploadSuccess called with result:', result);
    console.log('🔍 Result structure:', JSON.stringify(result, null, 2));
    
    // Extract file info from upload result
    if (result && result.success && result.data && result.data.fileCid) {
      console.log('✅ Result has CID, proceeding to access control step...', result.data.fileCid);
      const fileInfo = {
        cid: result.data.fileCid,
        filename: selectedFiles[0]?.name || 'Unknown file',
        fileSize: selectedFiles[0]?.size || 0
      };
      setUploadedFile(fileInfo);
      
      // Hide upload component and show access control step
      setShowUpload(false);
      setShowAccessControl(true);
      transitionToStep('access-control');
      
      toast.success('File uploaded successfully! Please configure access control.');
    } else {
      console.log('❌ Result missing CID, cannot proceed with flow');
      console.log('🔍 Available result keys:', result ? Object.keys(result) : 'result is null/undefined');
      toast.error('Upload succeeded but missing file information. Please try again.');
    }
  };

  const handleUploadError = (error: string) => {
    console.error('Upload failed:', error);
    // Stay on the page to allow retry
  };

  // Wallet address management
  const addWalletAddress = () => {
    setWalletAddresses([...walletAddresses, '']);
  };

  const removeWalletAddress = (index: number) => {
    if (walletAddresses.length > 1) {
      setWalletAddresses(walletAddresses.filter((_, i) => i !== index));
    }
  };

  const updateWalletAddress = (index: number, value: string) => {
    const newAddresses = [...walletAddresses];
    newAddresses[index] = value;
    setWalletAddresses(newAddresses);
  };

  const validateWalletAddress = (address: string): boolean => {
    // Allow empty addresses (for open access) or valid Sui addresses
    const trimmed = address.trim();
    console.log('🔍 Validating address:', trimmed);
    
    if (trimmed === '') {
      console.log('✅ Empty address (open access)');
      return false; // Empty addresses are not valid for our current use case
    }
    
    // Sui addresses can be 40-66 characters after 0x
    const isValid = /^0x[a-fA-F0-9]{40,66}$/i.test(trimmed);
    console.log('✅ Address valid:', isValid);
    return isValid;
  };

  const handleCreateAccessControl = async () => {
    console.log('🚀 Create Access Control button clicked!');
    console.log('📁 Uploaded file:', uploadedFile);
    console.log('💰 Wallet addresses:', walletAddresses);
    
    if (!uploadedFile) {
      console.log('❌ No uploaded file');
      return;
    }

    // Validate wallet addresses
    const validAddresses = walletAddresses.filter(addr => validateWalletAddress(addr));
    console.log('✅ Valid addresses:', validAddresses);
    
    // Check if there are any non-empty addresses that are invalid
    const nonEmptyAddresses = walletAddresses.filter(addr => addr.trim() !== '');
    const invalidAddresses = nonEmptyAddresses.filter(addr => !validateWalletAddress(addr));
    
    if (invalidAddresses.length > 0) {
      console.log('❌ Invalid addresses found:', invalidAddresses);
      toast.error('Please enter valid wallet addresses or leave empty for open access');
      return;
    }
    
    console.log('🎯 Proceeding with addresses:', validAddresses.length > 0 ? validAddresses : 'Open access');

    console.log('🔄 Starting access control creation...');
    setIsCreatingAccessControl(true);

    try {
      // Create access control
      const accessControlData = {
        fileCid: uploadedFile.cid,
        accessRule: {
          conditionType: 'wallet' as const,
          allowedAddresses: validAddresses,
          maxAccessCount: maxAccessCount || undefined,
        }
      };

      console.log('📤 Sending access control data:', accessControlData);
      const result = await accessControlService.createAccessControl(
        user?.address || null,
        accessControlData,
        false // useTestMode - adjust as needed
      );

      console.log('📨 Access control result:', result);
      if (!result.success) {
        throw new Error(result.message);
      }

      // Generate share link
      console.log('🔗 Generating share link...');
      const linkResult = await accessControlService.generateShareLink(
        user?.address || null,
        {
          fileCid: uploadedFile.cid,
          expirationTime: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days from now
          maxUses: maxAccessCount || 100,
        },
        false // useTestMode
      );

      console.log('🔗 Share link result:', linkResult);
      if (linkResult.success && linkResult.data?.shareLink) {
        setGeneratedShareLink(linkResult.data.shareLink);
        console.log('✅ Transitioning to success step...');
        transitionToStep('success');
        toast.success('Access control created successfully!');
      } else {
        console.log('⚠️ Share link generation failed, but proceeding to success');
        toast.success('Access control created, but failed to generate share link');
        transitionToStep('success');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create access control';
      toast.error(errorMessage);
    } finally {
      setIsCreatingAccessControl(false);
    }
  };

  const copyShareLink = async () => {
    if (generatedShareLink) {
      try {
        await navigator.clipboard.writeText(generatedShareLink);
        setLinkCopied(true);
        toast.success('Share link copied to clipboard!');
        
        // Reset the copied state after 2 seconds
        setTimeout(() => setLinkCopied(false), 2000);
      } catch (error) {
        toast.error('Failed to copy link to clipboard');
      }
    }
  };

  const resetForm = () => {
    setShowUpload(false);
    setShowAccessControl(false);
    setUploadedFile(null);
    setSelectedFiles([]);
    setWalletAddresses(['']);
    setMaxAccessCount('');
    setGeneratedShareLink(null);
    setLinkCopied(false);
    setCurrentStep('upload');
  };

  const goBack = () => {
    if (currentStep === 'access-control') {
      transitionToStep('upload');
      setShowAccessControl(false);
      setShowUpload(false);
    } else if (currentStep === 'success') {
      transitionToStep('access-control');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <Header
        isAuthenticated={isAuthenticated}
        user={user}
        onLogout={onLogout}
        onNavigateToAuth={onNavigateToAuth}
        onNavigateToDashboard={onNavigateToFileList}
      />
      
      {/* Main Content */}
      <div className="flex flex-col items-center px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        {/* Hero Section */}
        <div className={`text-center mb-8 sm:mb-12 lg:mb-16 max-w-4xl transition-all duration-500 ${
          currentStep !== 'upload' ? 'transform -translate-y-4 scale-95 opacity-60' : ''
        }`}>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-black mb-4 leading-tight">
            Send it. Own it. On Chain
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 font-medium">
            Powered by Sui
          </p>
        </div>

        {/* Progress Indicator */}
        {(showUpload || showAccessControl || currentStep !== 'upload') && (
          <div className="w-full max-w-lg mb-6 sm:mb-8">
            <div className="flex items-center justify-center space-x-2 sm:space-x-4">
              <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
                currentStep === 'upload' ? 'bg-black' : 'bg-gray-300'
              }`} />
              <div className={`w-8 sm:w-12 h-0.5 transition-all duration-300 ${
                currentStep === 'access-control' || currentStep === 'success' ? 'bg-black' : 'bg-gray-300'
              }`} />
              <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
                currentStep === 'access-control' ? 'bg-black' : currentStep === 'success' ? 'bg-green-500' : 'bg-gray-300'
              }`} />
              <div className={`w-8 sm:w-12 h-0.5 transition-all duration-300 ${
                currentStep === 'success' ? 'bg-green-500' : 'bg-gray-300'
              }`} />
              <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
                currentStep === 'success' ? 'bg-green-500' : 'bg-gray-300'
              }`} />
            </div>
            <div className="flex justify-between text-xs sm:text-sm text-gray-500 mt-2">
              <span>Upload</span>
              <span>Access Control</span>
              <span>Share</span>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className={`w-full max-w-lg transition-all duration-500 ${isTransitioning ? 'opacity-0 transform scale-95' : 'opacity-100 transform scale-100'}`}>
          
          {/* Initial Upload Section */}
          {currentStep === 'upload' && !showUpload && (
            <div
              className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 lg:p-16 text-center transition-all duration-300 transform hover:scale-[1.02] ${
                isDragOver
                  ? 'border-black bg-gradient-to-br from-black/5 to-black/10 shadow-lg'
                  : 'border-gray-300 bg-white/80 backdrop-blur-sm hover:border-gray-400 hover:shadow-md'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center gap-4 sm:gap-6">
                {/* Animated upload icon */}
                <div className="relative">
                  <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-r from-black to-gray-700 flex items-center justify-center transition-all duration-300 ${
                    isDragOver ? 'scale-110 rotate-12' : ''
                  }`}>
                    <ImageIcon className={`w-6 h-6 sm:w-8 sm:h-8 text-white transition-all duration-300 ${
                      isDragOver ? 'scale-110' : ''
                    }`} />
                  </div>
                  {isDragOver && (
                    <div className="absolute -inset-2 bg-black/20 rounded-full animate-pulse" />
                  )}
                </div>

                {/* Hidden file input */}
                <input
                  type="file"
                  multiple
                  onChange={handleFileInputChange}
                  className="hidden"
                  id="file-upload"
                />

                <Button
                  asChild
                  className="bg-black hover:bg-gray-800 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-medium flex items-center gap-2 transition-all duration-300 hover:scale-105 hover:shadow-lg"
                >
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                    Upload File
                  </label>
                </Button>

                <p className="text-gray-600 text-sm sm:text-base max-w-xs">
                 or drag and drop a file
                </p>
              </div>

              {/* Animated background elements */}
              <div className="absolute top-4 right-4 w-2 h-2 bg-black/10 rounded-full animate-pulse" />
              <div className="absolute bottom-4 left-4 w-1 h-1 bg-black/10 rounded-full animate-pulse delay-1000" />
            </div>
          )}
            
          {/* File Upload Component */}
          {showUpload && currentStep === 'upload' && (
            <div className="transform transition-all duration-500 animate-in fade-in slide-in-from-bottom-4">
              <FileUpload
                onUploadSuccess={handleUploadSuccess}
                onUploadError={handleUploadError}
                initialFiles={selectedFiles}
              />
            </div>
          )}

          {/* Access Control Settings */}
          {currentStep === 'access-control' && uploadedFile && (
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-xl border border-white/20 transform transition-all duration-500 animate-in fade-in slide-in-from-right-4">
              
              {/* Header with back button */}
              <div className="flex items-center gap-3 mb-6">
                <Button
                  onClick={goBack}
                  variant="ghost"
                  size="sm"
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div className="flex-1">
                  <h2 className="text-xl sm:text-2xl font-bold text-black mb-1">Access Control Settings</h2>
                  <p className="text-gray-600 text-sm sm:text-base">Configure permissions for "{uploadedFile.filename}"</p>
                </div>
              </div>

              {/* File Info Card */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 truncate max-w-48">{uploadedFile.filename}</p>
                    <p className="text-sm text-gray-500">{formatFileSize(uploadedFile.fileSize)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {/* Access Control Type - Fixed to Wallet */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Access Control Type
                  </label>
                  <div className="px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-600 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Wallet Addresses
                  </div>
                </div>

                {/* Wallet Addresses */}
                 <div className="space-y-3">
                   <label className="block text-sm font-medium text-gray-700">
                     Wallet Addresses
                   </label>
                   <p className="text-xs text-gray-500">Leave empty for open access, or enter wallet addresses to restrict access</p>
                  <div className="space-y-3">
                    {walletAddresses.map((address, index) => (
                      <div key={index} className="group">
                        <div className="flex gap-2">
                          <div className="flex-1 relative">
                            <input
                              type="text"
                              value={address}
                              onChange={(e) => updateWalletAddress(index, e.target.value)}
                              placeholder="0x..."
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-200 text-sm sm:text-base"
                            />
                            {address && validateWalletAddress(address) && (
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                <Check className="w-4 h-4 text-green-500" />
                              </div>
                            )}
                          </div>
                          {walletAddresses.length > 1 && (
                            <Button
                              onClick={() => removeWalletAddress(index)}
                              variant="ghost"
                              size="sm"
                              className="p-3 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all duration-200"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button
                    onClick={addWalletAddress}
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all duration-200"
                  >
                    <Plus className="w-4 h-4" />
                    Add another wallet
                  </Button>
                </div>

                {/* Maximum Access Count */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Maximum Access Count (Optional)
                  </label>
                  <input
                    type="number"
                    value={maxAccessCount}
                    onChange={(e) => setMaxAccessCount(e.target.value ? parseInt(e.target.value) : '')}
                    placeholder="Leave empty for unlimited"
                    min="1"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-200 text-sm sm:text-base"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button
                    onClick={handleCreateAccessControl}
                    disabled={isCreatingAccessControl || walletAddresses.some(addr => addr.trim() !== '' && !validateWalletAddress(addr))}
                    className="flex-1 bg-black hover:bg-gray-800 text-white py-3 rounded-xl font-medium transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreatingAccessControl ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Creating...
                      </div>
                    ) : (
                      'Create Access Control'
                    )}
                  </Button>
                  <Button
                    onClick={resetForm}
                    variant="outline"
                    className="px-6 py-3 rounded-xl border-gray-200 hover:bg-gray-50 transition-all duration-200"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Success Page */}
          {currentStep === 'success' && (
            <div className="text-center space-y-6 transform transition-all duration-500 animate-in fade-in slide-in-from-bottom-4">
              
              {/* Success Animation */}
              <div className="relative mx-auto w-20 h-20 sm:w-24 sm:h-24">
                <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-green-600 rounded-full animate-pulse" />
                <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                  <Check className="w-8 h-8 sm:w-10 sm:h-10 text-green-500" />
                </div>
                <div className="absolute -inset-4 bg-green-400/20 rounded-full animate-ping" />
              </div>

              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-xl border border-white/20">
                <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-xl p-4 sm:p-6 mb-6">
                  <h3 className="text-lg sm:text-xl font-semibold text-green-800 mb-2 flex items-center gap-2 justify-center">
                    <Sparkles className="w-5 h-5" />
                    Access Control Created Successfully!
                  </h3>
                  <p className="text-green-700 text-sm sm:text-base">
                    Your file is now protected and a share link has been generated.
                  </p>
                </div>

                {generatedShareLink && (
                  <div className="bg-gray-50 rounded-xl p-4 sm:p-6 mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Share Link
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={generatedShareLink}
                        readOnly
                        className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-mono break-all"
                      />
                      <Button
                        onClick={copyShareLink}
                        variant="outline"
                        size="sm"
                        className={`px-4 py-3 rounded-xl transition-all duration-200 ${
                          linkCopied ? 'bg-green-50 border-green-200 text-green-700' : 'hover:bg-gray-50'
                        }`}
                      >
                        {linkCopied ? (
                          <div className="flex items-center gap-1">
                            <Check className="w-4 h-4" />
                            <span className="hidden sm:inline">Copied!</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Copy className="w-4 h-4" />
                            <span className="hidden sm:inline">Copy</span>
                          </div>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={() => onNavigateToFileList?.()}
                    className="flex-1 bg-black hover:bg-gray-800 text-white py-3 rounded-xl font-medium transition-all duration-300 hover:scale-[1.02]"
                  >
                    View All Files
                  </Button>
                  <Button
                    onClick={resetForm}
                    variant="outline"
                    className="px-6 py-3 rounded-xl border-gray-200 hover:bg-gray-50 transition-all duration-200"
                  >
                    Upload Another
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};