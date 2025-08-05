import { useState, useEffect, useCallback } from 'react';

// Define types for Web Speech API if not available in TypeScript DOM lib
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}
import { toast } from 'sonner';
import { PICOVOICE_CONFIG } from '@/config/picovoice';

export interface VoiceCommand {
  command: string;
  action: () => void;
  description: string;
}

export interface UseVoiceCommandsProps {
  commands?: VoiceCommand[];
  enabled?: boolean;
}

export interface UseVoiceCommandsReturn {
  isListening: boolean;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  addCommand: (command: VoiceCommand) => void;
  removeCommand: (commandText: string) => void;
  speakText: (text: string) => void;
}

export const useVoiceCommands = ({
  commands = [],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  
}: UseVoiceCommandsProps = {}): UseVoiceCommandsReturn => {
  const [isListening, setIsListening] = useState(false);
  // Using any type since SpeechRecognition might not be available in all environments
  // We're not using the recognition state directly, but keeping the setter for API compatibility
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, setRecognition] = useState<any>(null);
  const [voiceCommands, setVoiceCommands] = useState<VoiceCommand[]>(commands);

  // Check if speech recognition is supported
  const isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;

  // DISABLE THIS HOOK - New voice assistant is used instead
  const actuallyEnabled = false; // Force disable this old system

  // Initialize speech recognition
  useEffect(() => {
    // COMPLETELY DISABLED - return early to prevent any speech recognition setup
    console.log('🚫 Old voice commands hook disabled - no speech recognition will be initialized');
    return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognitionInstance = new SpeechRecognition();

    recognitionInstance.continuous = true;
    recognitionInstance.interimResults = false;
    recognitionInstance.lang = 'en-US';
    recognitionInstance.maxAlternatives = 1;

    recognitionInstance.onstart = () => {
      console.log('Voice recognition started');
      setIsListening(true);
    };

    recognitionInstance.onend = () => {
      console.log('Voice recognition ended');
      setIsListening(false);
    };

    recognitionInstance.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Voice recognition error:', event.error);
      setIsListening(false);
      
      if (event.error === 'not-allowed') {
        toast.error('Microphone access denied. Please allow microphone access.');
      } else {
        toast.error(`Voice recognition error: ${event.error}`);
      }
    };

    recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
      const lastResult = event.results[event.results.length - 1];
      if (lastResult.isFinal) {
        const transcript = lastResult[0].transcript.toLowerCase().trim();
        console.log('Voice command heard:', transcript);
        
        handleVoiceCommand(transcript);
      }
    };

    setRecognition(recognitionInstance);

    return () => {
      if (recognitionInstance) {
        recognitionInstance.stop();
      }
    };
  }, [isSupported, actuallyEnabled]);

  // Handle voice command matching
  const handleVoiceCommand = useCallback((transcript: string) => {
    console.log('Processing voice command:', transcript);
    
    // Check for file-related commands
    const fileKeywords = [
      'attach file', 'attach files', 'upload file', 'upload files',
      'select file', 'select files', 'choose file', 'choose files',
      'browse files', 'open file', 'add file', 'add files',
      'file upload', 'file browser', 'file dialog'
    ];

    const matchedFileCommand = fileKeywords.find(keyword => 
      transcript.includes(keyword)
    );

    if (matchedFileCommand) {
      toast.success(`Voice command recognized: "${matchedFileCommand}"`);
      speakText(PICOVOICE_CONFIG.FEEDBACK_MESSAGES.FILE_COMMAND_DETECTED);
      
      // Find and execute the file command
      const fileCommand = voiceCommands.find(cmd => 
        cmd.command.toLowerCase().includes('file') || 
        cmd.command.toLowerCase().includes('upload') ||
        cmd.command.toLowerCase().includes('attach')
      );
      
      if (fileCommand) {
        fileCommand.action();
      }
      return;
    }

    // Check for custom commands
    const matchedCommand = voiceCommands.find(cmd => 
      transcript.includes(cmd.command.toLowerCase())
    );

    if (matchedCommand) {
      toast.success(`Voice command recognized: "${matchedCommand.command}"`);
      speakText(`Executing ${matchedCommand.description}`);
      matchedCommand.action();
    } else {
      // Check for partial matches
      const partialMatch = voiceCommands.find(cmd => {
        const commandWords = cmd.command.toLowerCase().split(' ');
        return commandWords.some(word => transcript.includes(word));
      });

      if (partialMatch) {
        toast.info(`Did you mean "${partialMatch.command}"? Please try again.`);
        speakText(`Did you mean ${partialMatch.command}? Please try again.`);
      } else {
        console.log('No matching command found for:', transcript);
        toast.error(PICOVOICE_CONFIG.FEEDBACK_MESSAGES.COMMAND_NOT_UNDERSTOOD);
      }
    }
  }, [voiceCommands]);

  // Text-to-speech function
  const speakText = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      utterance.pitch = 1;
      utterance.volume = 0.7;
      
      // Use a more natural voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.lang.startsWith('en') && voice.name.includes('Google')
      ) || voices.find(voice => voice.lang.startsWith('en'));
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  // Start listening - DISABLED
  const startListening = useCallback(() => {
    console.log('🚫 OLD startListening called but disabled');
    toast.info('Old voice system disabled. Use the new Voice Assistant button.');
  }, []);

  // Stop listening - DISABLED
  const stopListening = useCallback(() => {
    console.log('🚫 OLD stopListening called but disabled');
  }, []);

  // Toggle listening - DISABLED
  const toggleListening = useCallback(() => {
    console.log('🚫 OLD toggleListening called but disabled');
    toast.info('Old voice system disabled. Use the new Voice Assistant button.');
  }, []);

  // Add command
  const addCommand = useCallback((command: VoiceCommand) => {
    setVoiceCommands(prev => [...prev, command]);
  }, []);

  // Remove command
  const removeCommand = useCallback((commandText: string) => {
    setVoiceCommands(prev => prev.filter(cmd => cmd.command !== commandText));
  }, []);

  return {
    isListening,
    isSupported,
    startListening,
    stopListening,
    toggleListening,
    addCommand,
    removeCommand,
    speakText
  };
};
