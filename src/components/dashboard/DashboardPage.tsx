import React, { useState } from 'react';
import { AuthUser } from '../../contexts/AuthContext';
import { DashboardLayout } from './DashboardLayout';
import FileList from './FileList';
import FileUpload from './FileUpload';
import { AllowlistManager } from './AllowlistManager';
import { Button } from '../ui/button';
import { Upload, FileText, BarChart3, Users } from 'lucide-react';

interface DashboardPageProps {
  user: AuthUser | null;
  onLogout: () => void;
  onNavigateToDashboard: () => void;
}

type DashboardView = 'overview' | 'files' | 'upload' | 'analytics' | 'allowlists';

export const DashboardPage: React.FC<DashboardPageProps> = ({
  user,
  onLogout,
  onNavigateToDashboard
}) => {
  const [currentView, setCurrentView] = useState<DashboardView>('files');

  const dashboardItems = [
    {
      id: 'files' as const,
      label: 'My Files',
      icon: FileText,
      description: 'View and manage your uploaded files'
    },
    {
      id: 'allowlists' as const,
      label: 'Allowlists',
      icon: Users,
      description: 'Manage your allowlists and wallet access'
    },
    {
      id: 'upload' as const,
      label: 'Upload Files',
      icon: Upload,
      description: 'Upload new files to the blockchain'
    },
    {
      id: 'analytics' as const,
      label: 'Analytics',
      icon: BarChart3,
      description: 'View file usage and sharing statistics'
    }
  ];

  const renderContent = () => {
    switch (currentView) {
      case 'files':
        return (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">My Files</h2>
              <Button 
                onClick={() => setCurrentView('upload')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Files
              </Button>
            </div>
            <FileList />
          </div>
        );
      
      case 'upload':
        return (
          <div>
            <div className="mb-6">
              <div className="flex items-center gap-4 mb-4">
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentView('files')}
                >
                  ← Back to Files
                </Button>
                <h2 className="text-2xl font-bold text-gray-900">Upload Files</h2>
              </div>
            </div>
            <FileUpload 
              onUploadSuccess={() => {
                setCurrentView('files');
              }}
            />
          </div>
        );
      
      case 'allowlists':
        return (
          <div>
            <AllowlistManager user={user} />
          </div>
        );
      
      case 'analytics':
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Analytics</h2>
            <div className="bg-white rounded-lg border p-8 text-center">
              <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics Coming Soon</h3>
              <p className="text-gray-600">
                File usage statistics and sharing analytics will be available here.
              </p>
            </div>
          </div>
        );
      
      default:
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dashboardItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-lg border border-gray-200 p-6 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => setCurrentView(item.id)}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <Icon className="w-5 h-5 text-blue-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">{item.label}</h3>
                    </div>
                    <p className="text-gray-600 text-sm">{item.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        );
    }
  };

  return (
    <DashboardLayout
      user={user}
      onLogout={onLogout}
      onNavigateToDashboard={onNavigateToDashboard}
    >
      {/* Dashboard Navigation */}
      <div className="mb-8">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {dashboardItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Dashboard Content */}
      {renderContent()}
    </DashboardLayout>
  );
};
