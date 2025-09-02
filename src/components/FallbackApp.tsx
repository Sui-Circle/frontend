import React from 'react';

const FallbackApp: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🔧</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          App Loading...
        </h1>
        <p className="text-gray-600 mb-4">
          The application is initializing. Please wait a moment.
        </p>
        <div className="w-8 h-8 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
      </div>
    </div>
  );
};

export default FallbackApp;
