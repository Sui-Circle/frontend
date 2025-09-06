import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Copy, QrCode, Share2 } from 'lucide-react';

interface QRCodeGeneratorProps {
  shareLink: string;
  fileName?: string;
  onError?: (error: string) => void;
}

const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({
  shareLink,
  fileName = 'Shared File',
  onError
}) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    generateQRCode();
  }, [shareLink]);

  const generateQRCode = async () => {
    if (!shareLink) return;

    setLoading(true);
    setError(null);

    try {
      // Generate QR code with custom options
      const qrCodeOptions = {
        errorCorrectionLevel: 'M' as const,
        type: 'image/png' as const,
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 256
      };

      const dataUrl = await QRCode.toDataURL(shareLink, qrCodeOptions);
      setQrCodeDataUrl(dataUrl);

      // Also generate to canvas for download functionality
      if (canvasRef.current) {
        await QRCode.toCanvas(canvasRef.current, shareLink, qrCodeOptions);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate QR code';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError('Failed to copy link to clipboard');
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeDataUrl) return;

    const link = document.createElement('a');
    link.download = `${fileName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_qr_code.png`;
    link.href = qrCodeDataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const shareLink_native = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Share: ${fileName}`,
          text: `Access this shared file: ${fileName}`,
          url: shareLink,
        });
      } catch (err) {
        // User cancelled sharing or sharing failed
        console.log('Sharing cancelled or failed');
      }
    } else {
      // Fallback to copying to clipboard
      copyToClipboard();
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          QR Code for Share Link
        </CardTitle>
        <CardDescription>
          Scan this QR code to access the shared file on mobile devices
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Generating QR code...</p>
            </div>
          </div>
        ) : qrCodeDataUrl ? (
          <div className="space-y-4">
            {/* QR Code Display */}
            <div className="flex justify-center p-4 bg-white rounded-lg border">
              <img 
                src={qrCodeDataUrl} 
                alt="QR Code for share link" 
                className="max-w-full h-auto"
              />
            </div>

            {/* Hidden canvas for download functionality */}
            <canvas 
              ref={canvasRef} 
              style={{ display: 'none' }}
            />

            {/* Share Link Display */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Share Link:</p>
              <p className="text-sm font-mono break-all">{shareLink}</p>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copyToClipboard}
                className="flex items-center gap-1"
              >
                <Copy className="h-4 w-4" />
                {copied ? 'Copied!' : 'Copy Link'}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={downloadQRCode}
                className="flex items-center gap-1"
              >
                <Download className="h-4 w-4" />
                Download QR
              </Button>
            </div>

            {/* Native Share Button (if supported) */}
            {navigator.share && (
              <Button
                variant="default"
                size="sm"
                onClick={shareLink_native}
                className="w-full flex items-center gap-1"
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            )}
          </div>
        ) : null}

        {/* Instructions */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Scan the QR code with any QR code reader or camera app</p>
          <p>• The link will open the shared file in a web browser</p>
          <p>• Access is subject to the file's permission settings</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default QRCodeGenerator;
