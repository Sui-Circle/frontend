import React from 'react';
import { AuthUser } from '../../contexts/AuthContext';
import { Header } from '../layout/Header';

interface DashboardLayoutProps {
  children: React.ReactNode;
  user: AuthUser | null;
  onLogout: () => void;
  onNavigateToUpload?: () => void;
  onNavigateToDashboard?: () => void;
  onNavigateToTransfer?: () => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  user,
  onLogout,
  onNavigateToUpload,
  onNavigateToDashboard,
  onNavigateToTransfer
}) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        isAuthenticated={!!user}
        user={user}
        onLogout={onLogout}
        onNavigateToDashboard={onNavigateToDashboard}
      />
      
      <main className="container mx-auto px-4 py-6">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
