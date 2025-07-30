import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { accessControlService, AccessControlInfo } from '../services/accessControlService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Clock, Mail, Wallet, Users, Eye, EyeOff, Loader2, QrCode, Share2 } from 'lucide-react';
import AccessControlQRCode from './AccessControlQRCode';

interface AccessControlStatusProps {
  fileCid: string;
  fileName: string;
  className?: string;
  showDetails?: boolean;
}

const AccessControlStatus: React.FC<AccessControlStatusProps> = ({
  fileCid,
  fileName,
  className = '',
  showDetails = false
}) => {
  const { token, useTestMode } = useAuth();
  const [accessControlInfo, setAccessControlInfo] = useState<AccessControlInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFullDetails, setShowFullDetails] = useState(showDetails);
  const [showQRCode, setShowQRCode] = useState(false);

  useEffect(() => {
    loadAccessControlInfo();
  }, [fileCid]);

  const loadAccessControlInfo = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await accessControlService.getAccessControlInfo(token, fileCid, useTestMode);
      
      if (result.success && result.data) {
        setAccessControlInfo(result.data);
      } else {
        setAccessControlInfo(null);
      }
    } catch (error) {
      console.log('No access control found for file (this is normal for files without access control)');
      setAccessControlInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const getAccessTypeIcon = (conditionType: string) => {
    switch (conditionType) {
      case 'email':
        return <Mail className="h-3 w-3" />;
      case 'wallet':
        return <Wallet className="h-3 w-3" />;
      case 'time':
        return <Clock className="h-3 w-3" />;
      case 'hybrid':
        return <Shield className="h-3 w-3" />;
      default:
        return <Shield className="h-3 w-3" />;
    }
  };

  const getAccessTypeColor = (conditionType: string) => {
    switch (conditionType) {
      case 'email':
        return 'bg-blue-100 text-blue-800';
      case 'wallet':
        return 'bg-green-100 text-green-800';
      case 'time':
        return 'bg-orange-100 text-orange-800';
      case 'hybrid':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const isAccessExpired = (endTime?: number) => {
    if (!endTime) return false;
    return Date.now() > endTime;
  };

  const isAccessNotStarted = (startTime?: number) => {
    if (!startTime) return false;
    return Date.now() < startTime;
  };

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading access control...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!accessControlInfo) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge variant="secondary" className="flex items-center gap-1">
          <EyeOff className="h-3 w-3" />
          No Access Control
        </Badge>
      </div>
    );
  }

  const isExpired = isAccessExpired(accessControlInfo.accessEndTime);
  const isNotStarted = isAccessNotStarted(accessControlInfo.accessStartTime);

  return (
    <div className={className}>
      {/* Compact Status */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge 
          className={`flex items-center gap-1 ${getAccessTypeColor(accessControlInfo.conditionType)}`}
        >
          {getAccessTypeIcon(accessControlInfo.conditionType)}
          {accessControlInfo.conditionType.charAt(0).toUpperCase() + accessControlInfo.conditionType.slice(1)} Access
        </Badge>

        {isExpired && (
          <Badge variant="destructive" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Expired
          </Badge>
        )}

        {isNotStarted && (
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Not Started
          </Badge>
        )}

        <Badge variant="outline" className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {accessControlInfo.currentAccessCount} accesses
        </Badge>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowQRCode(!showQRCode)}
          className="h-6 px-2"
          title="Generate QR Code"
        >
          <QrCode className="h-3 w-3" />
        </Button>

        {!showDetails && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFullDetails(!showFullDetails)}
            className="h-6 px-2"
          >
            {showFullDetails ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </Button>
        )}
      </div>

      {/* QR Code */}
      {showQRCode && (
        <div className="mt-3">
          <AccessControlQRCode fileCid={fileCid} fileName={fileName} />
        </div>
      )}

      {/* Detailed Status */}
      {(showDetails || showFullDetails) && (
        <Card className="mt-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Access Control Details
            </CardTitle>
            <CardDescription className="text-xs">
              {fileName} • {fileCid}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Access Methods */}
            <div>
              <h4 className="text-xs font-medium mb-2">Access Methods</h4>
              <div className="space-y-1">
                {accessControlInfo.allowedEmails.length > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <Mail className="h-3 w-3 text-blue-600" />
                    <span>{accessControlInfo.allowedEmails.length} allowed email(s)</span>
                  </div>
                )}
                {accessControlInfo.allowedAddresses.length > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <Wallet className="h-3 w-3 text-green-600" />
                    <span>{accessControlInfo.allowedAddresses.length} allowed address(es)</span>
                  </div>
                )}
                {accessControlInfo.allowedSuiNS?.length > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <Share2 className="h-3 w-3 text-purple-600" />
                    <span>{accessControlInfo.allowedSuiNS.length} allowed SuiNS name(s)</span>
                  </div>
                )}
                {(accessControlInfo.accessStartTime || accessControlInfo.accessEndTime) && (
                  <div className="flex items-center gap-2 text-xs">
                    <Clock className="h-3 w-3 text-orange-600" />
                    <span>Time-based restrictions</span>
                  </div>
                )}
              </div>
            </div>

            {/* Time Restrictions */}
            {(accessControlInfo.accessStartTime || accessControlInfo.accessEndTime) && (
              <div>
                <h4 className="text-xs font-medium mb-2">Time Restrictions</h4>
                <div className="space-y-1 text-xs">
                  {accessControlInfo.accessStartTime && (
                    <div>
                      <span className="text-muted-foreground">Start:</span> {formatDateTime(accessControlInfo.accessStartTime)}
                    </div>
                  )}
                  {accessControlInfo.accessEndTime && (
                    <div>
                      <span className="text-muted-foreground">End:</span> {formatDateTime(accessControlInfo.accessEndTime)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Access Logic */}
            <div>
              <h4 className="text-xs font-medium mb-2">Access Logic</h4>
              <Badge variant="outline" className="text-xs">
                {accessControlInfo.requireAllConditions ? 'Require ALL conditions (AND)' : 'Require ANY condition (OR)'}
              </Badge>
            </div>

            {/* Usage Stats */}
            <div>
              <h4 className="text-xs font-medium mb-2">Usage Statistics</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Total Accesses:</span>
                  <div className="font-medium">{accessControlInfo.currentAccessCount}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Unique Users:</span>
                  <div className="font-medium">{accessControlInfo.totalUserRecords}</div>
                </div>
              </div>
            </div>

            {/* Share Options */}
            <div>
              <h4 className="text-xs font-medium mb-2">Share Options</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowQRCode(!showQRCode)}
                className="text-xs flex items-center gap-1"
              >
                <QrCode className="h-3 w-3" />
                {showQRCode ? 'Hide QR Code' : 'Show QR Code'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AccessControlStatus;
