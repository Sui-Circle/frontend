import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import type { OAuthProvider } from '../services/authService';
import {
  GoogleIcon
} from './icons/SocialIcons';

interface ZkLoginAuthProps {
  onAuthSuccess: (user: any) => void;
  onAuthError: (error: string) => void;
}

const ZkLoginAuth: React.FC<ZkLoginAuthProps> = ({ onAuthSuccess, onAuthError }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<OAuthProvider | null>(null);

  // Check for OAuth callback on component mount
  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        console.log('Checking for OAuth callback...');
        const callbackResult = (authService as any).constructor.handleOAuthRedirect();
        console.log('Callback result:', callbackResult);
        
        if (callbackResult) {
          setIsLoading(true);
          const { code, state } = await callbackResult;
          console.log('OAuth callback received:', { code: code?.substring(0, 10) + '...', state });

          // Get session ID from localStorage (stored during login initiation)
          const sessionId = localStorage.getItem('oauth_session_id');
          console.log('Retrieved session ID from localStorage:', sessionId);
          
          if (!sessionId) {
            throw new Error('No session ID found');
          }

          // Complete authentication
          console.log('Completing authentication with:', { sessionId, code, state });
          const authResponse = await authService.completeAuthentication(sessionId, code, state);
          console.log('Authentication response:', authResponse);

          if (!authResponse.success) {
            throw new Error('Failed to complete authentication');
          }

          // Clean up
          localStorage.removeItem('oauth_session_id');
          localStorage.removeItem('oauth_state');

          // Success!
          onAuthSuccess(authResponse.data);
        }
      } catch (error) {
        console.error('OAuth callback failed:', error);
        console.error('Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        onAuthError(error instanceof Error ? error.message : 'OAuth callback failed');
        // Clean up on error
        localStorage.removeItem('oauth_session_id');
        localStorage.removeItem('oauth_state');
      } finally {
        setIsLoading(false);
        setLoadingProvider(null);
      }
    };

    handleOAuthCallback();
  }, [onAuthSuccess, onAuthError]);

  const handleLogin = async (provider: OAuthProvider) => {
    console.log(`Starting login flow for provider: ${provider}`);
    setIsLoading(true);
    setLoadingProvider(provider);

    try {
      // Step 1: Initiate login flow
      console.log('Initiating login with backend...');
      const loginResponse = await authService.initiateLogin(provider);
      console.log('Login response:', loginResponse);

      if (!loginResponse.success) {
        throw new Error('Failed to initiate login');
      }

      const { sessionId, authUrl } = loginResponse.data;
      console.log('Received session ID and auth URL:', { sessionId, authUrl });

      // Store session ID for when we return from OAuth
      localStorage.setItem('oauth_session_id', sessionId);
      console.log('Session ID stored in localStorage');

      // Step 2: Open OAuth popup
      console.log('Opening OAuth popup...');
      try {
        const result = await authService.openOAuthPopup(authUrl);
        console.log('OAuth popup result:', result);
        
        // If we get here, the popup was closed with a result
        if (result && result.code) {
          console.log('Received code from popup, completing authentication...');
          const authResponse = await authService.completeAuthentication(
            sessionId,
            result.code,
            result.state
          );
          
          console.log('Authentication completed:', authResponse);
          
          // Clean up
          localStorage.removeItem('oauth_session_id');
          
          // Success!
          onAuthSuccess(authResponse.data);
        }
      } catch (popupError) {
        console.error('OAuth popup error:', popupError);
        throw popupError;
      } finally {
        setIsLoading(false);
        setLoadingProvider(null);
      }

    } catch (error) {
      console.error('Login failed:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      onAuthError(error instanceof Error ? error.message : 'Login failed');
      setIsLoading(false);
      setLoadingProvider(null);
      
      // Clean up on error
      localStorage.removeItem('oauth_session_id');
    }
  };

  const providers: { id: OAuthProvider; name: string; icon: React.ReactNode; color: string }[] = [
    {
      id: 'google',
      name: 'Google',
      icon: <GoogleIcon size={20} />,
      color: '#4285f4'
    }
  ];

  return (
    <div className="w-full">
      {/* Google Auth Button */}
      <div className="space-y-4">
        {providers.map((provider) => (
          <button
            key={provider.id}
            className={`w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-md bg-white hover:bg-gray-50 transition-colors font-medium text-gray-900 ${
              loadingProvider === provider.id ? 'opacity-75 cursor-not-allowed' : ''
            }`}
            onClick={() => handleLogin(provider.id)}
            disabled={isLoading}
          >
            <div className="text-gray-900">{provider.icon}</div>
            <span>
              {loadingProvider === provider.id ? 'Connecting...' : `Continue with ${provider.name}`}
            </span>
            {loadingProvider === provider.id && (
              <div className="ml-2 w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
            )}
          </button>
        ))}
      </div>

      {/* Optional: Create account link */}
      <div className="text-center mt-6">
        <p className="text-sm text-gray-600">
          Create an account
        </p>
      </div>
    </div>
  );
};

export default ZkLoginAuth;
