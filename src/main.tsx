import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import './utils/encryptionTestUtils'; // Load test utilities for console access
import './index.css';
import { Providers } from './provider.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <Providers>
        <AuthProvider>
          <App />
        </AuthProvider>
      </Providers>
    </ErrorBoundary>
  </StrictMode>
);
