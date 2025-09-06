import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a blockchain address for display by truncating the middle portion
 * @param address The full address to format
 * @param showFull Whether to show the full address
 * @param prefixLength Number of characters to show at the beginning
 * @param suffixLength Number of characters to show at the end
 * @returns Formatted address string
 */
export function formatAddress(
  address: string, 
  showFull: boolean = false, 
  prefixLength: number = 6, 
  suffixLength: number = 4
): string {
  if (showFull || address.length <= (prefixLength + suffixLength)) {
    return address;
  }
  return `${address.slice(0, prefixLength)}...${address.slice(-suffixLength)}`;
}
