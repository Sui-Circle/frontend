import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Mic, MicOff, Volume2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { PICOVOICE_CONFIG } from '@/config/picovoice';

interface VoiceCommandButtonProps {
  onFileAttachCommand: () => void;
  disabled?: boolean;
  className?: string;
}

// Speech Recognition types
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

type ConversationState = 'idle' | 'listening' | 'processing' | 'responding';

export const VoiceCommandButton: React.FC<VoiceCommandButtonProps> = ({
  onFileAttachCommand,
  disabled = false,
  className = ''
}) => {
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [conversationState, setConversationState] = useState<ConversationState>('idle');
  const [lastTranscript, setLastTranscript] = useState<string>('');
  // Removed unused state variables
  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Wrapped file attach command with debugging
  const wrappedFileAttachCommand = useCallback(() => {
    console.log('🚨 ALERT: onFileAttachCommand called!');
    console.trace('📍 Call stack for file attach command');
    onFileAttachCommand();
  }, [onFileAttachCommand]);

  // Check browser support for speech recognition and synthesis
  useEffect(() => {
    const speechRecognitionSupported =
      'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
    const speechSynthesisSupported = 'speechSynthesis' in window;

    setIsSupported(speechRecognitionSupported && speechSynthesisSupported);

    if (!speechRecognitionSupported) {
      console.warn('Speech Recognition not supported in this browser');
    }
    if (!speechSynthesisSupported) {
      console.warn('Speech Synthesis not supported in this browser');
    }
  }, []);

  // Robust text-to-speech that WILL work
  const speakText = useCallback((text: string, onComplete?: () => void) => {
    console.log('🗣️ SPEAKING:', text);

    // PREVENT MULTIPLE SIMULTANEOUS SPEECH
    if (isSpeakingRef.current) {
      console.log('🚫 Already speaking, skipping new speech request');
      if (onComplete) {
        setTimeout(onComplete, 100);
      }
      return;
    }

    if ('speechSynthesis' in window) {
      // Force stop any existing speech
      window.speechSynthesis.cancel();

      // Wait a moment for cancellation to complete
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0; // Normal speed
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        utterance.lang = 'en-US';

        isSpeakingRef.current = true;
        utteranceRef.current = utterance;
        setConversationState('responding');

        // Set up event handlers
        utterance.onstart = () => {
          console.log('✅ SPEECH STARTED SUCCESSFULLY!');
          isSpeakingRef.current = true;
        };

        utterance.onend = () => {
          console.log('✅ SPEECH ENDED SUCCESSFULLY!');
          isSpeakingRef.current = false;
          utteranceRef.current = null;
          setConversationState('listening');
          if (onComplete) {
            setTimeout(onComplete, 100);
          }
        };

        utterance.onerror = (event) => {
          console.error('❌ SPEECH ERROR:', event.error, event);
          isSpeakingRef.current = false;
          utteranceRef.current = null;
          setConversationState('listening');
          if (onComplete) {
            setTimeout(onComplete, 100);
          }
        };

        // FORCE SPEECH TO START
        console.log('🚀 FORCING SPEECH TO START NOW');
        window.speechSynthesis.speak(utterance);

        // Double-check that speech started
        setTimeout(() => {
          if (window.speechSynthesis.speaking) {
            console.log('✅ Speech is actively speaking');
          } else {
            console.log('❌ Speech failed to start, retrying...');
            // Retry once
            window.speechSynthesis.speak(utterance);
          }
        }, 100);

      }, 50); // Wait 50ms after cancel
    } else {
      console.log('❌ Speech synthesis not supported');
      if (onComplete) {
        onComplete();
      }
    }
  }, []);

  // Voice assistant conversation handler
  const handleVoiceConversation = useCallback((transcript: string) => {
    if (isProcessingRef.current) {
      console.log('⏳ Already processing, ignoring transcript:', transcript);
      return;
    }

    if (!isVoiceEnabled) {
      console.log('🚫 Voice not enabled, ignoring transcript:', transcript);
      return;
    }

    // ADDITIONAL SAFETY CHECK - ignore empty or very short transcripts
    if (!transcript || transcript.length < 2) {
      console.log('🚫 Ignoring invalid transcript in handler:', transcript);
      return;
    }

    isProcessingRef.current = true;
    setConversationState('processing');
    setLastTranscript(transcript);

    console.log('🤖 Processing voice input:', transcript);

    const lowerTranscript = transcript.toLowerCase().trim();

    // Greeting responses
    if (lowerTranscript.includes('hello') || lowerTranscript.includes('hi') || lowerTranscript.includes('hey')) {
      const responseText = "Hello! I'm your voice assistant. I can help you upload files, manage documents, or answer questions. What would you like to do?";

      // Direct speech synthesis for responses
      const utterance = new SpeechSynthesisUtterance(responseText);
      utterance.rate = 1.0;
      utterance.volume = 1.0;
      utterance.onend = () => {
        isProcessingRef.current = false;
        setConversationState('listening');
      };
      utterance.onerror = () => {
        isProcessingRef.current = false;
        setConversationState('listening');
      };

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      return;
    }

    // File-related commands
    const fileKeywords = ['file', 'upload', 'attach', 'document', 'browse', 'select', 'choose'];
    const hasFileKeyword = fileKeywords.some(keyword => lowerTranscript.includes(keyword));

    if (hasFileKeyword) {
      console.log('🎯 File keyword detected, will open file browser after speaking');
      const responseText = "I'll open the file browser for you. You can select the files you want to upload.";

      const utterance = new SpeechSynthesisUtterance(responseText);
      utterance.rate = 1.0;
      utterance.volume = 1.0;
      utterance.onend = () => {
        console.log('📁 Now calling onFileAttachCommand after speech completed');
        wrappedFileAttachCommand();
        isProcessingRef.current = false;
        setConversationState('listening');
      };
      utterance.onerror = () => {
        wrappedFileAttachCommand();
        isProcessingRef.current = false;
        setConversationState('listening');
      };

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      return;
    }

    // Help requests
    if (lowerTranscript.includes('help') || lowerTranscript.includes('what can you do')) {
      speakText("I can help you with file uploads, document management, and general assistance. Try saying 'upload a file', 'attach document', or 'browse files'. What would you like to do?", () => {
        isProcessingRef.current = false;
      });
      return;
    }

    // General conversation
    if (lowerTranscript.includes('how are you')) {
      speakText("I'm doing great, thank you for asking! I'm here to help you with your file management needs. What can I assist you with today?", () => {
        isProcessingRef.current = false;
      });
      return;
    }

    // Default response for unrecognized commands - SIMPLIFIED to avoid loops
    console.log('❓ Unrecognized command, giving simple response');
    const responseText = "I can help you upload files or answer questions. Try saying 'upload a file' or 'hello'.";

    const utterance = new SpeechSynthesisUtterance(responseText);
    utterance.rate = 1.0;
    utterance.volume = 1.0;
    utterance.onend = () => {
      isProcessingRef.current = false;
      setConversationState('listening');
    };
    utterance.onerror = () => {
      isProcessingRef.current = false;
      setConversationState('listening');
    };

    // Only speak if we're not already speaking
    if (!isSpeakingRef.current) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } else {
      isProcessingRef.current = false;
      setConversationState('listening');
    }

  }, [wrappedFileAttachCommand, speakText, isVoiceEnabled]);

  // Initialize speech recognition
  useEffect(() => {
    console.log('🔧 Initializing speech recognition. isSupported:', isSupported);
    if (!isSupported) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    console.log('⚙️ Setting up speech recognition configuration');
    recognition.continuous = true;
    recognition.interimResults = true; // Show interim results for better feedback
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 3; // Get multiple alternatives for better accuracy

    recognition.onstart = () => {
      console.log('🎤 Speech recognition STARTED');
      setIsListening(true);
      toast.success(PICOVOICE_CONFIG.FEEDBACK_MESSAGES.LISTENING);
    };

    recognition.onend = () => {
      console.log('🛑 Speech recognition ENDED');
      setIsListening(false);

      // Auto-restart if voice is still enabled
      if (isVoiceEnabled) {
        console.log('🔄 Auto-restarting recognition because voice is enabled');
        setTimeout(() => {
          if (isVoiceEnabled && recognitionRef.current) {
            try {
              console.log('🔄 Attempting to restart recognition');
              recognitionRef.current.start();
            } catch (error) {
              console.log('❌ Recognition restart failed:', error);
            }
          }
        }, 100);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('❌ Speech recognition ERROR:', event.error);
      setIsListening(false);

      if (event.error === 'not-allowed') {
        console.log('🚫 Microphone access denied');
        toast.error(PICOVOICE_CONFIG.FEEDBACK_MESSAGES.MICROPHONE_ERROR);
        setIsVoiceEnabled(false);
      } else if (event.error !== 'aborted') {
        console.log('⚠️ Other recognition error:', event.error);
        toast.error('Voice recognition error. Please try again.');
      }
    };

    recognition.onresult = (event: any) => {
      const lastResult = event.results[event.results.length - 1];
      const transcript = lastResult[0].transcript.trim();

      if (lastResult.isFinal) {
        console.log('🎤 FINAL Voice input received:', transcript);

        // FILTER OUT EMPTY OR VERY SHORT TRANSCRIPTS
        if (transcript.length < 2) {
          console.log('🚫 Ignoring empty/short transcript:', transcript);
          return;
        }

        console.log('🔍 Processing valid transcript:', transcript);

        // Process the conversation
        handleVoiceConversation(transcript);
      } else {
        // Show interim results for feedback
        if (transcript.length > 1) {
          console.log('🎤 Interim:', transcript);
          setLastTranscript(`Hearing: "${transcript}"`);
        }
      }
    };

    recognitionRef.current = recognition;
    console.log('✅ Speech recognition setup complete. Recognition object stored.');

    return () => {
      console.log('🧹 Cleaning up speech recognition');

      // Don't interrupt if we're currently speaking
      if (!isSpeakingRef.current) {
        if (recognitionRef.current) {
          recognitionRef.current.abort();
        }
        if (utteranceRef.current) {
          window.speechSynthesis.cancel();
        }
      } else {
        console.log('⏸️ Skipping cleanup - currently speaking');
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isSupported, isVoiceEnabled, handleVoiceConversation]);



  // Toggle voice assistant
  const toggleVoiceCommands = useCallback(async () => {
    console.log('🎤 Voice button clicked. Current state:', { isVoiceEnabled, isListening, conversationState });

    if (!isSupported) {
      toast.error('Voice features are not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    try {
      if (isVoiceEnabled) {
        // Stop voice assistant
        console.log('🛑 Stopping voice assistant');
        if (recognitionRef.current) {
          recognitionRef.current.abort();
        }
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        if (utteranceRef.current) {
          window.speechSynthesis.cancel();
        }
        setIsVoiceEnabled(false);
        setIsListening(false);
        setConversationState('idle');
        isProcessingRef.current = false;
        isSpeakingRef.current = false;
        utteranceRef.current = null;
        toast.success('Voice assistant stopped');
      } else {
        // Start voice assistant
        console.log('▶️ Starting voice assistant');
        setIsVoiceEnabled(true);
        setConversationState('responding');

        // DIRECT SPEECH SYNTHESIS - triggered immediately from user click
        console.log('🗣️ DIRECT speech synthesis from user click');
        const welcomeText = 'Hello! I\'m your voice assistant. I can help you upload files, manage documents, or answer questions. What would you like to do?';

        // Create utterance directly in the click handler
        const utterance = new SpeechSynthesisUtterance(welcomeText);
        utterance.rate = 1.0;
        utterance.volume = 1.0;
        utterance.lang = 'en-US';

        utterance.onstart = () => {
          console.log('✅ WELCOME SPEECH STARTED');
          isSpeakingRef.current = true;
        };

        utterance.onend = () => {
          console.log('✅ WELCOME SPEECH ENDED');
          isSpeakingRef.current = false;
          setConversationState('listening');

          // Start listening after speech ends
          if (recognitionRef.current && isVoiceEnabled) {
            try {
              console.log('🎤 Starting to listen after welcome');
              recognitionRef.current.start();
            } catch (error) {
              console.error('❌ Failed to start recognition:', error);
              toast.error('Failed to start listening');
              setIsVoiceEnabled(false);
              setConversationState('idle');
            }
          }
        };

        utterance.onerror = (event) => {
          console.error('❌ WELCOME SPEECH ERROR:', event.error);
          isSpeakingRef.current = false;
          setConversationState('listening');

          // Start listening even if speech failed
          if (recognitionRef.current && isVoiceEnabled) {
            try {
              recognitionRef.current.start();
            } catch (error) {
              console.error('❌ Failed to start recognition after speech error:', error);
              setIsVoiceEnabled(false);
              setConversationState('idle');
            }
          }
        };

        // SPEAK IMMEDIATELY - this is triggered directly from user click
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);

        toast.success('Voice assistant activated - Speaking welcome message');
      }
    } catch (err) {
      console.error('❌ Error toggling voice assistant:', err);
      toast.error('Error with voice assistant');
      setIsVoiceEnabled(false);
      setConversationState('idle');
    }
  }, [isSupported, isVoiceEnabled, speakText]);

  // Manual test conversation
  const testConversation = useCallback(() => {
    if (isVoiceEnabled) {
      speakText("This is a test. I can hear you and respond. Try saying 'hello' or 'upload a file'.");
    } else {
      toast.info('Please enable voice assistant first');
    }
  }, [isVoiceEnabled, speakText]);

  // Simple start without speech - for testing
  const startListeningOnly = useCallback(() => {
    if (!isSupported) {
      toast.error('Voice recognition not supported');
      return;
    }

    setIsVoiceEnabled(true);
    setConversationState('listening');

    if (recognitionRef.current) {
      try {
        console.log('🎤 Starting listening only (no speech)');
        recognitionRef.current.start();
        toast.success('Voice assistant listening - say "hello" to test');
      } catch (error) {
        console.error('❌ Failed to start recognition:', error);
        toast.error('Failed to start listening');
        setIsVoiceEnabled(false);
        setConversationState('idle');
      }
    }
  }, [isSupported]);

  // Show unsupported message if speech features are not available
  if (!isSupported) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Button
          disabled
          variant="outline"
          size="sm"
          className="flex items-center gap-2 opacity-50"
        >
          <MicOff className="h-4 w-4" />
          Voice Not Supported
        </Button>
      </div>
    );
  }

  const getStatusIcon = () => {
    switch (conversationState) {
      case 'listening':
        return <Mic className="h-4 w-4 text-green-500 animate-pulse" />;
      case 'processing':
        return <MessageCircle className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'responding':
        return <Volume2 className="h-4 w-4 text-purple-500 animate-pulse" />;
      default:
        return isVoiceEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />;
    }
  };

  const getStatusText = () => {
    switch (conversationState) {
      case 'listening':
        return 'Listening...';
      case 'processing':
        return 'Processing...';
      case 'responding':
        return 'Speaking...';
      default:
        return isVoiceEnabled ? 'Voice Assistant Active' : 'Start Voice Assistant';
    }
  };

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <Button
        onClick={toggleVoiceCommands}
        disabled={disabled}
        variant={isVoiceEnabled ? "default" : "outline"}
        size="sm"
        className="flex items-center gap-2"
        title={isVoiceEnabled ? 'Click to stop voice assistant' : 'Click to start voice assistant'}
      >
        {getStatusIcon()}
        {getStatusText()}
      </Button>

      {/* Status and controls */}
      {isVoiceEnabled && (
        <div className="flex flex-col items-center gap-1">
          {lastTranscript && (
            <div className="text-xs text-gray-600 max-w-48 text-center">
              Last heard: "{lastTranscript}"
            </div>
          )}
          <div className="flex gap-1">
            <Button
              onClick={testConversation}
              variant="ghost"
              size="sm"
              className="text-xs px-2 py-1 h-6"
            >
              Test
            </Button>
            <Button
              onClick={() => speakText("Say 'hello', 'help', or 'upload a file' to get started.")}
              variant="ghost"
              size="sm"
              className="text-xs px-2 py-1 h-6"
            >
              Help
            </Button>
            <Button
              onClick={() => {
                console.log('🔥 SIMPLE SPEECH TEST');

                // Check if speech synthesis is available
                if (!('speechSynthesis' in window)) {
                  alert('Speech synthesis not supported in this browser');
                  return;
                }

                // Check if speech synthesis is working
                if (window.speechSynthesis.speaking) {
                  console.log('⚠️ Already speaking, stopping first');
                  window.speechSynthesis.cancel();
                }

                // Wait a moment then try simple speech
                setTimeout(() => {
                  const msg = new SpeechSynthesisUtterance('Hello');
                  msg.volume = 1;
                  msg.rate = 1;
                  msg.pitch = 1;

                  msg.onstart = () => {
                    console.log('✅ SIMPLE SPEECH STARTED');
                    alert('Speech started! Check your volume.');
                  };

                  msg.onend = () => {
                    console.log('✅ SIMPLE SPEECH ENDED');
                    alert('Speech ended! Did you hear "Hello"?');
                  };

                  msg.onerror = (e) => {
                    console.error('❌ SIMPLE SPEECH ERROR:', e);
                    alert(`Speech error: ${e.error}`);
                  };

                  console.log('🎯 Speaking simple "Hello"');
                  window.speechSynthesis.speak(msg);

                  // Check if it's actually speaking
                  setTimeout(() => {
                    if (window.speechSynthesis.speaking) {
                      console.log('✅ Speech is active');
                    } else {
                      console.log('❌ Speech is not active');
                      alert('Speech synthesis failed to start');
                    }
                  }, 100);

                }, 100);
              }}
              variant="ghost"
              size="sm"
              className="text-xs px-2 py-1 h-6"
            >
              🔊 Simple Test
            </Button>
            <Button
              onClick={startListeningOnly}
              variant="ghost"
              size="sm"
              className="text-xs px-2 py-1 h-6"
            >
              🎤 Listen Only
            </Button>
            <Button
              onClick={() => {
                console.log('🔍 SYSTEM CHECK');
                const checks = [];

                // Check speech synthesis
                if ('speechSynthesis' in window) {
                  checks.push('✅ Speech Synthesis: Available');
                  const voices = window.speechSynthesis.getVoices();
                  checks.push(`✅ Voices: ${voices.length} available`);
                  if (voices.length > 0) {
                    checks.push(`✅ Default voice: ${voices[0].name}`);
                  }
                } else {
                  checks.push('❌ Speech Synthesis: Not available');
                }

                // Check speech recognition
                if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
                  checks.push('✅ Speech Recognition: Available');
                } else {
                  checks.push('❌ Speech Recognition: Not available');
                }

                // Check browser
                checks.push(`✅ Browser: ${navigator.userAgent.split(' ').pop()}`);

                // Show results
                const result = checks.join('\n');
                console.log('🔍 SYSTEM CHECK RESULTS:\n' + result);
                alert('System Check Results:\n\n' + result);
              }}
              variant="ghost"
              size="sm"
              className="text-xs px-2 py-1 h-6"
            >
              🔍 Check System
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
