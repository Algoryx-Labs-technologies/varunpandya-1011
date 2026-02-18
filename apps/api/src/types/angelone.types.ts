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
 * Brokerage Calculator Order
 */
export interface BrokerageOrder {
  product_type: string;
  transaction_type: string;
  quantity: string;
  price: string;
  exchange: string;
  symbol_name: string;
  token: string;
}

/**
 * Brokerage Calculator Request
 */
export interface BrokerageCalculatorRequest {
  orders: BrokerageOrder[];
}

/**
 * Charge Breakup Item
 */
export interface ChargeBreakupItem {
  name: string;
  amount: number;
  msg: string;
  breakup: ChargeBreakupItem[];
}

/**
 * Charge Summary
 */
export interface ChargeSummary {
  total_charges: number;
  trade_value: number;
  breakup: ChargeBreakupItem[];
}

/**
 * Charge Detail
 */
export interface ChargeDetail {
  total_charges: number;
  trade_value: number;
  breakup: ChargeBreakupItem[];
}

/**
 * Brokerage Calculator Response
 */
export interface BrokerageCalculatorResponse {
  status: boolean;
  message: string;
  errorcode: string;
  data: {
    summary: ChargeSummary;
    charges: ChargeDetail[];
  };
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

