/**
 * Test page for demonstrating the new Seal encryption functionality
 * This page shows the enhanced FileUpload component with encryption features
 */

import React, { useState } from 'react';
import { ArrowLeft, FileText, Shield, Download, Play, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import FileUpload from '@/components/FileUpload';
import { Header } from '@/components/layout/Header';
import { runAllEncryptionTests } from '@/utils/encryptionTestUtils';

interface EncryptionTestPageProps {
  onBack?: () => void;
}

interface UploadedFileInfo {
  cid: string;
  filename: string;
  fileSize: number;
  uploadTimestamp: number;
  contentType: string;
  isEncrypted?: boolean;
  encryptionKeys?: {
    publicKey: string;
    secretKey: string;
  };
}

export const EncryptionTestPage: React.FC<EncryptionTestPageProps> = ({ onBack }) => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileInfo[]>([]);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [testResults, setTestResults] = useState<any>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  const handleUploadSuccess = (result: any) => {
    console.log('Upload successful:', result);
    setUploadStatus('Upload completed successfully!');

    // Note: Files are now managed by backend, no localStorage needed
    // The FileList component will automatically refresh from backend
  };

  const handleUploadError = (error: string) => {
    console.error('Upload failed:', error);
    setUploadStatus(`Upload failed: ${error}`);
  };

  const handleRunTests = async () => {
    setIsRunningTests(true);
    setTestResults(null);

    try {
      const results = await runAllEncryptionTests();
      setTestResults(results);
    } catch (error) {
      setTestResults({
        success: false,
        results: [],
        summary: `Test execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsRunningTests(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  // Note: Files are now managed by backend, no localStorage needed
  // The FileList component handles file fetching from backend
  React.useEffect(() => {
    // No longer loading from localStorage
    setUploadedFiles([]);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          {onBack && (
            <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          )}
          <div>
            <h1 className="text-3xl font-bold">Encryption Test Page</h1>
            <p className="text-gray-600 mt-2">
              Test the new client-side Seal encryption functionality
            </p>
          </div>
        </div>

        {/* Status Alert */}
        {uploadStatus && (
          <Alert className="mb-6">
            <AlertDescription>{uploadStatus}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Enhanced File Upload
              </CardTitle>
              <CardDescription>
                Upload files with automatic client-side Seal encryption
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileUpload
                onUploadSuccess={handleUploadSuccess}
                onUploadError={handleUploadError}
              />
            </CardContent>
          </Card>

          {/* Uploaded Files List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Uploaded Files
              </CardTitle>
              <CardDescription>
                Files uploaded in this session
              </CardDescription>
            </CardHeader>
            <CardContent>
              {uploadedFiles.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No files uploaded yet
                </div>
              ) : (
                <div className="space-y-4">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{file.filename}</h4>
                            {file.isEncrypted && (
                              <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                                <Shield className="w-3 h-3 mr-1" />
                                Encrypted
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p><strong>Size:</strong> {formatFileSize(file.fileSize)}</p>
                            <p><strong>CID:</strong> <code className="text-xs">{file.cid}</code></p>
                            <p><strong>Uploaded:</strong> {formatDate(file.uploadTimestamp)}</p>
                            {file.isEncrypted && file.encryptionKeys && (
                              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                                <p className="text-xs font-medium text-yellow-800 mb-1">Encryption Keys:</p>
                                <p className="text-xs text-yellow-700">
                                  <strong>Secret:</strong> <code>{file.encryptionKeys.secretKey}</code>
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="ml-4">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Encryption Tests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="w-5 h-5" />
                Encryption Tests
              </CardTitle>
              <CardDescription>
                Run automated tests to verify encryption functionality
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button
                  onClick={handleRunTests}
                  disabled={isRunningTests}
                  className="w-full"
                >
                  {isRunningTests ? (
                    <>
                      <Play className="w-4 h-4 mr-2 animate-spin" />
                      Running Tests...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Run All Tests
                    </>
                  )}
                </Button>

                {testResults && (
                  <div className="space-y-3">
                    <Alert className={testResults.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                      <AlertDescription>
                        <div className="flex items-center gap-2">
                          {testResults.success ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                          <span className={testResults.success ? "text-green-800" : "text-red-800"}>
                            {testResults.summary}
                          </span>
                        </div>
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                      {testResults.results.map((result: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded">
                          <span className="text-sm font-medium">{result.test}</span>
                          <div className="flex items-center gap-2">
                            {result.success ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600" />
                            )}
                            <span className={`text-xs ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                              {result.success ? 'PASS' : 'FAIL'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Information Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">🔐 With Encryption Enabled:</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                  <li>File is encrypted client-side using Seal encryption</li>
                  <li>Encrypted file is uploaded to Walrus storage</li>
                  <li>Encryption keys are generated and displayed</li>
                  <li>Original file never leaves your device unencrypted</li>
                </ol>
              </div>
              <div>
                <h4 className="font-semibold mb-2">📁 Without Encryption:</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                  <li>File is uploaded directly to Walrus storage</li>
                  <li>No encryption keys are generated</li>
                  <li>File is stored in its original format</li>
                  <li>Standard upload process (existing functionality)</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EncryptionTestPage;
