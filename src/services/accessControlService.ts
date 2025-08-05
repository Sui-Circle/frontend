/**
 * Access Control service for managing file permissions
 * Handles all access control operations with proper authentication
 */

import { isValidSuiAddress } from '@mysten/sui/utils';

const API_BASE_URL = 'http://localhost:3000';

export interface AccessControlRule {
  conditionType: 'email' | 'wallet' | 'time' | 'hybrid';
  allowedEmails?: string[];
  allowedAddresses?: string[];
  allowedSuiNS?: string[];
  accessStartTime?: number;
  accessEndTime?: number;
  maxAccessDuration?: number;
  requireAllConditions?: boolean;
  maxAccessCount?: number;
}

export interface CreateAccessControlRequest {
  fileCid: string;
  accessRule: AccessControlRule;
}

export interface UpdateAccessControlRequest {
  fileCid: string;
  accessRule: AccessControlRule;
}

export interface ValidateAccessRequest {
  fileCid: string;
  userAddress?: string;
  userEmail?: string;
}

export interface AccessControlResponse {
  success: boolean;
  data?: {
    transactionDigest?: string;
    accessGranted?: boolean;
    userAddress?: string;
    userEmail?: string;
  };
  message: string;
}

export interface AccessControlInfo {
  fileCid: string;
  owner: string;
  conditionType: string;
  allowedEmails: string[];
  allowedAddresses: string[];
  allowedSuiNS: string[];
  accessStartTime?: number;
  accessEndTime?: number;
  requireAllConditions: boolean;
  currentAccessCount: number;
  totalUserRecords: number;
}

export interface AccessControlInfoResponse {
  success: boolean;
  data?: AccessControlInfo;
  message: string;
}

export interface ShareLinkRequest {
  fileCid: string;
  expirationTime?: number;
  maxUses?: number;
}

export interface ShareLinkResponse {
  success: boolean;
  data?: {
    shareLink: string;
    shareId: string;
    expirationTime?: number;
    maxUses?: number;
  };
  message: string;
}

export interface ValidateShareLinkResponse {
  success: boolean;
  data?: {
    fileCid: string;
    accessGranted: boolean;
    filename?: string;
    fileSize?: number;
    contentType?: string;
    isEncrypted?: boolean;
  };
  message: string;
}

export interface BulkAccessData {
  emails: string[];
  addresses: string[];
  suiNSNames: string[];
}

export interface ParsedBulkData {
  emails: string[];
  addresses: string[];
  suiNSNames: string[];
  errors: string[];
}

