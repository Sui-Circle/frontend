/**
 * Authentication service for zkLogin integration
 */

const API_BASE_URL = 'http://localhost:3000';

export interface AuthUser {
  zkLoginAddress: string;
  provider: string;
  email?: string;
  name?: string;
  // zkLogin transaction parameters (for signing transactions)
  ephemeralKeyPair?: {
    keypair: any; // Ed25519Keypair - stored in sessionStorage for security
    maxEpoch: number;
    randomness: string;
  };
  zkLoginProof?: {
    proofPoints: {
      a: string[];
      b: string[][];
      c: string[];
    };
    issBase64Details: {
      value: string;
      indexMod4: number;
    };
    headerBase64: string;
  };
  jwt?: string;
  userSalt?: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    sessionId: string;
    authUrl: string;
    provider: string;
  };
}

export interface AuthResponse {
  success: boolean;
  data: {
    token: string;
    user: AuthUser;
  };
}

export interface VerifyResponse {
  success: boolean;
  data: {
    user: AuthUser;
  };
}

export type OAuthProvider = 'google' | 'github';

class AuthService {
  private token: string | null = null;
  private user: AuthUser | null = null;

  constructor() {
    // Load token from localStorage on initialization
    this.token = localStorage.getItem('authToken');
  }

  /**
   * Initiate OAuth login flow
   */
  async initiateLogin(provider: OAuthProvider): Promise<LoginResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login/${provider}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to initiate login');
      }
      
      return data;
    } catch (error) {
      console.error('Failed to initiate login:', error);
      throw error;
    }
  }

  /**
   * Complete OAuth authentication
   */
  async completeAuthentication(sessionId: string, code: string, state?: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          code,
          state,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to complete authentication');
      }
      
      // Store token and user data
      this.token = data.data.token;
      this.user = data.data.user;
      if (this.token) {
        localStorage.setItem('authToken', this.token);
      }

      // Store user data with sensitive zkLogin parameters in sessionStorage for security
      if (this.user) {
        this.storeUserData(this.user);
      }
      
      return data;
    } catch (error) {
      console.error('Failed to complete authentication:', error);
      throw error;
    }
  }

  /**
   * Verify current token
   */
  async verifyToken(): Promise<VerifyResponse | null> {
    if (!this.token) {
      return null;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });
      
      if (!response.ok) {
        // Token is invalid, clear it
        this.logout();
        return null;
      }
      
      const data = await response.json();
      this.user = data.data.user;
      if (this.user) {
        this.storeUserData(this.user);
      }
      
      return data;
    } catch (error) {
      console.error('Failed to verify token:', error);
      this.logout();
      return null;
    }
  }

  /**
   * Get user profile
   */
  async getProfile(): Promise<AuthUser | null> {
    if (!this.token) {
      return null;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });
      
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json();
      return data.data.user;
    } catch (error) {
      console.error('Failed to get profile:', error);
      return null;
    }
  }

  /**
   * Logout user
   */
  logout(): void {
    this.token = null;
    this.user = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    // Clear sensitive zkLogin data from sessionStorage
    sessionStorage.removeItem('zkLoginParams');
  }

  /**
   * Store user data securely (sensitive zkLogin params in sessionStorage)
   */
  private storeUserData(user: AuthUser): void {
    // Store basic user info in localStorage
    const basicUserInfo = {
      zkLoginAddress: user.zkLoginAddress,
      provider: user.provider,
      email: user.email,
      name: user.name,
    };
    localStorage.setItem('authUser', JSON.stringify(basicUserInfo));

    // Store sensitive zkLogin transaction parameters in sessionStorage for security
    if (user.ephemeralKeyPair || user.zkLoginProof || user.jwt || user.userSalt) {
      const zkLoginParams = {
        ephemeralKeyPair: user.ephemeralKeyPair,
        zkLoginProof: user.zkLoginProof,
        jwt: user.jwt,
        userSalt: user.userSalt,
      };
      sessionStorage.setItem('zkLoginParams', JSON.stringify(zkLoginParams));
    }
  }

  /**
   * Load user data from storage (combining localStorage and sessionStorage)
   */
  private loadUserData(): AuthUser | null {
    const basicUserInfo = localStorage.getItem('authUser');
    if (!basicUserInfo) {
      return null;
    }

    try {
      const user = JSON.parse(basicUserInfo) as AuthUser;

      // Try to load zkLogin parameters from sessionStorage
      const zkLoginParams = sessionStorage.getItem('zkLoginParams');
      if (zkLoginParams) {
        try {
          const params = JSON.parse(zkLoginParams);
          user.ephemeralKeyPair = params.ephemeralKeyPair;
          user.zkLoginProof = params.zkLoginProof;
          user.jwt = params.jwt;
          user.userSalt = params.userSalt;
        } catch (error) {
          console.warn('Failed to parse zkLogin parameters from sessionStorage:', error);
          // Continue without zkLogin params - user can still be authenticated for basic operations
        }
      }

      return user;
    } catch (error) {
      console.error('Failed to parse user data:', error);
      localStorage.removeItem('authUser');
      return null;
    }
  }

  /**
   * Get current token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Get current user
   */
  getUser(): AuthUser | null {
    if (!this.user) {
      this.user = this.loadUserData();
    }
    return this.user;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.token && !!this.user;
  }

  /**
   * Handle OAuth callback from popup window
   */
  handleOAuthCallback(url: string): { code: string; state?: string } | null {
    try {
      const urlObj = new URL(url);
      const code = urlObj.searchParams.get('code');
      const state = urlObj.searchParams.get('state');
      
      if (!code) {
        throw new Error('No authorization code received');
      }
      
      return { code, state: state || undefined };
    } catch (error) {
      console.error('Failed to parse OAuth callback:', error);
      return null;
    }
  }

  /**
   * Open OAuth popup window or redirect
   */
 openOAuthPopup(authUrl: string): Promise<{ code: string; state?: string }> {
  return new Promise((resolve, reject) => {
    console.log('Opening OAuth popup with URL:', authUrl);
    // Open popup
    const popup = window.open(authUrl, 'OAuth', 'width=600,height=700');
    
    if (!popup) {
      console.error('Failed to open popup window');
      reject(new Error('Failed to open popup. Please allow popups for this site.'));
      return;
    }
    
    console.log('Popup opened successfully, waiting for response...');
    
    // Listen for messages from the popup
    const handleMessage = (event: MessageEvent) => {
      console.log('Received message from popup:', event.data);
      // Verify origin if needed
      
      if (event.data.type === 'oauth_success') {
        console.log('OAuth success message received:', event.data.data);
        window.removeEventListener('message', handleMessage);
        resolve({ 
          code: event.data.data.code || '', 
          state: event.data.data.state 
        });
      } else if (event.data.type === 'oauth_error') {
        console.error('OAuth error message received:', event.data.error);
        window.removeEventListener('message', handleMessage);
        reject(new Error(event.data.error || 'Authentication failed'));
      }
    };
    
    window.addEventListener('message', handleMessage);
    console.log('Message event listener added');
  });
}
  /**
   * Handle OAuth redirect callback
   */
  static handleOAuthRedirect(): Promise<{ code: string; state?: string }> | null {
    console.log('handleOAuthRedirect called, checking URL parameters...');
    console.log('Current URL:', window.location.href);
    
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    console.log('URL parameters parsed:', { code: code?.substring(0, 10) + '...', state, error });

    if (error) {
      console.error(`OAuth error from provider: ${error}`);
      throw new Error(`OAuth error: ${error}`);
    }

    if (code) {
      console.log('Authorization code found, clearing URL parameters...');
      // Clear the URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);

      return Promise.resolve({
        code,
        state: state || undefined
      });
    }

    console.log('No authorization code found in URL');
    return null;
  }
}

export const authService = new AuthService();
