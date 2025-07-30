import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Volume2, FileText, Upload, Settings } from 'lucide-react';
import { useVoiceCommands } from '@/hooks/useVoiceCommands';
import { toast } from 'sonner';

export const VoiceCommandDemo: React.FC = () => {
  const [demoActions, setDemoActions] = useState<string[]>([]);

  // Demo action handlers
  const handleFileAttach = () => {
    const action = 'File browser opened';
    setDemoActions(prev => [...prev, action]);
    toast.success(action);
  };

  const handleFileUpload = () => {
    const action = 'File upload started';
    setDemoActions(prev => [...prev, action]);
    toast.success(action);
  };

  const handleSettings = () => {
    const action = 'Settings opened';
    setDemoActions(prev => [...prev, action]);
    toast.success(action);
  };

  const handleClearActions = () => {
    setDemoActions([]);
    toast.info('Demo actions cleared');
  };

  // Voice commands configuration
  const voiceCommands = [
    {
      command: 'attach file',
      action: handleFileAttach,
      description: 'Open file browser'
    },
    {
      command: 'upload file',
      action: handleFileUpload,
      description: 'Start file upload'
    },
    {
      command: 'select file',
      action: handleFileAttach,
      description: 'Open file browser'
    },
    {
      command: 'browse files',
      action: handleFileAttach,
      description: 'Open file browser'
    },
    {
      command: 'start upload',
      action: handleFileUpload,
      description: 'Begin upload process'
    },
    {
      command: 'open settings',
      action: handleSettings,
      description: 'Open settings panel'
    },
    {
      command: 'clear demo',
      action: handleClearActions,
      description: 'Clear demo actions'
    }
  ];

  const {
    isListening,
    isSupported,
    startListening,
    stopListening,
    toggleListening,
    speakText
  } = useVoiceCommands({
    commands: voiceCommands,
    enabled: true
  });

  const handleTestSpeech = () => {
    speakText('Voice commands are working! Try saying "attach file" or "upload file".');
  };

  if (!isSupported) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MicOff className="h-5 w-5 text-red-500" />
            Voice Commands Not Supported
          </CardTitle>
          <CardDescription>
            Your browser doesn't support speech recognition. Please use Chrome, Edge, or Safari.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Main Demo Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-blue-500" />
            Voice Commands Demo
          </CardTitle>
          <CardDescription>
            Test voice commands for file attachment functionality
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Control Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={toggleListening}
              variant={isListening ? "destructive" : "default"}
              className="flex items-center gap-2"
            >
              {isListening ? (
                <>
                  <MicOff className="h-4 w-4" />
                  Stop Listening
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4" />
                  Start Listening
                </>
              )}
            </Button>
            
            <Button
              onClick={handleTestSpeech}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Volume2 className="h-4 w-4" />
              Test Speech
            </Button>

            <Button
              onClick={handleClearActions}
              variant="outline"
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Clear Demo
            </Button>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2">
            <Badge variant={isListening ? "default" : "secondary"}>
              {isListening ? "🎤 Listening..." : "🔇 Not Listening"}
            </Badge>
            {isListening && (
              <span className="text-sm text-gray-600">
                Try saying one of the commands below
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Available Commands */}
      <Card>
        <CardHeader>
          <CardTitle>Available Voice Commands</CardTitle>
          <CardDescription>
            Say any of these commands while listening is active
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {voiceCommands.map((cmd, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                    "{cmd.command}"
                  </code>
                  <p className="text-xs text-gray-600 mt-1">{cmd.description}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={cmd.action}
                  className="ml-2"
                >
                  Test
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Demo Actions Log */}
      {demoActions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Demo Actions Log</CardTitle>
            <CardDescription>
              Actions triggered by voice commands or manual testing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {demoActions.map((action, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded"
                >
                  <Upload className="h-4 w-4 text-green-600" />
                  <span className="text-sm">{action}</span>
                  <Badge variant="outline" className="ml-auto">
                    #{index + 1}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            How to Use
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm space-y-2">
            <p><strong>1.</strong> Click "Start Listening" to activate voice recognition</p>
            <p><strong>2.</strong> Wait for the "Listening..." indicator</p>
            <p><strong>3.</strong> Say one of the available commands clearly</p>
            <p><strong>4.</strong> Watch for the action to be triggered</p>
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> For best results, speak clearly and wait a moment between commands.
              The system works best in quiet environments.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