class AccessControlService {
  /**
   * Get authorization headers
   */
  private getAuthHeaders(token: string | null): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Create access control rules for a file
   */
  async createAccessControl(
    token: string | null,
    request: CreateAccessControlRequest,
    useTestMode: boolean = false
  ): Promise<AccessControlResponse> {
    try {
      const endpoint = useTestMode 
        ? `${API_BASE_URL}/access-control/test` 
        : `${API_BASE_URL}/access-control`;

      const headers = this.getAuthHeaders(token);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create access control');
      }

      return {
        success: true,
        data: {
          transactionDigest: data.data?.transactionDigest,
        },
        message: data.message || 'Access control created successfully',
      };
    } catch (error) {
      console.error('Failed to create access control:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create access control',
      };
    }
  }

  /**
   * Update access control rules for a file
   */
  async updateAccessControl(
    token: string | null,
    request: UpdateAccessControlRequest,
    useTestMode: boolean = false
  ): Promise<AccessControlResponse> {
    try {
      const endpoint = useTestMode
        ? `${API_BASE_URL}/access-control/test`
        : `${API_BASE_URL}/access-control`;

      const headers = this.getAuthHeaders(token);

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers,
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update access control');
      }

      return {
        success: true,
        data: {
          transactionDigest: data.data?.transactionDigest,
        },
        message: data.message || 'Access control updated successfully',
      };
    } catch (error) {
      console.error('Failed to update access control:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update access control',
      };
    }
  }

  /**
   * Validate access to a file
   */
  async validateAccess(
    token: string | null,
    request: ValidateAccessRequest,
    useTestMode: boolean = false
  ): Promise<AccessControlResponse> {
    try {
      const endpoint = useTestMode 
        ? `${API_BASE_URL}/access-control/validate-test` 
        : `${API_BASE_URL}/access-control/validate`;

      const headers = this.getAuthHeaders(token);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to validate access');
      }

      return {
        success: true,
        data: {
          accessGranted: data.data?.accessGranted,
          userAddress: data.data?.userAddress,
          userEmail: data.data?.userEmail,
        },
        message: data.message || 'Access validation completed',
      };
    } catch (error) {
      console.error('Failed to validate access:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to validate access',
      };
    }
  }

  /**
   * Get access control information for a file
   */
  async getAccessControlInfo(
    token: string | null,
    fileCid: string,
    useTestMode: boolean = false
  ): Promise<AccessControlInfoResponse> {
    try {
      const endpoint = useTestMode 
        ? `${API_BASE_URL}/access-control/${fileCid}/test` 
        : `${API_BASE_URL}/access-control/${fileCid}`;

      const headers = this.getAuthHeaders(token);

      const response = await fetch(endpoint, {
        method: 'GET',
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get access control info');
      }

      return {
        success: true,
        data: data.data,
        message: data.message || 'Access control information retrieved',
      };
    } catch (error) {
      console.error('Failed to get access control info:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get access control info',
      };
    }
  }

  /**
   * Check if current user can access a file
   */
  async checkAccess(
    token: string | null,
    fileCid: string,
    useTestMode: boolean = false
  ): Promise<AccessControlResponse> {
    try {
      const endpoint = useTestMode 
        ? `${API_BASE_URL}/access-control/validate-test` 
        : `${API_BASE_URL}/access-control/${fileCid}/check`;

      const headers = this.getAuthHeaders(token);

      const response = await fetch(endpoint, {
        method: useTestMode ? 'POST' : 'GET',
        headers,
        body: useTestMode ? JSON.stringify({ fileCid }) : undefined,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to check access');
      }

      return {
        success: true,
        data: {
          accessGranted: data.data?.accessGranted,
          userAddress: data.data?.userAddress,
          userEmail: data.data?.userEmail,
        },
        message: data.message || 'Access check completed',
      };
    } catch (error) {
      console.error('Failed to check access:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to check access',
      };
    }
  }

  /**
   * Validate access rule structure
   */
  validateAccessRule(rule: AccessControlRule): { valid: boolean; error?: string } {
    // Check condition type
    if (!['email', 'wallet', 'time', 'hybrid'].includes(rule.conditionType)) {
      return { valid: false, error: 'Invalid condition type' };
    }

    // Validate email addresses
    if (rule.allowedEmails && rule.allowedEmails.length > 0) {
      for (const email of rule.allowedEmails) {
        if (!this.isValidEmail(email)) {
          return { valid: false, error: `Invalid email address: ${email}` };
        }
      }
    }

    // Validate wallet addresses
    if (rule.allowedAddresses && rule.allowedAddresses.length > 0) {
      for (const address of rule.allowedAddresses) {
        if (!isValidSuiAddress(address)) {
          return { valid: false, error: `Invalid Sui address: ${address}` };
        }
      }
    }

    // Validate SuiNS names
    if (rule.allowedSuiNS && rule.allowedSuiNS.length > 0) {
      for (const suiNS of rule.allowedSuiNS) {
        if (!this.isValidSuiNS(suiNS)) {
          return { valid: false, error: `Invalid SuiNS name: ${suiNS}` };
        }
      }
    }

    // Validate time constraints
    if (rule.accessStartTime && rule.accessEndTime) {
      if (rule.accessStartTime >= rule.accessEndTime) {
        return { valid: false, error: 'Access start time must be before end time' };
      }
    }

    if (rule.maxAccessDuration && rule.maxAccessDuration <= 0) {
      return { valid: false, error: 'Max access duration must be positive' };
    }

    if (rule.maxAccessCount && rule.maxAccessCount <= 0) {
      return { valid: false, error: 'Max access count must be positive' };
    }

    // Ensure at least one access method is specified for hybrid type
    if (rule.conditionType === 'hybrid') {
      const hasEmail = rule.allowedEmails && rule.allowedEmails.length > 0;
      const hasAddress = rule.allowedAddresses && rule.allowedAddresses.length > 0;
      const hasTime = rule.accessStartTime || rule.accessEndTime || rule.maxAccessDuration;

      if (!hasEmail && !hasAddress && !hasTime) {
        return { valid: false, error: 'Hybrid access control must specify at least one access method' };
      }
    }

    return { valid: true };
  }

  /**
   * Validate email address format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }



  /**
   * Validate SuiNS name format
   */
  private isValidSuiNS(suiNS: string): boolean {
    // SuiNS names should end with .sui and contain valid characters
    const suiNSRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]\.sui$/;
    return suiNSRegex.test(suiNS) && suiNS.length >= 4 && suiNS.length <= 64;
  }

  /**
   * Generate a shareable link for a file
   */
  async generateShareLink(
    token: string | null,
    request: ShareLinkRequest,
    useTestMode: boolean = false
  ): Promise<ShareLinkResponse> {
    try {
      const endpoint = useTestMode
        ? `${API_BASE_URL}/access-control/share-link-test`
        : `${API_BASE_URL}/access-control/share-link`;

      const headers = this.getAuthHeaders(token);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to generate share link');
      }

      return {
        success: true,
        data: {
          shareLink: data.data?.shareLink,
          shareId: data.data?.shareId,
          expirationTime: data.data?.expirationTime,
          maxUses: data.data?.maxUses,
        },
        message: data.message || 'Share link generated successfully',
      };
    } catch (error) {
      console.error('Failed to generate share link:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to generate share link',
      };
    }
  }

  /**
   * Validate a share link and get file access information
   */
  async validateShareLink(shareId: string): Promise<ValidateShareLinkResponse> {
    try {
      const endpoint = `${API_BASE_URL}/access-control/share/${shareId}`;

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to validate share link');
      }

      return {
        success: true,
        data: {
          fileCid: data.data?.fileCid,
          accessGranted: data.data?.accessGranted || false,
          filename: data.data?.filename,
          fileSize: data.data?.fileSize,
          contentType: data.data?.contentType,
          isEncrypted: data.data?.isEncrypted,
        },
        message: data.message || 'Share link validated successfully',
      };
    } catch (error) {
      console.error('Failed to validate share link:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to validate share link',
      };
    }
  }

  /**
   * Parse bulk upload data from CSV/Excel content
   */
  parseBulkData(content: string, fileType: 'csv' | 'xlsx'): ParsedBulkData {
    const result: ParsedBulkData = {
      emails: [],
      addresses: [],
      suiNSNames: [],
      errors: []
    };

    try {
      let rows: string[][] = [];

      if (fileType === 'csv') {
        // Parse CSV content
        const lines = content.split('\n').filter(line => line.trim());
        rows = lines.map(line => line.split(',').map(cell => cell.trim()));
      }
      // Note: Excel parsing would be handled by the component using xlsx library

      // Process each row
      rows.forEach((row, index) => {
        row.forEach(cell => {
          const trimmedCell = cell.trim();
          if (!trimmedCell) return;

          if (this.isValidEmail(trimmedCell)) {
            if (!result.emails.includes(trimmedCell)) {
              result.emails.push(trimmedCell);
            }
          } else if (isValidSuiAddress(trimmedCell)) {
            if (!result.addresses.includes(trimmedCell)) {
              result.addresses.push(trimmedCell);
            }
          } else if (this.isValidSuiNS(trimmedCell)) {
            if (!result.suiNSNames.includes(trimmedCell)) {
              result.suiNSNames.push(trimmedCell);
            }
          } else {
            result.errors.push(`Row ${index + 1}: Invalid format - ${trimmedCell}`);
          }
        });
      });

    } catch (error) {
      result.errors.push(`Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }
}

export const accessControlService = new AccessControlService();
