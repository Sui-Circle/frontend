// Picovoice Configuration
// You need to get a free access key from https://console.picovoice.ai/

export const PICOVOICE_CONFIG = {
  // Replace with your actual Picovoice access key
  // Get it from: https://console.picovoice.ai/
  ACCESS_KEY: 'n1VU88e5YMOmG6J0Ro8PD8nfmb30fTuA4U1NM560r1fCnZqXTKNX5g==',
  
  // Wake word configuration
  WAKE_WORD: 'Hey SuiSend', // You can customize this
  
  // File command intents
  FILE_COMMANDS: {
    ATTACH_FILE: 'attachFile',
    UPLOAD_DOCUMENT: 'uploadDocument', 
    SELECT_FILES: 'selectFiles',
    BROWSE_FILES: 'browseFiles',
    OPEN_FILE_DIALOG: 'openFileDialog'
  },
  
  // Voice feedback messages
  FEEDBACK_MESSAGES: {
    WAKE_WORD_DETECTED: 'SuiSend Voice command activated. What would you like to do?',
    FILE_COMMAND_DETECTED: 'Opening file browser...',
    COMMAND_NOT_UNDERSTOOD: 'Sorry, I didn\'t understand that command. Try saying "attach file" or "upload document".',
    MICROPHONE_ERROR: 'Unable to access microphone. Please check permissions.',
    LISTENING: 'Listening for voice commands...',
    STOPPED_LISTENING: 'Voice commands stopped.'
  }
};

// Built-in keywords available in Picovoice
export const BUILT_IN_KEYWORDS = [
  'alexa',
  'americano', 
  'blueberry',
  'bumblebee',
  'computer',
  'grapefruit',
  'grasshopper',
  'hey google',
  'hey siri',
  'jarvis',
  'ok google',
  'picovoice',
  'porcupine',
  'terminator'
] as const;

export type BuiltInKeyword = typeof BUILT_IN_KEYWORDS[number];
