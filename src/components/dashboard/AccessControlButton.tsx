import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Shield, Settings } from 'lucide-react';
import AccessControlConfig from './AccessControlConfig';

interface AccessControlButtonProps {
  fileCid: string;
  fileName: string;
  onAccessControlCreated?: (result: any) => void;
  onAccessControlUpdated?: (result: any) => void;
  onError?: (error: string) => void;
  variant?: 'default' | 'outline' | 'ghost' | 'link' | 'destructive' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

const AccessControlButton: React.FC<AccessControlButtonProps> = ({
  fileCid,
  fileName,
  onAccessControlCreated,
  onAccessControlUpdated,
  onError,
  variant = 'outline',
  size = 'sm',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleAccessControlCreated = (result: any) => {
    onAccessControlCreated?.(result);
    setIsOpen(false);
  };

  const handleAccessControlUpdated = (result: any) => {
    onAccessControlUpdated?.(result);
    setIsOpen(false);
  };

  const handleError = (error: string) => {
    onError?.(error);
    // Keep dialog open on error so user can fix issues
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={variant} 
          size={size} 
          className={`flex items-center gap-2 ${className}`}
        >
          <Shield className="h-4 w-4" />
          Access Control
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configure Access Control
          </DialogTitle>
          <DialogDescription>
            Set up access permissions for <strong>{fileName}</strong>
            <br />
            <span className="text-xs text-muted-foreground font-mono">
              File ID: {fileCid}
            </span>
          </DialogDescription>
        </DialogHeader>
        
        <AccessControlConfig
          fileCid={fileCid}
          onAccessControlCreated={handleAccessControlCreated}
          onAccessControlUpdated={handleAccessControlUpdated}
          onError={handleError}
        />
      </DialogContent>
    </Dialog>
  );
};

export default AccessControlButton;
