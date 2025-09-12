import React, { useState } from 'react';
import { Wallet, TestTube } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AuthPageProps {
  onAuthenticate: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthenticate }) => {
  const [email, setEmail] = useState('');
  const { login, useTestMode, setUseTestMode } = useAuth();

  const handleTestModeAuth = () => {
    // Simulate authentication for test mode
    const testUser = {
      address: `0x${Math.random().toString(16).slice(2, 42)}`,
      label: email || 'Test User'
    };
    login(testUser);
    onAuthenticate();
  };

  const handleEmailAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      handleTestModeAuth();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-black rounded-full flex items-center justify-center mb-4">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold">Connect Wallet</CardTitle>
            <CardDescription>
              Choose how you want to authenticate
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Wallet Connection */}
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                Connect your Sui wallet to get started
              </p>
              <p className="text-xs text-gray-500">
                Your wallet connection is handled automatically by the ConnectButton in the header
              </p>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">Or</span>
              </div>
            </div>

            {/* Test Mode */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <TestTube className="w-4 h-4" />
                <span>Test Mode (No wallet required)</span>
              </div>
              
              <form onSubmit={handleEmailAuth} className="space-y-3">
                <Input
                  type="email"
                  placeholder="Enter email for test mode"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full"
                />
                <Button
                  type="submit"
                  className="w-full bg-gray-800 hover:bg-gray-900 text-white"
                  disabled={!email.trim()}
                >
                  Continue in Test Mode
                </Button>
              </form>
            </div>

            {/* Test Mode Toggle */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                {useTestMode ? 'Currently in test mode' : 'Currently in wallet mode'}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUseTestMode(!useTestMode)}
                className="text-xs"
              >
                Switch to {useTestMode ? 'Wallet' : 'Test'} Mode
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};