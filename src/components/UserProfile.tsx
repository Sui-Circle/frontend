import React from 'react';
import type { AuthUser } from '../contexts/AuthContext';
import {
  LogoutIcon,
  CopyIcon
} from './icons/SocialIcons';
import { Wallet } from 'lucide-react';

interface UserProfileProps {
  user: AuthUser;
  onLogout: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, onLogout }) => {

  const formatAddress = (address: string) => {
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
      console.log('Copied to clipboard:', text);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  return (
    <div className="user-profile">
      <div className="profile-header">
        <div className="user-avatar">
          <div className="provider-icon" style={{ color: '#3b82f6' }}>
            <Wallet size={24} />
          </div>
        </div>
        <div className="user-info">
          <h3 className="user-name">{user.label || 'Anonymous User'}</h3>
          <p className="user-provider">
            Authenticated via Wallet
          </p>
        </div>
        <button className="logout-btn" onClick={onLogout} title="Logout">
          <LogoutIcon size={18} />
        </button>
      </div>

      <div className="profile-details">
        <div className="detail-item">
          <label>Wallet Address:</label>
          <div className="address-container">
            <span className="address" title={user.address}>
              {formatAddress(user.address)}
            </span>
            <button
              className="copy-btn"
              onClick={() => copyToClipboard(user.address)}
              title="Copy full address"
            >
              <CopyIcon size={16} />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .user-profile {
          background: white;
          border-radius: 8px;
          padding: 1rem;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          margin-bottom: 1rem;
        }

        .profile-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .user-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #f5f5f5;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
        }

        .user-info {
          flex: 1;
        }

        .user-name {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
          color: #1a1a1a;
        }

        .user-provider {
          margin: 0;
          font-size: 0.8rem;
          color: #666;
        }

        .logout-btn {
          background: none;
          border: none;
          font-size: 1.2rem;
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 4px;
          transition: background-color 0.2s ease;
        }

        .logout-btn:hover {
          background: #f0f0f0;
        }

        .profile-details {
          border-top: 1px solid #e0e0e0;
          padding-top: 1rem;
        }

        .detail-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
          font-size: 0.9rem;
        }

        .detail-item:last-child {
          margin-bottom: 0;
        }

        .detail-item label {
          font-weight: 500;
          color: #555;
          min-width: 80px;
        }

        .address-container {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex: 1;
        }

        .address {
          font-family: monospace;
          background: #f5f5f5;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.8rem;
          flex: 1;
        }

        .copy-btn {
          background: none;
          border: none;
          font-size: 0.9rem;
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 4px;
          transition: background-color 0.2s ease;
        }

        .copy-btn:hover {
          background: #f0f0f0;
        }
      `}</style>
    </div>
  );
};

export default UserProfile;
