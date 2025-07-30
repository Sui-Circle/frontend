import React from 'react';
import { Wallet as WalletIcon, Copy } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Transaction } from '@/types';

interface WalletPageProps {
  walletAddress?: string;
}

export const WalletPage: React.FC<WalletPageProps> = ({ 
  walletAddress = "Njnjol...JToop" 
}) => {
  // Mock transaction data based on the design
  const transactions: Transaction[] = [
    {
      id: '1',
      type: 'sent',
      description: 'Sent a file to Wallet',
      timestamp: new Date()
    },
    {
      id: '2',
      type: 'received',
      description: 'Received a file from wallet',
      timestamp: new Date()
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Wallet Header */}
        <div className="flex items-center justify-center mb-12">
          <div className="flex items-center gap-3 bg-black text-white px-4 py-2 rounded-lg">
            <WalletIcon className="w-4 h-4" />
            <span className="font-medium">Wallet</span>
            <Copy className="w-4 h-4" />
          </div>
          <span className="ml-4 text-gray-600 font-medium">{walletAddress}</span>
        </div>

        {/* Wallet Card */}
        <div className="bg-white rounded-2xl p-8 shadow-sm mb-8">
          {/* Wallet Info */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <span>Wallet</span>
              <span className="text-gray-400">New</span>
              <span className="text-gray-400">Files</span>
              <span className="text-gray-400">6</span>
            </div>
            
            <div className="mb-6">
              <div className="text-4xl font-bold text-black mb-1">5 SUI</div>
              <div className="text-sm text-gray-600">Total Bounty Winnings</div>
            </div>
          </div>

          {/* Activity Section */}
          <div>
            <h3 className="text-lg font-semibold text-black mb-6">Activity</h3>
            
            <div className="space-y-6">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="border-b border-gray-100 pb-4 last:border-b-0">
                  <div className="font-medium text-black mb-1">
                    {transaction.type === 'sent' ? 'Sent a file to Wallet' : 'Received a file from wallet'}
                  </div>
                  <div className="text-sm text-gray-400">Description</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};