import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Header } from '@/components/layout/Header';
import { TransferConfig } from '@/types';
import FileList from '@/components/FileList';
import { Plus, ArrowUpRight } from 'lucide-react';

interface TransferPageProps {
  onAddFiles: () => void;
  onTransfer: (config: TransferConfig) => void;
  user?: any;
  onLogout?: () => void;
  onNavigateToDashboard?: () => void;
}

export const TransferPage: React.FC<TransferPageProps> = ({
  onAddFiles,
  onTransfer,
  user,
  onLogout,
  onNavigateToDashboard
}) => {
  const [config, setConfig] = useState<TransferConfig>({
    transferType: 'wallet',
    encryptionEnabled: true,
    recipient: '',
    title: '',
    message: '',
    duration: '3 Days'
  });

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (config.recipient && config.title) {
      onTransfer(config);
    }
  };

  const updateConfig = (updates: Partial<TransferConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        isAuthenticated={true}
        user={user}
        onLogout={onLogout}
        onNavigateToDashboard={onNavigateToDashboard}
      />
      
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-black mb-2">
            Setup Encryption
          </h1>
          <p className="text-lg text-gray-600">
            Powered by Sui
          </p>
        </div>

        <form onSubmit={handleTransfer} className="space-y-8">
          {/* Upload Section */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                Uploaded file
              </div>
            </div>
            
            <FileList />
            
            <button
              type="button"
              onClick={onAddFiles}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1 mt-4"
            >
              <Plus className="w-4 h-4" />
              Add more files
            </button>
          </div>

          {/* Transfer Configuration */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium inline-block mb-6">
              Transfer via
            </div>

            {/* Transfer Type */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select your transfer type (e.g Wallet, NFT, SBT, Email)
              </label>
              <Select
                value={config.transferType}
                onValueChange={(value: any) => updateConfig({ transferType: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select transfer type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wallet">Wallet</SelectItem>
                  <SelectItem value="nft">NFT</SelectItem>
                  <SelectItem value="sbt">SBT</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Encryption Toggle */}
            <div className="flex gap-2 mb-6">
              <Button
                type="button"
                variant={config.encryptionEnabled ? "default" : "outline"}
                size="sm"
                onClick={() => updateConfig({ encryptionEnabled: true })}
                className={config.encryptionEnabled ? "bg-blue-600 hover:bg-blue-700" : ""}
              >
                Encryption
              </Button>
              <Button
                type="button"
                variant={!config.encryptionEnabled ? "default" : "outline"}
                size="sm"
                onClick={() => updateConfig({ encryptionEnabled: false })}
                className={!config.encryptionEnabled ? "bg-black hover:bg-gray-800" : ""}
              >
                Wallet
              </Button>
            </div>

            {/* Send To */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  Send to
                </label>
                <span className="text-xs text-gray-500">0 of 5</span>
              </div>
              <Input
                placeholder="Enter Wallet Address"
                value={config.recipient}
                onChange={(e) => updateConfig({ recipient: e.target.value })}
                className="w-full"
                required
              />
            </div>

            {/* Title */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title
              </label>
              <Input
                placeholder="Give your transfer a title"
                value={config.title}
                onChange={(e) => updateConfig({ title: e.target.value })}
                className="w-full"
                required
              />
            </div>

            {/* Message */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message
              </label>
              <Textarea
                placeholder="Optional"
                value={config.message}
                onChange={(e) => updateConfig({ message: e.target.value })}
                className="w-full resize-none"
                rows={3}
              />
            </div>

            {/* Duration */}
            <div className="flex gap-4 mb-8">
              <div className="flex-1">
                <Select
                  value={config.duration}
                  onValueChange={(value: any) => updateConfig({ duration: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1 Day">1 Day</SelectItem>
                    <SelectItem value="3 Days">3 Days</SelectItem>
                    <SelectItem value="7 Days">7 Days</SelectItem>
                    <SelectItem value="30 Days">30 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </Button>
            </div>

            {/* Transfer Button */}
            <Button
              type="submit"
              className="bg-black hover:bg-gray-800 text-white px-8 py-3 rounded-lg font-medium flex items-center gap-2"
            >
              Transfer
              <ArrowUpRight className="w-4 h-4" />
            </Button>
            <div className="text-sm text-gray-600 "> 
              You were  charged 0.1 Sui for gas fee 
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};