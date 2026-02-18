/**
 * AngelOne API Configuration
 */
import dotenv from 'dotenv';
import { AngelOneConfig } from '../types/angelone.types';

dotenv.config();

export const angelOneConfig: AngelOneConfig = {
  apiKey: process.env.ANGELONE_API_KEY || '',
  baseUrl: process.env.ANGELONE_BASE_URL || 'https://apiconnect.angelone.in',
  clientLocalIP: process.env.CLIENT_LOCAL_IP || '127.0.0.1',
  clientPublicIP: process.env.CLIENT_PUBLIC_IP || '',
  macAddress: process.env.MAC_ADDRESS || '',
};

/**
 * Validate configuration
 */
export function validateConfig(): void {
  if (!angelOneConfig.apiKey) {
    throw new Error('ANGELONE_API_KEY is required in environment variables');
  }
}

