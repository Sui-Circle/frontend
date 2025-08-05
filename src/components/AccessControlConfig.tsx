import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { accessControlService, AccessControlRule, AccessControlInfo, ParsedBulkData } from '../services/accessControlService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Shield, Clock, Mail, Wallet, Plus, X, Upload, AlertCircle, Share2, QrCode } from 'lucide-react';
import * as XLSX from 'xlsx';
import QRCodeGenerator from './QRCodeGenerator';

interface AccessControlConfigProps {
  fileCid: string;
  onAccessControlCreated?: (result: any) => void;
  onAccessControlUpdated?: (result: any) => void;
  onError?: (error: string) => void;
}

const AccessControlConfig: React.FC<AccessControlConfigProps> = ({
  fileCid,
  onAccessControlCreated,
  onAccessControlUpdated,
  onError
}) => {
  const { token, useTestMode } = useAuth();
  
  // Form state
  const [conditionType, setConditionType] = useState<'email' | 'wallet' | 'time' | 'hybrid'>('email');
  const [allowedEmails, setAllowedEmails] = useState<string[]>(['']);
  const [allowedAddresses, setAllowedAddresses] = useState<string[]>(['']);
  const [allowedSuiNS, setAllowedSuiNS] = useState<string[]>(['']);
  const [accessStartTime, setAccessStartTime] = useState<string>('');
  const [accessEndTime, setAccessEndTime] = useState<string>('');
  const [maxAccessDuration, setMaxAccessDuration] = useState<string>('');
  const [maxAccessCount, setMaxAccessCount] = useState<string>('');
  const [requireAllConditions, setRequireAllConditions] = useState(false);
  
  // Bulk upload state
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [bulkData, setBulkData] = useState<ParsedBulkData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Share link and QR code state
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [generatingShareLink, setGeneratingShareLink] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [existingAccessControl, setExistingAccessControl] = useState<AccessControlInfo | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadExistingAccessControl();
  }, [fileCid]);

  const loadExistingAccessControl = async () => {
    setLoadingExisting(true);
    try {
      const result = await accessControlService.getAccessControlInfo(token, fileCid, useTestMode);
      if (result.success && result.data) {
        setExistingAccessControl(result.data);
        // Populate form with existing data
        populateFormWithExistingData(result.data);
      } else {
        setExistingAccessControl(null);
      }
    } catch (error) {
      console.log('No existing access control found (this is normal for new files)');
      setExistingAccessControl(null);
    } finally {
      setLoadingExisting(false);
    }
  };

  const populateFormWithExistingData = (data: AccessControlInfo) => {
    setConditionType(data.conditionType as any);
    setAllowedEmails(data.allowedEmails.length > 0 ? data.allowedEmails : ['']);
    setAllowedAddresses(data.allowedAddresses.length > 0 ? data.allowedAddresses : ['']);
    setAllowedSuiNS(data.allowedSuiNS?.length > 0 ? data.allowedSuiNS : ['']);
    setAccessStartTime(data.accessStartTime ? new Date(data.accessStartTime).toISOString().slice(0, 16) : '');
    setAccessEndTime(data.accessEndTime ? new Date(data.accessEndTime).toISOString().slice(0, 16) : '');
    setRequireAllConditions(data.requireAllConditions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Build access rule
      const accessRule: AccessControlRule = {
        conditionType,
        requireAllConditions,
      };

      // Add email conditions
      if (conditionType === 'email' || conditionType === 'hybrid') {
        const validEmails = allowedEmails.filter(email => email.trim() !== '');
        if (validEmails.length > 0) {
          accessRule.allowedEmails = validEmails;
        }
      }

      // Add wallet conditions
      if (conditionType === 'wallet' || conditionType === 'hybrid') {
        const validAddresses = allowedAddresses.filter(addr => addr.trim() !== '');
        if (validAddresses.length > 0) {
          accessRule.allowedAddresses = validAddresses;
        }

        // Add SuiNS names
        const validSuiNS = allowedSuiNS.filter(name => name.trim() !== '');
        if (validSuiNS.length > 0) {
          accessRule.allowedSuiNS = validSuiNS;
        }
      }

      // Add time conditions
      if (conditionType === 'time' || conditionType === 'hybrid') {
        if (accessStartTime) {
          accessRule.accessStartTime = new Date(accessStartTime).getTime();
        }
        if (accessEndTime) {
          accessRule.accessEndTime = new Date(accessEndTime).getTime();
        }
        if (maxAccessDuration) {
          accessRule.maxAccessDuration = parseInt(maxAccessDuration) * 60 * 1000; // Convert minutes to milliseconds
        }
      }

      // Add access count limit
      if (maxAccessCount) {
        accessRule.maxAccessCount = parseInt(maxAccessCount);
      }

      // Validate the rule
      const validation = accessControlService.validateAccessRule(accessRule);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Create or update access control
      const request = { fileCid, accessRule };
      const result = existingAccessControl
        ? await accessControlService.updateAccessControl(token, request, useTestMode)
        : await accessControlService.createAccessControl(token, request, useTestMode);

      if (!result.success) {
        throw new Error(result.message);
      }

      setSuccess(existingAccessControl ? 'Access control updated successfully!' : 'Access control created successfully!');
      
      if (existingAccessControl) {
        onAccessControlUpdated?.(result);
      } else {
        onAccessControlCreated?.(result);
      }

      // Reload existing access control
      await loadExistingAccessControl();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save access control';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Email field handlers
  const addEmailField = () => {
    setAllowedEmails([...allowedEmails, '']);
  };

  const removeEmailField = (index: number) => {
    setAllowedEmails(allowedEmails.filter((_, i) => i !== index));
  };

  const updateEmail = (index: number, value: string) => {
    const updated = [...allowedEmails];
    updated[index] = value;
    setAllowedEmails(updated);
  };

  // Wallet address field handlers
  const addAddressField = () => {
    setAllowedAddresses([...allowedAddresses, '']);
  };

  const removeAddressField = (index: number) => {
    setAllowedAddresses(allowedAddresses.filter((_, i) => i !== index));
  };

  const updateAddress = (index: number, value: string) => {
    const updated = [...allowedAddresses];
    updated[index] = value;
    setAllowedAddresses(updated);
  };

  // SuiNS field handlers
  const addSuiNSField = () => {
    setAllowedSuiNS([...allowedSuiNS, '']);
  };

  const removeSuiNSField = (index: number) => {
    setAllowedSuiNS(allowedSuiNS.filter((_, i) => i !== index));
  };

  const updateSuiNS = (index: number, value: string) => {
    const updated = [...allowedSuiNS];
    updated[index] = value;
    setAllowedSuiNS(updated);
  };

  // Bulk upload handlers
  const handleBulkUploadClick = () => {
    setShowBulkUpload(true);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const fileType = file.name.endsWith('.csv') ? 'csv' : 'xlsx';
    
    try {
      if (fileType === 'csv') {
        // Handle CSV file
        const text = await file.text();
        const parsedData = accessControlService.parseBulkData(text, 'csv');
        setBulkData(parsedData);
      } else {
        // Handle Excel file
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });
        
        // Convert Excel data to CSV-like format
        const csvContent = jsonData
          .map(row => (row as any[]).join(','))
          .join('\n');
        
        const parsedData = accessControlService.parseBulkData(csvContent, 'csv');
        setBulkData(parsedData);
      }
    } catch (error) {
      setError(`Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const applyBulkData = () => {
    if (!bulkData) return;
    
    // Apply emails
    if (bulkData.emails.length > 0) {
      setAllowedEmails(bulkData.emails);
    }
    
    // Apply addresses
    if (bulkData.addresses.length > 0) {
      setAllowedAddresses(bulkData.addresses);
    }
    
    // Apply SuiNS names
    if (bulkData.suiNSNames.length > 0) {
      setAllowedSuiNS(bulkData.suiNSNames);
    }
    
    // Close bulk upload panel
    setShowBulkUpload(false);
    setBulkData(null);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const cancelBulkUpload = () => {
    setShowBulkUpload(false);
    setBulkData(null);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Share link generation
  const generateShareLink = async () => {
    setGeneratingShareLink(true);
    setError(null);

    try {
      const result = await accessControlService.generateShareLink(
        token,
        {
          fileCid,
          expirationTime: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days from now
          maxUses: 100, // Maximum 100 uses
        },
        useTestMode
      );

      if (!result.success) {
        throw new Error(result.message);
      }

      setShareLink(result.data?.shareLink || null);
      setSuccess('Share link generated successfully!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate share link';
      setError(errorMessage);
    } finally {
      setGeneratingShareLink(false);
    }
  };

  const toggleQRCode = () => {
    setShowQRCode(!showQRCode);
  };

  if (loadingExisting) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading access control settings...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          File Access Control
        </CardTitle>
        <CardDescription>
          Configure who can access this file and under what conditions.
          {existingAccessControl && (
            <Badge variant="secondary" className="ml-2">
              Current: {existingAccessControl.conditionType}
            </Badge>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {showBulkUpload ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Bulk Upload</h3>
              <Button variant="ghost" size="sm" onClick={cancelBulkUpload}>
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
            </div>
            
            <div className="border rounded-md p-4">
              <Label htmlFor="bulk-file" className="block mb-2">Upload CSV or Excel file</Label>
              <div className="flex gap-2 mb-4">
                <Input 
                  id="bulk-file" 
                  type="file" 
                  accept=".csv,.xlsx,.xls" 
                  ref={fileInputRef}
                  onChange={handleFileSelect} 
                />
              </div>
              
              <div className="text-sm text-gray-500 mb-4">
                <p>File should contain emails, wallet addresses, or SuiNS names (one per row or column).</p>
                <p>Example: user@example.com, 0x123...abc, name.sui</p>
              </div>
              
              {bulkData && (
                <div className="space-y-4">
                  <div className="border rounded p-4 bg-gray-50">
                    <h4 className="font-medium mb-2">Parsed Data</h4>
                    
                    <div className="space-y-2">
                      {bulkData.emails.length > 0 && (
                        <div>
                          <span className="font-medium">Emails:</span> {bulkData.emails.length} valid emails
                        </div>
                      )}
                      
                      {bulkData.addresses.length > 0 && (
                        <div>
                          <span className="font-medium">Wallet Addresses:</span> {bulkData.addresses.length} valid addresses
                        </div>
                      )}
                      
                      {bulkData.suiNSNames.length > 0 && (
                        <div>
                          <span className="font-medium">SuiNS Names:</span> {bulkData.suiNSNames.length} valid names
                        </div>
                      )}
                    </div>
                    
                    {bulkData.errors.length > 0 && (
                      <div className="mt-4">
                        <div className="flex items-center text-amber-600 mb-2">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          <span className="font-medium">Errors:</span>
                        </div>
                        <ul className="text-sm text-amber-600 list-disc pl-5">
                          {bulkData.errors.slice(0, 5).map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                          {bulkData.errors.length > 5 && (
                            <li>...and {bulkData.errors.length - 5} more errors</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={cancelBulkUpload}>Cancel</Button>
                    <Button 
                      onClick={applyBulkData}
                      disabled={bulkData.emails.length === 0 && bulkData.addresses.length === 0 && bulkData.suiNSNames.length === 0}
                    >
                      Apply Data
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Access Control Type */}
            <div className="space-y-2">
              <Label>Access Control Type</Label>
              <Tabs value={conditionType} onValueChange={(value) => setConditionType(value as any)}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="email" className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    Email
                  </TabsTrigger>
                  <TabsTrigger value="wallet" className="flex items-center gap-1">
                    <Wallet className="h-4 w-4" />
                    Wallet
                  </TabsTrigger>
                  <TabsTrigger value="time" className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Time
                  </TabsTrigger>
                  <TabsTrigger value="hybrid" className="flex items-center gap-1">
                    <Shield className="h-4 w-4" />
                    Hybrid
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="email" className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Allowed Email Addresses</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleBulkUploadClick}
                        className="flex items-center gap-1"
                      >
                        <Upload className="h-4 w-4" />
                        Bulk Upload
                      </Button>
                    </div>
                    <div className="space-y-2 mt-2">
                      {allowedEmails.map((email, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            type="email"
                            placeholder="user@example.com"
                            value={email}
                            onChange={(e) => updateEmail(index, e.target.value)}
                            className="flex-1"
                          />
                          {allowedEmails.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => removeEmailField(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addEmailField}
                        className="flex items-center gap-1"
                      >
                        <Plus className="h-4 w-4" />
                        Add Email
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="wallet" className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Allowed Wallet Addresses</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleBulkUploadClick}
                        className="flex items-center gap-1"
                      >
                        <Upload className="h-4 w-4" />
                        Bulk Upload
                      </Button>
                    </div>
                    <div className="space-y-2 mt-2">
                      {allowedAddresses.map((address, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            placeholder="0x..."
                            value={address}
                            onChange={(e) => updateAddress(index, e.target.value)}
                            className="flex-1 font-mono text-sm"
                          />
                          {allowedAddresses.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => removeAddressField(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addAddressField}
                        className="flex items-center gap-1"
                      >
                        <Plus className="h-4 w-4" />
                        Add Address
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Allowed SuiNS Names</Label>
                    </div>
                    <div className="space-y-2 mt-2">
                      {allowedSuiNS.map((name, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            placeholder="name.sui"
                            value={name}
                            onChange={(e) => updateSuiNS(index, e.target.value)}
                            className="flex-1"
                          />
                          {allowedSuiNS.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => removeSuiNSField(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addSuiNSField}
                        className="flex items-center gap-1"
                      >
                        <Plus className="h-4 w-4" />
                        Add SuiNS Name
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="time" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="accessStartTime">Access Start Time</Label>
                      <Input
                        id="accessStartTime"
                        type="datetime-local"
                        value={accessStartTime}
                        onChange={(e) => setAccessStartTime(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="accessEndTime">Access End Time</Label>
                      <Input
                        id="accessEndTime"
                        type="datetime-local"
                        value={accessEndTime}
                        onChange={(e) => setAccessEndTime(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="maxAccessDuration">Max Access Duration (minutes)</Label>
                    <Input
                      id="maxAccessDuration"
                      type="number"
                      placeholder="60"
                      value={maxAccessDuration}
                      onChange={(e) => setMaxAccessDuration(e.target.value)}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="hybrid" className="space-y-4">
                  <div className="space-y-4">
                    {/* Email section for hybrid */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>Allowed Email Addresses (Optional)</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleBulkUploadClick}
                          className="flex items-center gap-1"
                        >
                          <Upload className="h-4 w-4" />
                          Bulk Upload
                        </Button>
                      </div>
                      <div className="space-y-2 mt-2">
                        {allowedEmails.map((email, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              type="email"
                              placeholder="user@example.com"
                              value={email}
                              onChange={(e) => updateEmail(index, e.target.value)}
                              className="flex-1"
                            />
                            {allowedEmails.length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => removeEmailField(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addEmailField}
                          className="flex items-center gap-1"
                        >
                          <Plus className="h-4 w-4" />
                          Add Email
                        </Button>
                      </div>
                    </div>

                    {/* Wallet section for hybrid */}
                    <div>
                      <Label>Allowed Wallet Addresses (Optional)</Label>
                      <div className="space-y-2 mt-2">
                        {allowedAddresses.map((address, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              placeholder="0x..."
                              value={address}
                              onChange={(e) => updateAddress(index, e.target.value)}
                              className="flex-1 font-mono text-sm"
                            />
                            {allowedAddresses.length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => removeAddressField(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addAddressField}
                          className="flex items-center gap-1"
                        >
                          <Plus className="h-4 w-4" />
                          Add Address
                        </Button>
                      </div>
                    </div>
                    
                    {/* SuiNS section for hybrid */}
                    <div>
                      <Label>Allowed SuiNS Names (Optional)</Label>
                      <div className="space-y-2 mt-2">
                        {allowedSuiNS.map((name, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              placeholder="name.sui"
                              value={name}
                              onChange={(e) => updateSuiNS(index, e.target.value)}
                              className="flex-1"
                            />
                            {allowedSuiNS.length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => removeSuiNSField(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addSuiNSField}
                          className="flex items-center gap-1"
                        >
                          <Plus className="h-4 w-4" />
                          Add SuiNS Name
                        </Button>
                      </div>
                    </div>

                    {/* Time section for hybrid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="accessStartTime">Access Start Time (Optional)</Label>
                        <Input
                          id="accessStartTime"
                          type="datetime-local"
                          value={accessStartTime}
                          onChange={(e) => setAccessStartTime(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="accessEndTime">Access End Time (Optional)</Label>
                        <Input
                          id="accessEndTime"
                          type="datetime-local"
                          value={accessEndTime}
                          onChange={(e) => setAccessEndTime(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Additional Options */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="maxAccessCount">Maximum Access Count (Optional)</Label>
                <Input
                  id="maxAccessCount"
                  type="number"
                  placeholder="10"
                  value={maxAccessCount}
                  onChange={(e) => setMaxAccessCount(e.target.value)}
                />
              </div>

              {(conditionType === 'hybrid') && (
                <div className="flex items-center space-x-2">
                  <Switch
                    id="requireAllConditions"
                    checked={requireAllConditions}
                    onCheckedChange={setRequireAllConditions}
                  />
                  <Label htmlFor="requireAllConditions">
                    Require ALL conditions to be met (AND logic)
                  </Label>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <Button type="submit" disabled={loading} className="w-full">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {existingAccessControl ? 'Update Access Control' : 'Create Access Control'}
            </Button>
          </form>
        )}

        {/* Share Link & QR Code Section */}
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Share Link & QR Code</h4>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={generateShareLink}
                disabled={generatingShareLink}
                className="flex items-center gap-1"
              >
                {generatingShareLink ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Share2 className="h-4 w-4" />
                )}
                Generate Share Link
              </Button>

              {shareLink && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleQRCode}
                  className="flex items-center gap-1"
                >
                  <QrCode className="h-4 w-4" />
                  {showQRCode ? 'Hide QR Code' : 'Show QR Code'}
                </Button>
              )}
            </div>
          </div>

          {shareLink && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium mb-2">Share Link Generated:</p>
              <p className="text-xs font-mono bg-white p-2 rounded border break-all">
                {shareLink}
              </p>
              <p className="text-xs text-gray-600 mt-2">
                This link allows authorized users to access the file. Valid for 7 days with max 100 uses.
              </p>
            </div>
          )}

          {showQRCode && shareLink && (
            <QRCodeGenerator
              shareLink={shareLink}
              fileName={`File_${fileCid.substring(0, 8)}`}
              onError={(error) => setError(error)}
            />
          )}
        </div>

        {/* Existing Access Control Info */}
        {existingAccessControl && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-2">Current Access Control</h4>
            <div className="text-sm space-y-1">
              <p><strong>Type:</strong> {existingAccessControl.conditionType}</p>
              <p><strong>Access Count:</strong> {existingAccessControl.currentAccessCount}</p>
              <p><strong>Total Users:</strong> {existingAccessControl.totalUserRecords}</p>
              {existingAccessControl.allowedEmails.length > 0 && (
                <p><strong>Allowed Emails:</strong> {existingAccessControl.allowedEmails.join(', ')}</p>
              )}
              {existingAccessControl.allowedAddresses.length > 0 && (
                <p><strong>Allowed Addresses:</strong> {existingAccessControl.allowedAddresses.length} addresses</p>
              )}
              {existingAccessControl.allowedSuiNS?.length > 0 && (
                <p><strong>Allowed SuiNS Names:</strong> {existingAccessControl.allowedSuiNS.join(', ')}</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AccessControlConfig;
