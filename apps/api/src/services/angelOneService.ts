// AngelOne API service layer

import axios, { AxiosInstance } from 'axios';
import {
  LoginRequest,
  LoginResponse,
  GenerateTokenRequest,
  GenerateTokenResponse,
  ProfileResponse,
  AngelOneApiHeaders,
} from '../types/auth';
import { ANGEL_ONE_CONFIG } from '../config/angelOne';

export class AngelOneService {
  private client: AxiosInstance;
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = ANGEL_ONE_CONFIG.API_KEY;
    this.baseUrl = ANGEL_ONE_CONFIG.BASE_URL;
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
    });
  }

  /**
   * Build headers for AngelOne API requests
   */
  private buildHeaders(
    clientLocalIP: string,
    clientPublicIP: string,
    macAddress: string,
    authorizationToken?: string
  ): AngelOneApiHeaders {
    const headers: AngelOneApiHeaders = {
      ...ANGEL_ONE_CONFIG.DEFAULT_HEADERS,
      'X-ClientLocalIP': clientLocalIP,
      'X-ClientPublicIP': clientPublicIP,
      'X-MACAddress': macAddress,
      'X-PrivateKey': this.apiKey,
    };

    if (authorizationToken) {
      headers['Authorization'] = `Bearer ${authorizationToken}`;
    }

    return headers;
  }

  /**
   * Login to AngelOne API
   */
  async login(
    loginData: LoginRequest,
    clientLocalIP: string,
    clientPublicIP: string,
    macAddress: string
  ): Promise<LoginResponse> {
    const headers = this.buildHeaders(clientLocalIP, clientPublicIP, macAddress);

    const response = await this.client.post<LoginResponse>(
      ANGEL_ONE_CONFIG.ENDPOINTS.LOGIN,
      loginData,
      { headers }
    );

    return response.data;
  }

  /**
   * Generate new tokens using refresh token
   */
  async generateToken(
    tokenData: GenerateTokenRequest,
    authorizationToken: string,
    clientLocalIP: string,
    clientPublicIP: string,
    macAddress: string
  ): Promise<GenerateTokenResponse> {
    const headers = this.buildHeaders(
      clientLocalIP,
      clientPublicIP,
      macAddress,
      authorizationToken
    );

    const response = await this.client.post<GenerateTokenResponse>(
      ANGEL_ONE_CONFIG.ENDPOINTS.GENERATE_TOKEN,
      tokenData,
      { headers }
    );

    return response.data;
  }

  /**
   * Get user profile
   */
  async getProfile(
    authorizationToken: string,
    clientLocalIP: string,
    clientPublicIP: string,
    macAddress: string
  ): Promise<ProfileResponse> {
    const headers = this.buildHeaders(
      clientLocalIP,
      clientPublicIP,
      macAddress,
      authorizationToken
    );

    const response = await this.client.get<ProfileResponse>(
      ANGEL_ONE_CONFIG.ENDPOINTS.PROFILE,
      { headers }
    );

    return response.data;
  }
}

