/**
 * AngelOne Authentication Service
 * Handles all API calls to AngelOne SmartAPI
 */
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import {
  LoginRequest,
  LoginResponse,
  GenerateTokenRequest,
  GenerateTokenResponse,
  ProfileResponse,
  RMSLimitResponse,
  LogoutRequest,
  LogoutResponse,
  ApiErrorResponse,
} from '../types/angelone.types';
import { angelOneConfig } from '../config/angelone.config';

export class AngelOneService {
  private axiosInstance: AxiosInstance;
  private baseUrl: string;

  constructor() {
    this.baseUrl = angelOneConfig.baseUrl;
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-UserType': 'USER',
        'X-SourceID': 'WEB',
      },
    });
  }

  /**
   * Get common headers for API requests
   */
  private getHeaders(additionalHeaders?: Record<string, string>): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-UserType': 'USER',
      'X-SourceID': 'WEB',
      'X-ClientLocalIP': angelOneConfig.clientLocalIP || '127.0.0.1',
      'X-ClientPublicIP': angelOneConfig.clientPublicIP || '',
      'X-MACAddress': angelOneConfig.macAddress || '',
      'X-PrivateKey': angelOneConfig.apiKey,
      ...additionalHeaders,
    };
  }

  /**
   * Login with client code, password, and TOTP
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const config: AxiosRequestConfig = {
        method: 'POST',
        url: '/rest/auth/angelbroking/user/v1/loginByPassword',
        headers: this.getHeaders(),
        data: JSON.stringify(credentials),
      };

      const response = await this.axiosInstance.request<LoginResponse>(config);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw {
          status: false,
          message: error.response.data?.message || 'Login failed',
          errorcode: error.response.data?.errorcode || 'UNKNOWN_ERROR',
          data: error.response.data?.data,
        } as ApiErrorResponse;
      }
      throw {
        status: false,
        message: error.message || 'Network error',
        errorcode: 'NETWORK_ERROR',
      } as ApiErrorResponse;
    }
  }

  /**
   * Generate new tokens using refresh token
   */
  async generateToken(
    refreshToken: string,
    authorizationToken?: string
  ): Promise<GenerateTokenResponse> {
    try {
      const requestData: GenerateTokenRequest = {
        refreshToken,
      };

      const headers: Record<string, string> = {};
      if (authorizationToken) {
        headers['Authorization'] = `Bearer ${authorizationToken}`;
      }

      const config: AxiosRequestConfig = {
        method: 'POST',
        url: '/rest/auth/angelbroking/jwt/v1/generateTokens',
        headers: this.getHeaders(headers),
        data: JSON.stringify(requestData),
      };

      const response = await this.axiosInstance.request<GenerateTokenResponse>(config);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw {
          status: false,
          message: error.response.data?.message || 'Token generation failed',
          errorcode: error.response.data?.errorcode || 'UNKNOWN_ERROR',
          data: error.response.data?.data,
        } as ApiErrorResponse;
      }
      throw {
        status: false,
        message: error.message || 'Network error',
        errorcode: 'NETWORK_ERROR',
      } as ApiErrorResponse;
    }
  }

  /**
   * Get user profile
   */
  async getProfile(jwtToken: string): Promise<ProfileResponse> {
    try {
      const config: AxiosRequestConfig = {
        method: 'GET',
        url: '/rest/secure/angelbroking/user/v1/getProfile',
        headers: this.getHeaders({
          Authorization: `Bearer ${jwtToken}`,
        }),
      };

      const response = await this.axiosInstance.request<ProfileResponse>(config);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw {
          status: false,
          message: error.response.data?.message || 'Failed to fetch profile',
          errorcode: error.response.data?.errorcode || 'UNKNOWN_ERROR',
          data: error.response.data?.data,
        } as ApiErrorResponse;
      }
      throw {
        status: false,
        message: error.message || 'Network error',
        errorcode: 'NETWORK_ERROR',
      } as ApiErrorResponse;
    }
  }

  /**
   * Get RMS Limit
   * Returns fund, cash and margin information for equity and commodity segments
   */
  async getRMSLimit(jwtToken: string): Promise<RMSLimitResponse> {
    try {
      const config: AxiosRequestConfig = {
        method: 'GET',
        url: '/rest/secure/angelbroking/user/v1/getRMS',
        headers: this.getHeaders({
          Authorization: `Bearer ${jwtToken}`,
        }),
      };

      const response = await this.axiosInstance.request<RMSLimitResponse>(config);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw {
          status: false,
          message: error.response.data?.message || 'Failed to fetch RMS limit',
          errorcode: error.response.data?.errorcode || 'UNKNOWN_ERROR',
          data: error.response.data?.data,
        } as ApiErrorResponse;
      }
      throw {
        status: false,
        message: error.message || 'Network error',
        errorcode: 'NETWORK_ERROR',
      } as ApiErrorResponse;
    }
  }

  /**
   * Logout
   * Destroys the API session and invalidates the access token
   */
  async logout(jwtToken: string, clientcode: string): Promise<LogoutResponse> {
    try {
      const requestData: LogoutRequest = {
        clientcode,
      };

      const config: AxiosRequestConfig = {
        method: 'POST',
        url: '/rest/secure/angelbroking/user/v1/logout',
        headers: this.getHeaders({
          Authorization: `Bearer ${jwtToken}`,
        }),
        data: JSON.stringify(requestData),
      };

      const response = await this.axiosInstance.request<LogoutResponse>(config);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw {
          status: false,
          message: error.response.data?.message || 'Logout failed',
          errorcode: error.response.data?.errorcode || 'UNKNOWN_ERROR',
          data: error.response.data?.data,
        } as ApiErrorResponse;
      }
      throw {
        status: false,
        message: error.message || 'Network error',
        errorcode: 'NETWORK_ERROR',
      } as ApiErrorResponse;
    }
  }
}

// Export singleton instance
export const angelOneService = new AngelOneService();

