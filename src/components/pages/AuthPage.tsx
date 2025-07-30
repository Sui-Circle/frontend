import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ZkLoginAuth from '@/components/ZkLoginAuth';
import { useAuth } from '@/contexts/AuthContext';

interface AuthPageProps {
  onAuthenticate: (email?: string) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthenticate }) => {
  const [email, setEmail] = useState('');
  const { login, useTestMode, setUseTestMode } = useAuth();

  const handleZkLoginSuccess = (authData: { token: string; user: any }) => {
    // Extract token and user data from the zkLogin response
    console.log('zkLogin success:', authData);
    login(authData.token, authData.user);
    onAuthenticate(authData.user.email);
  };

  const handleZkLoginError = (error: string) => {
    console.error('zkLogin authentication failed:', error);
    // You could show a toast or error message here
  };

  const handleTestModeAuth = () => {
    // Simulate authentication for test mode
    onAuthenticate();
  };

  const handleEmailAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      onAuthenticate(email);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="flex flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="flex justify-center mb-8">
            <div className="flex bg-gray-100 rounded-lg p-1">
             
                
              <button
                onClick={() => setUseTestMode(false)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  !useTestMode
                    ? 'bg-white text-black shadow-sm'
                    : 'text-gray-600 hover:text-black'
                }`}
              >
                zkLogin
              </button>
            </div>
          </div>

          {useTestMode ? (
            <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
              {/* Title */}
              <h1 className="text-2xl font-semibold text-gray-900 text-center mb-6">
                Sign in to Sui Send
              </h1>

              <p className="text-sm text-gray-600 text-center mb-8">
                It takes 5 seconds to create an account
              </p>

              {/* Test Mode Auth Button */}
              <Button
                onClick={handleTestModeAuth}
                className="w-full bg-black hover:bg-gray-800 text-white py-3 rounded-md font-medium mb-4"
              >
                Continue with Test Mode
              </Button>

              {/* Divider */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1 h-px bg-gray-200"></div>
                <span className="text-gray-500 text-sm">OR</span>
                <div className="flex-1 h-px bg-gray-200"></div>
              </div>

              {/* Email Form */}
              <form onSubmit={handleEmailAuth}>
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full mb-4 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
                <Button
                  type="submit"
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-md font-medium"
                >
                  Continue with Email
                </Button>
              </form>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
              {/* Title */}
              <h1 className="text-2xl font-semibold text-gray-900 text-center mb-6">
                Sign in to Sui Send
              </h1>

              <p className="text-sm text-gray-600 text-center mb-8">
                It takes 5 seconds to create an account
              </p>

              {/* zkLogin Component */}
              <ZkLoginAuth
                onAuthSuccess={handleZkLoginSuccess}
                onAuthError={handleZkLoginError}
              />
            </div>
          )}

          {/* Terms */}
          <div className="text-center text-xs text-gray-500 mt-6 space-y-1">
            <p>
              By creating an account, you agree to the{' '}
              <a href="#" className="text-blue-600 hover:underline">
                Terms of Service
              </a>
              .
            </p>
            <p>
              For questions about GitHub's Privacy Statement, please{' '}
              <a href="#" className="text-blue-600 hover:underline">
                contact GitHub
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};