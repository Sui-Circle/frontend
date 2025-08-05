import React, { useState, useRef, useEffect } from 'react';

// Define types for Web Speech API if not available in TypeScript DOM lib
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, MicOff, FileText, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { logVoiceDiagnostics, testSpeechRecognition, testSpeechSynthesis } from '@/utils/voiceDiagnostics';

export const VoiceDebugTest: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(`[VoiceDebugTest] ${message}`);
  };

  const testFileManager = () => {
    addLog('Testing file manager popup...');
    if (fileInputRef.current) {
      fileInputRef.current.click();
      addLog('✅ File input clicked successfully');
      toast.success('File manager should open now');
    } else {
      addLog('❌ File input ref not found');
      toast.error('File input not found');
    }
  };

  const startListening = () => {
    addLog('Attempting to start voice recognition...');
    
    if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      addLog('❌ Speech recognition not supported in this browser');
      toast.error('Speech recognition not supported');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    
    recognition.onstart = () => {
      addLog('✅ Voice recognition started');
      setIsListening(true);
      toast.success('Listening for voice commands...');
    };
    
    recognition.onend = () => {
      addLog('🛑 Voice recognition ended');
      setIsListening(false);
    };
    
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      addLog(`❌ Voice recognition error: ${event.error}`);
      setIsListening(false);
      toast.error(`Voice error: ${event.error}`);
    };
    
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[event.results.length - 1];
      if (result.isFinal) {
        const transcript = result[0].transcript.trim();
        addLog(`🎤 Heard: "${transcript}"`);
        setLastTranscript(transcript);
        
        const lower = transcript.toLowerCase();
        if (lower.includes('file') || lower.includes('upload') || lower.includes('attach')) {
          addLog('🎯 File command detected! Opening file manager...');
          testFileManager();
        } else {
          addLog(`ℹ️ Command not recognized. Try saying "upload file"`);
        }
      }
    };
    
    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      addLog('🛑 Stopping voice recognition...');
    }
    setIsListening(false);
  };

  const clearLogs = () => {
    setLogs([]);
    setLastTranscript('');
  };

  const runDiagnostics = async () => {
    addLog('Running voice diagnostics...');
    try {
      await logVoiceDiagnostics();
      addLog('✅ Diagnostics completed - check browser console for details');
    } catch (error) {
      addLog(`❌ Diagnostics failed: ${error}`);
    }
  };

  const testSpeech = async () => {
    addLog('Testing speech synthesis...');
    try {
      await testSpeechSynthesis('Voice test successful');
      addLog('✅ Speech synthesis test passed');
    } catch (error) {
      addLog(`❌ Speech synthesis test failed: ${error}`);
    }
  };

  const testRecognition = async () => {
    addLog('Testing speech recognition for 5 seconds...');
    try {
      const result = await testSpeechRecognition();
      addLog(`✅ Speech recognition test passed: "${result}"`);
    } catch (error) {
      addLog(`❌ Speech recognition test failed: ${error}`);
    }
  };

  // Run diagnostics on component mount
  useEffect(() => {
    runDiagnostics();
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      addLog(`✅ Files selected: ${Array.from(files).map(f => f.name).join(', ')}`);
      toast.success(`Selected ${files.length} file(s)`);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5" />
          Voice Command Debug Test
        </CardTitle>
        <CardDescription>
          Test voice recognition and file manager popup functionality
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={isListening ? stopListening : startListening}
            variant={isListening ? "destructive" : "default"}
            className="flex items-center gap-2"
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            {isListening ? 'Stop Listening' : 'Start Listening'}
          </Button>
          
          <Button onClick={testFileManager} variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Test File Manager
          </Button>

          <Button onClick={runDiagnostics} variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Run Diagnostics
          </Button>

          <Button onClick={testSpeech} variant="outline" size="sm">
            🗣️ Test Speech
          </Button>

          <Button onClick={testRecognition} variant="outline" size="sm">
            🎤 Test Recognition
          </Button>

          <Button onClick={clearLogs} variant="ghost" size="sm">
            Clear Logs
          </Button>
        </div>

        {/* Status */}
        {lastTranscript && (
          <div className="p-3 bg-blue-50 rounded-md">
            <p className="text-sm"><strong>Last heard:</strong> "{lastTranscript}"</p>
          </div>
        )}

        {/* Instructions */}
        <div className="p-3 bg-gray-50 rounded-md">
          <p className="text-sm font-medium mb-2">Instructions:</p>
          <ol className="text-sm space-y-1 list-decimal list-inside">
            <li>Click "Start Listening" to begin voice recognition</li>
            <li>Say "upload file" or "attach file" clearly</li>
            <li>The file manager should open automatically</li>
            <li>Check the logs below for debugging information</li>
          </ol>
        </div>

        {/* Logs */}
        {logs.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Debug Logs:</h3>
            <div className="bg-black text-green-400 p-3 rounded-md max-h-60 overflow-y-auto font-mono text-xs">
              {logs.map((log, index) => (
                <div key={index} className="mb-1">{log}</div>
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
  );
};
