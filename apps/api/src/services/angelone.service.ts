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
  BrokerageCalculatorRequest,
  BrokerageCalculatorResponse,
  GetHoldingResponse,
  GetAllHoldingsResponse,
  GetPositionResponse,
  ConvertPositionRequest,
  ConvertPositionResponse,
  MarginCalculatorRequest,
  MarginCalculatorResponse,
  ApiErrorResponse,
  ApiType,
} from '../types/angelone.types';
import { angelOneConfig, getApiKeyConfig } from '../config/angelone.config';

export class AngelOneService {
  private axiosInstance: AxiosInstance;
  private baseUrl: string;
  private currentApiType: ApiType;

  constructor(apiType?: ApiType) {
    this.baseUrl = angelOneConfig.baseUrl;
    this.currentApiType = apiType || angelOneConfig.defaultApiType || ApiType.TRADING;
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
   * Set the API type for this service instance
   */
  setApiType(apiType: ApiType): void {
    this.currentApiType = apiType;
  }

  /**
   * Get current API type
   */
  getApiType(): ApiType {
    return this.currentApiType;
  }

  /**
   * Get common headers for API requests
   */
  private getHeaders(additionalHeaders?: Record<string, string>, apiType?: ApiType): Record<string, string> {
    const type = apiType || this.currentApiType;
    const apiKeyConfig = getApiKeyConfig(type);
    
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-UserType': 'USER',
      'X-SourceID': 'WEB',
      'X-ClientLocalIP': angelOneConfig.clientLocalIP || '127.0.0.1',
      'X-ClientPublicIP': angelOneConfig.clientPublicIP || '',
      'X-MACAddress': angelOneConfig.macAddress || '',
      'X-PrivateKey': apiKeyConfig.apiKey,
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

  /**
   * Estimate Brokerage Charges
   * Calculate brokerage charges and taxes for placing trades
   */
  async estimateBrokerageCharges(
    jwtToken: string,
    request: BrokerageCalculatorRequest
  ): Promise<BrokerageCalculatorResponse> {
    try {
      const config: AxiosRequestConfig = {
        method: 'POST',
        url: '/rest/secure/angelbroking/brokerage/v1/estimateCharges',
        headers: this.getHeaders({
          Authorization: `Bearer ${jwtToken}`,
        }),
        data: JSON.stringify(request),
      };

      const response = await this.axiosInstance.request<BrokerageCalculatorResponse>(config);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw {
          status: false,
          message: error.response.data?.message || 'Failed to estimate brokerage charges',
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
   * Get Holding
   * Retrieve holding - long-term equity delivery stocks
   */
  async getHolding(jwtToken: string): Promise<GetHoldingResponse> {
    try {
      const config: AxiosRequestConfig = {
        method: 'GET',
        url: '/rest/secure/angelbroking/portfolio/v1/getHolding',
        headers: this.getHeaders({
          Authorization: `Bearer ${jwtToken}`,
        }),
      };

      const response = await this.axiosInstance.request<GetHoldingResponse>(config);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw {
          status: false,
          message: error.response.data?.message || 'Failed to fetch holdings',
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
   * Get All Holdings
   * Retrieve all holdings with summary of total investments
   */
  async getAllHoldings(jwtToken: string): Promise<GetAllHoldingsResponse> {
    try {
      const config: AxiosRequestConfig = {
        method: 'GET',
        url: '/rest/secure/angelbroking/portfolio/v1/getAllHolding',
        headers: this.getHeaders({
          Authorization: `Bearer ${jwtToken}`,
        }),
      };

      const response = await this.axiosInstance.request<GetAllHoldingsResponse>(config);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw {
          status: false,
          message: error.response.data?.message || 'Failed to fetch all holdings',
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
   * Get Position
   * Retrieve positions - net and day positions
   */
  async getPosition(jwtToken: string): Promise<GetPositionResponse> {
    try {
      const config: AxiosRequestConfig = {
        method: 'GET',
        url: '/rest/secure/angelbroking/order/v1/getPosition',
        headers: this.getHeaders({
          Authorization: `Bearer ${jwtToken}`,
        }),
      };

      const response = await this.axiosInstance.request<GetPositionResponse>(config);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw {
          status: false,
          message: error.response.data?.message || 'Failed to fetch positions',
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
   * Convert Position
   * Convert or change a position's margin product
   */
  async convertPosition(
    jwtToken: string,
    request: ConvertPositionRequest
  ): Promise<ConvertPositionResponse> {
    try {
      const config: AxiosRequestConfig = {
        method: 'POST',
        url: '/rest/secure/angelbroking/order/v1/convertPosition',
        headers: this.getHeaders({
          Authorization: `Bearer ${jwtToken}`,
        }),
        data: JSON.stringify(request),
      };

      const response = await this.axiosInstance.request<ConvertPositionResponse>(config);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw {
          status: false,
          message: error.response.data?.message || 'Failed to convert position',
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
   * Calculate Margin
   * Calculate real-time margin for a basket of positions
   * Rate limit: 10 requests per second
   * Maximum 50 positions per request
   */
  async calculateMargin(
    jwtToken: string,
    request: MarginCalculatorRequest
  ): Promise<MarginCalculatorResponse> {
    try {
      const config: AxiosRequestConfig = {
        method: 'POST',
        url: '/rest/secure/angelbroking/margin/v1/batch',
        headers: this.getHeaders({
          Authorization: `Bearer ${jwtToken}`,
        }),
        data: JSON.stringify(request),
      };

      const response = await this.axiosInstance.request<MarginCalculatorResponse>(config);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw {
          status: false,
          message: error.response.data?.message || 'Failed to calculate margin',
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

