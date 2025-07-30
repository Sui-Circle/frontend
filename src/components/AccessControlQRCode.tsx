import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Download, Share2 } from 'lucide-react';
import { accessControlService, ShareLinkRequest } from '../services/accessControlService';
import { useAuth } from '../contexts/AuthContext';

interface AccessControlQRCodeProps {
  fileCid: string;
  fileName?: string;
}

const AccessControlQRCode: React.FC<AccessControlQRCodeProps> = ({ fileCid, fileName }) => {
  const { token, useTestMode } = useAuth();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [shareLink, setShareLink] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    generateShareLink();
  }, [fileCid]);

  const generateShareLink = async () => {
    setLoading(true);
    setError(null);
    try {
      const request: ShareLinkRequest = { fileCid };
      const result = await accessControlService.generateShareLink(token, request, useTestMode);
      if (result.success && result.data) {
        setShareLink(result.data.shareLink);
        generateQRCode(result.data.shareLink);
      } else {
        throw new Error(result.message || 'Failed to generate share link');
      }
    } catch (error) {
      console.error('Error generating share link:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate share link');
      setLoading(false);
    }
  };

  const generateQRCode = async (url: string) => {
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(url, {
        width: 250,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
      setQrCodeUrl(qrCodeDataUrl);
      setLoading(false);
    } catch (error) {
      console.error('Error generating QR code:', error);
      setError('Failed to generate QR code');
      setLoading(false);
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeUrl) return;
    
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `${fileName || 'file'}-access-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyShareLink = () => {
    if (!shareLink) return;
    
    navigator.clipboard.writeText(shareLink)
      .then(() => {
        // You could add a toast notification here
        console.log('Share link copied to clipboard');
      })
      .catch((error) => {
        console.error('Failed to copy link:', error);
      });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="h-5 w-5" />
          Share Access
        </CardTitle>
        <CardDescription>
          Scan this QR code or share the link to access the file
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Generating QR code...</span>
          </div>
        ) : error ? (
          <div className="text-red-500 py-4">{error}</div>
        ) : (
          <>
            <div className="bg-white p-4 rounded-lg mb-4">
              <img src={qrCodeUrl} alt="Access QR Code" className="w-[250px] h-[250px]" />
            </div>
            <div className="flex gap-2 w-full">
              <Button 
                variant="outline" 
                className="flex-1 flex items-center gap-1"
                onClick={downloadQRCode}
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
              <Button 
                className="flex-1 flex items-center gap-1"
                onClick={copyShareLink}
              >
                <Share2 className="h-4 w-4" />
                Copy Link
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AccessControlQRCode;