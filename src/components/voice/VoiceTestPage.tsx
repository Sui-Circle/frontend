import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { VoiceCommandButton } from './VoiceCommandButton';
import { VoiceDebugTest } from './VoiceDebugTest';
import { Mic, FileText, Upload, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { toast } from 'sonner';

export const VoiceTestPage: React.FC = () => {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileAttachCommand = () => {
    console.log('Voice command: File attach triggered');
    setTestResults(prev => [...prev, `✅ Voice command executed at ${new Date().toLocaleTimeString()}`]);
    
    // Trigger file input
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
    
    toast.success('Voice command executed: Opening file browser');
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setSelectedFiles(files);
      setTestResults(prev => [...prev, `📁 Selected ${files.length} file(s): ${Array.from(files).map(f => f.name).join(', ')}`]);
      toast.success(`Selected ${files.length} file(s)`);
    }
  };

  const clearResults = () => {
    setTestResults([]);
    setSelectedFiles(null);
  };

  const testSpeechSynthesis = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance('Voice commands are working correctly. You can now say "attach file" or "upload file" to open the file browser.');
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 0.8;
      window.speechSynthesis.speak(utterance);
      setTestResults(prev => [...prev, `🔊 Speech synthesis test completed at ${new Date().toLocaleTimeString()}`]);
    } else {
      toast.error('Speech synthesis not supported');
    }
  };

  const supportedCommands = [
    'attach file',
    'upload file', 
    'select file',
    'choose file',
    'browse files',
    'open file dialog',
    'add file',
    'upload document'
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Debug Test Component */}
      <VoiceDebugTest />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Voice Commands Test Page
          </CardTitle>
          <CardDescription>
            Test the real voice command functionality for file uploads
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Voice Command Button */}
          <div className="flex items-center gap-4">
            <VoiceCommandButton 
              onFileAttachCommand={handleFileAttachCommand}
              className="flex-shrink-0"
            />
            <div className="text-sm text-gray-600">
              Click "Enable Voice" then say one of the supported commands
            </div>
          </div>

          {/* Test Controls */}
          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={testSpeechSynthesis}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              🔊 Test Speech
            </Button>
            <Button 
              onClick={clearResults}
              variant="outline"
              size="sm"
            >
              Clear Results
            </Button>
          </div>

          {/* Supported Commands */}
          <div>
            <h3 className="text-sm font-medium mb-2">Supported Voice Commands:</h3>
            <div className="flex flex-wrap gap-2">
              {supportedCommands.map((command, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  "{command}"
                </Badge>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>How to use:</strong>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Click "Enable Voice" to start voice recognition</li>
                <li>Wait for the "Listening..." indicator</li>
                <li>Say one of the supported commands clearly</li>
                <li>The file browser should open automatically</li>
                <li>Select files to test the complete workflow</li>
              </ol>
            </AlertDescription>
          </Alert>

          {/* Browser Compatibility */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Browser Support:</strong> Voice commands work best in Chrome, Edge, and Safari. 
              Firefox may have limited support. Make sure to allow microphone access when prompted.
            </AlertDescription>
          </Alert>

          {/* Test Results */}
          {testResults.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">Test Results:</h3>
              <div className="bg-gray-50 p-3 rounded-md max-h-40 overflow-y-auto">
                {testResults.map((result, index) => (
                  <div key={index} className="text-sm py-1 border-b border-gray-200 last:border-b-0">
                    {result}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selected Files Display */}
          {selectedFiles && (
            <div>
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Selected Files:
              </h3>
              <div className="space-y-2">
                {Array.from(selectedFiles).map((file, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-green-50 rounded-md">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">{file.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {(file.size / 1024).toFixed(1)} KB
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            accept="*/*"
          />
        </CardContent>
      </Card>
    </div>
  );
};
