import React, { useState, useRef } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface SimpleVoiceAssistantProps {
  onFileAttachCommand: () => void;
}

export const SimpleVoiceAssistant: React.FC<SimpleVoiceAssistantProps> = ({
  onFileAttachCommand
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastHeard, setLastHeard] = useState('');
  const recognitionRef = useRef<any>(null);

  // Simple, direct speech function
  const speak = (text: string, callback?: () => void) => {
    console.log('🗣️ SPEAKING:', text);
    
    if (!('speechSynthesis' in window)) {
      toast.error('Speech not supported');
      if (callback) callback();
      return;
    }

    // Stop any existing speech
    window.speechSynthesis.cancel();
    
    setIsSpeaking(true);
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.volume = 1.0;
    utterance.pitch = 1.0;
    
    utterance.onstart = () => {
      console.log('✅ Speech started');
      setIsSpeaking(true);
    };
    
    utterance.onend = () => {
      console.log('✅ Speech ended');
      setIsSpeaking(false);
      if (callback) callback();
    };
    
    utterance.onerror = (e) => {
      console.error('❌ Speech error:', e.error);
      setIsSpeaking(false);
      toast.error(`Speech failed: ${e.error}`);
      if (callback) callback();
    };
    
    // Speak immediately
    window.speechSynthesis.speak(utterance);
  };

  // Handle voice input
  const handleVoiceInput = (transcript: string) => {
    console.log('🎤 SimpleVoiceAssistant heard:', transcript);
    setLastHeard(transcript);

    const lower = transcript.toLowerCase();

    if (lower.includes('hello') || lower.includes('hi')) {
      speak("Hello! I'm your voice assistant. Say 'upload file' to open the file browser.");
    } else if (lower.includes('file') || lower.includes('upload') || lower.includes('attach')) {
      console.log('🎯 File command detected, calling onFileAttachCommand');
      speak("Opening file browser for you now.", () => {
        console.log('🎯 About to call onFileAttachCommand');
        onFileAttachCommand();
      });
    } else if (lower.includes('help')) {
      speak("I can help you upload files. Say 'upload file' or 'hello' to get started.");
    } else {
      speak(`I heard "${transcript}". Try saying 'hello', 'upload file', or 'help'.`);
    }
  };

  // Start listening
  const startListening = () => {
    if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      toast.error('Speech recognition not supported');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    
    recognition.onstart = () => {
      console.log('🎤 Listening started');
      setIsListening(true);
      toast.success('Listening...');
    };
    
    recognition.onend = () => {
      console.log('🎤 Listening ended');
      setIsListening(false);
    };
    
    recognition.onerror = (event) => {
      console.error('🎤 Recognition error:', event.error);
      setIsListening(false);
      toast.error(`Voice recognition error: ${event.error}`);
    };
    
    recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      if (result.isFinal) {
        const transcript = result[0].transcript.trim();
        if (transcript.length > 1) {
          handleVoiceInput(transcript);
        }
      }
    };
    
    recognitionRef.current = recognition;
    recognition.start();
  };

  // Stop listening
  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  // Toggle voice assistant
  const toggleVoice = () => {
    if (isListening) {
      stopListening();
    } else {
      // Start with welcome message
      speak("Hello! I'm your voice assistant. Say 'hello' to start or 'upload file' to open the file browser.", () => {
        startListening();
      });
    }
  };

  // Test speech only
  const testSpeech = () => {
    speak("This is a speech test. Can you hear me clearly?");
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        onClick={toggleVoice}
        variant={isListening ? "default" : "outline"}
        size="sm"
        className={`flex items-center gap-2 ${isSpeaking ? 'animate-pulse' : ''}`}
      >
        {isSpeaking ? (
          <>
            <Volume2 className="h-4 w-4 text-purple-500" />
            Speaking...
          </>
        ) : isListening ? (
          <>
            <Mic className="h-4 w-4 text-green-500" />
            Listening...
          </>
        ) : (
          <>
            <MicOff className="h-4 w-4" />
            Start Voice Assistant
          </>
        )}
      </Button>

      {lastHeard && (
        <div className="text-xs text-gray-600 max-w-48 text-center">
          Last heard: "{lastHeard}"
        </div>
      )}

      {(isListening || isSpeaking) && (
        <div className="flex gap-1">
          <Button
            onClick={testSpeech}
            variant="ghost"
            size="sm"
            className="text-xs px-2 py-1 h-6"
          >
            🔊 Test Speech
          </Button>
          <Button
            onClick={() => speak("Say 'hello', 'upload file', or 'help' to get started.")}
            variant="ghost"
            size="sm"
            className="text-xs px-2 py-1 h-6"
          >
            Help
          </Button>
          <Button
            onClick={stopListening}
            variant="ghost"
            size="sm"
            className="text-xs px-2 py-1 h-6"
          >
            Stop
          </Button>
        </div>
      )}
    </div>
  );
};
