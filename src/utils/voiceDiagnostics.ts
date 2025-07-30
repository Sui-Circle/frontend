// Voice diagnostics utility to help debug voice command issues

export interface VoiceDiagnostics {
  speechRecognitionSupported: boolean;
  speechSynthesisSupported: boolean;
  userAgent: string;
  isSecureContext: boolean;
  permissions: {
    microphone: string;
  };
  voices: SpeechSynthesisVoice[];
  errors: string[];
}

export const runVoiceDiagnostics = async (): Promise<VoiceDiagnostics> => {
  const diagnostics: VoiceDiagnostics = {
    speechRecognitionSupported: false,
    speechSynthesisSupported: false,
    userAgent: navigator.userAgent,
    isSecureContext: window.isSecureContext,
    permissions: {
      microphone: 'unknown'
    },
    voices: [],
    errors: []
  };

  // Check Speech Recognition support
  if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
    diagnostics.speechRecognitionSupported = true;
  } else {
    diagnostics.errors.push('Speech Recognition API not supported in this browser');
  }

  // Check Speech Synthesis support
  if ('speechSynthesis' in window) {
    diagnostics.speechSynthesisSupported = true;
    
    // Get available voices
    const getVoices = () => {
      return new Promise<SpeechSynthesisVoice[]>((resolve) => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          resolve(voices);
        } else {
          // Some browsers need time to load voices
          window.speechSynthesis.onvoiceschanged = () => {
            resolve(window.speechSynthesis.getVoices());
          };
        }
      });
    };

    try {
      diagnostics.voices = await getVoices();
    } catch (error) {
      diagnostics.errors.push(`Error getting voices: ${error}`);
    }
  } else {
    diagnostics.errors.push('Speech Synthesis API not supported in this browser');
  }

  // Check microphone permissions
  try {
    if ('permissions' in navigator) {
      const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      diagnostics.permissions.microphone = micPermission.state;
    }
  } catch (error) {
    diagnostics.errors.push(`Error checking microphone permissions: ${error}`);
  }

  // Check secure context (required for some browsers)
  if (!window.isSecureContext) {
    diagnostics.errors.push('Not in secure context (HTTPS required for some browsers)');
  }

  return diagnostics;
};

export const logVoiceDiagnostics = async () => {
  console.log('🔍 Running voice diagnostics...');
  const diagnostics = await runVoiceDiagnostics();
  
  console.log('📊 Voice Diagnostics Results:');
  console.log('- Speech Recognition:', diagnostics.speechRecognitionSupported ? '✅ Supported' : '❌ Not supported');
  console.log('- Speech Synthesis:', diagnostics.speechSynthesisSupported ? '✅ Supported' : '❌ Not supported');
  console.log('- Secure Context:', diagnostics.isSecureContext ? '✅ Yes' : '❌ No');
  console.log('- Microphone Permission:', diagnostics.permissions.microphone);
  console.log('- Available Voices:', diagnostics.voices.length);
  console.log('- User Agent:', diagnostics.userAgent);
  
  if (diagnostics.errors.length > 0) {
    console.log('❌ Errors found:');
    diagnostics.errors.forEach(error => console.log(`  - ${error}`));
  }
  
  return diagnostics;
};

export const testSpeechRecognition = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      reject(new Error('Speech Recognition not supported'));
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    
    let timeout: NodeJS.Timeout;
    
    recognition.onstart = () => {
      console.log('🎤 Test recognition started');
      // Auto-stop after 5 seconds for testing
      timeout = setTimeout(() => {
        recognition.stop();
        reject(new Error('Test timeout - no speech detected'));
      }, 5000);
    };
    
    recognition.onresult = (event) => {
      clearTimeout(timeout);
      const result = event.results[0];
      if (result.isFinal) {
        const transcript = result[0].transcript;
        console.log('🎤 Test recognition result:', transcript);
        resolve(transcript);
      }
    };
    
    recognition.onerror = (event) => {
      clearTimeout(timeout);
      console.error('🎤 Test recognition error:', event.error);
      reject(new Error(`Recognition error: ${event.error}`));
    };
    
    recognition.onend = () => {
      clearTimeout(timeout);
      console.log('🎤 Test recognition ended');
    };
    
    try {
      recognition.start();
    } catch (error) {
      reject(error);
    }
  });
};

export const testSpeechSynthesis = (text: string = 'Testing speech synthesis'): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('Speech Synthesis not supported'));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.volume = 0.5;
    utterance.pitch = 1.0;
    
    utterance.onstart = () => {
      console.log('🗣️ Test speech started');
    };
    
    utterance.onend = () => {
      console.log('🗣️ Test speech ended');
      resolve();
    };
    
    utterance.onerror = (event) => {
      console.error('🗣️ Test speech error:', event);
      reject(new Error(`Speech synthesis error: ${event.error}`));
    };
    
    try {
      window.speechSynthesis.cancel(); // Clear any existing speech
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      reject(error);
    }
  });
};
