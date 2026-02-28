/**
 * AngelOne API Configuration
 */
import dotenv from 'dotenv';
import { AngelOneConfig, ApiType } from '../types/angelone.types';

dotenv.config();

export const angelOneConfig: AngelOneConfig = {
  apiKeys: {
    trading: {
      apiKey: process.env.ANGELONE_TRADING_API_KEY || '',
      secretKey: process.env.ANGELONE_TRADING_SECRET_KEY || '',
    },
    publisher: {
      apiKey: process.env.ANGELONE_PUBLISHER_API_KEY || '',
      secretKey: process.env.ANGELONE_PUBLISHER_SECRET_KEY || '',
    },
    historical: {
      apiKey: process.env.ANGELONE_HISTORICAL_API_KEY || '',
      secretKey: process.env.ANGELONE_HISTORICAL_SECRET_KEY || '',
    },
    market: {
      apiKey: process.env.ANGELONE_MARKET_API_KEY || '',
      secretKey: process.env.ANGELONE_MARKET_SECRET_KEY || '',
    },
  },
  baseUrl: process.env.ANGELONE_BASE_URL || 'https://apiconnect.angelone.in',
  clientLocalIP: process.env.CLIENT_LOCAL_IP || '127.0.0.1',
  clientPublicIP: process.env.CLIENT_PUBLIC_IP || '',
  macAddress: process.env.MAC_ADDRESS || '',
  defaultApiType: (process.env.ANGELONE_DEFAULT_API_TYPE as ApiType) || ApiType.TRADING,
};

/**
 * Get API key configuration by type
 */
export function getApiKeyConfig(apiType?: ApiType): { apiKey: string; secretKey: string } {
  const type = apiType || angelOneConfig.defaultApiType || ApiType.TRADING;
  
  switch (type) {
    case ApiType.TRADING:
      return angelOneConfig.apiKeys.trading;
    case ApiType.PUBLISHER:
      return angelOneConfig.apiKeys.publisher;
    case ApiType.HISTORICAL:
      return angelOneConfig.apiKeys.historical;
    case ApiType.MARKET:
      return angelOneConfig.apiKeys.market;
    default:
      return angelOneConfig.apiKeys.trading;
  }
}

/**
 * Validate configuration
 */
export function validateConfig(): void {
  const requiredKeys = [
    { key: 'ANGELONE_TRADING_API_KEY', value: angelOneConfig.apiKeys.trading.apiKey },
    { key: 'ANGELONE_TRADING_SECRET_KEY', value: angelOneConfig.apiKeys.trading.secretKey },
    { key: 'ANGELONE_PUBLISHER_API_KEY', value: angelOneConfig.apiKeys.publisher.apiKey },
    { key: 'ANGELONE_PUBLISHER_SECRET_KEY', value: angelOneConfig.apiKeys.publisher.secretKey },
    { key: 'ANGELONE_HISTORICAL_API_KEY', value: angelOneConfig.apiKeys.historical.apiKey },
    { key: 'ANGELONE_HISTORICAL_SECRET_KEY', value: angelOneConfig.apiKeys.historical.secretKey },
    { key: 'ANGELONE_MARKET_API_KEY', value: angelOneConfig.apiKeys.market.apiKey },
    { key: 'ANGELONE_MARKET_SECRET_KEY', value: angelOneConfig.apiKeys.market.secretKey },
  ];

  const missingKeys = requiredKeys.filter(({ value }) => !value);

  if (missingKeys.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingKeys.map(({ key }) => key).join(', ')}`
    );
  }
}

