/**
 * AngelOne API Types
 * Type definitions for AngelOne SmartAPI authentication endpoints
 */

/**
 * Login Request
 */
export interface LoginRequest {
  clientcode: string;
  password: string;
  totp: string;
  state?: string;
}

/**
 * Login Response
 */
export interface LoginResponse {
  status: boolean;
  message: string;
  errorcode: string;
  data: {
    jwtToken: string;
    refreshToken: string;
    feedToken: string;
    state?: string;
  };
}

/**
 * Generate Token Request
 */
export interface GenerateTokenRequest {
  refreshToken: string;
}

/**
 * Generate Token Response
 */
export interface GenerateTokenResponse {
  status: boolean;
  message: string;
  errorcode: string;
  data: {
    jwtToken: string;
    refreshToken: string;
    feedToken: string;
  };
}

/**
 * Profile Response
 */
export interface ProfileResponse {
  status: boolean;
  message: string;
  errorcode: string;
  data: {
    clientcode: string;
    name: string;
    email: string;
    mobileno: string;
    exchanges: string[];
    products: string[];
    lastlogintime: string;
    brokerid: string;
  };
}

/**
 * AngelOne API Configuration
 */
export interface AngelOneConfig {
  apiKey: string;
  baseUrl: string;
  clientLocalIP?: string;
  clientPublicIP?: string;
  macAddress?: string;
}

/**
 * RMS Limit Response
 * Returns fund, cash and margin information
 */
export interface RMSLimitResponse {
  status: boolean;
  message: string;
  errorcode: string;
  data: {
    net: string;
    availablecash: string;
    availableintradaypayin: string;
    availablelimitmargin: string;
    collateral: string;
    m2munrealized: string;
    m2mrealized: string;
    utiliseddebits: string;
    utilisedspan: string;
    utilisedoptionpremium: string;
    utilisedholdingsales: string;
    utilisedexposure: string;
    utilisedturnover: string;
    utilisedpayout: string;
  };
}

/**
 * Logout Request
 */
export interface LogoutRequest {
  clientcode: string;
}

/**
 * Logout Response
 */
export interface LogoutResponse {
  status: boolean;
  message: string;
  errorcode: string;
  data: string;
}

/**
 * API Error Response
 */
export interface ApiErrorResponse {
  status: false;
  message: string;
  errorcode: string;
  data?: any;
}

