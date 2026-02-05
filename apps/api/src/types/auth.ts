// Authentication types for AngelOne API

export interface LoginRequest {
  clientcode: string;
  password: string;
  totp: string;
  state?: string;
}

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

export interface GenerateTokenRequest {
  refreshToken: string;
}

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

export interface AngelOneApiHeaders {
  'Content-Type': string;
  'Accept': string;
  'X-UserType': string;
  'X-SourceID': string;
  'X-ClientLocalIP': string;
  'X-ClientPublicIP': string;
  'X-MACAddress': string;
  'X-PrivateKey': string;
  'Authorization'?: string;
}

