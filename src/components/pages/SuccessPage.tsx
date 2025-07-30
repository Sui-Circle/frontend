import React, { useEffect } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { toast } from 'sonner';

interface SuccessPageProps {
  onAutoRedirect: () => void;
}

export const SuccessPage: React.FC<SuccessPageProps> = ({ onAutoRedirect }) => {
  const shareableLink = "https://suicircle.app/share/abc123def456";

  useEffect(() => {
    const timer = setTimeout(() => {
      onAutoRedirect();
    }, 10000); // 10 seconds

    return () => clearTimeout(timer);
  }, [onAutoRedirect]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareableLink);
      toast.success('Link copied to clipboard!');
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  const handleUploadMore = () => {
    // Navigate back to landing page for more uploads
    onAutoRedirect();
  };

  const handleViewTransfers = () => {
    // This would navigate to a transfers page in a real app
    toast.info('View transfers functionality would be implemented here');
  };

  const handleViewTransaction = () => {
    // This would open Sui Explorer in a real app
    window.open('https://explorer.sui.io', '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="flex flex-col items-center justify-center px-4 py-16">
        {/* Success Card */}
        <div className="bg-white rounded-2xl p-8 shadow-lg max-w-md w-full mx-4">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <Check className="w-6 h-6 text-white" strokeWidth={3} />
              </div>
            </div>
          </div>

          {/* Success Message */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              Files Sent Successfully!
            </h1>
            <p className="text-gray-600 text-sm leading-relaxed">
              Your files have been securely uploaded and encrypted.
            </p>
          </div>

          {/* Shareable Link Section */}
          <div className="mb-8">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Shareable Link
              </h3>
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border">
                <code className="flex-1 text-sm text-gray-700 font-mono break-all">
                  {shareableLink}
                </code>
                <Button
                  onClick={handleCopyLink}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-md shrink-0"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <Button
              onClick={handleUploadMore}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium text-base"
            >
              Upload More Files
            </Button>
            
            <button
              onClick={handleViewTransfers}
              className="w-full text-blue-600 hover:text-blue-700 py-2 text-sm font-medium transition-colors"
            >
              View My Transfers
            </button>
            
            <button
              onClick={handleViewTransaction}
              className="w-full text-gray-600 hover:text-gray-700 py-2 text-sm transition-colors"
            >
              View Transaction on Sui Explorer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};