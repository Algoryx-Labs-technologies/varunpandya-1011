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
  GainersLosersRequest,
  GainersLosersResponse,
  PutCallRatioResponse,
  OIBuildupRequest,
  OIBuildupResponse,
  OptionGreekRequest,
  OptionGreekResponse,
  GetCandleDataRequest,
  GetCandleDataResponse,
  GetOIDataRequest,
  GetOIDataResponse,
  NseIntradayResponse,
  BseIntradayResponse,
  CautionaryScripsResponse,
  SearchScripRequest,
  SearchScripResponse,
  ApiErrorResponse,
  ApiType,
  PlaceOrderRequest,
  PlaceOrderResponse,
  ModifyOrderRequest,
  ModifyOrderResponse,
  CancelOrderRequest,
  CancelOrderResponse,
  GetOrderBookResponse,
  GetTradeBookResponse,
  GetLtpDataRequest,
  GetLtpDataResponse,
  GetOrderDetailsResponse,
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

  /**
   * Top Gainers/Losers
   * Returns top gainers or losers in derivatives (OI or price based) for NEAR/NEXT/FAR expiry
   */
  async getGainersLosers(
    jwtToken: string,
    request: GainersLosersRequest
  ): Promise<GainersLosersResponse> {
    try {
      const config: AxiosRequestConfig = {
        method: 'POST',
        url: '/rest/secure/angelbroking/marketData/v1/gainersLosers',
        headers: this.getHeaders({
          Authorization: `Bearer ${jwtToken}`,
        }),
        data: JSON.stringify(request),
      };

      const response = await this.axiosInstance.request<GainersLosersResponse>(config);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw {
          status: false,
          message: error.response.data?.message || 'Failed to fetch gainers/losers',
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
   * Put-Call Ratio (PCR) Volume
   * Returns PCR for options contracts per underlying (mapped to futures symbol)
   */
  async getPutCallRatio(jwtToken: string): Promise<PutCallRatioResponse> {
    try {
      const config: AxiosRequestConfig = {
        method: 'GET',
        url: '/rest/secure/angelbroking/marketData/v1/putCallRatio',
        headers: this.getHeaders({
          Authorization: `Bearer ${jwtToken}`,
        }),
      };

      const response = await this.axiosInstance.request<PutCallRatioResponse>(config);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw {
          status: false,
          message: error.response.data?.message || 'Failed to fetch put-call ratio',
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
   * OI BuildUp
   * Returns Long Built Up, Short Built Up, Short Covering, or Long Unwinding for NEAR/NEXT/FAR expiry
   */
  async getOIBuildup(
    jwtToken: string,
    request: OIBuildupRequest
  ): Promise<OIBuildupResponse> {
    try {
      const config: AxiosRequestConfig = {
        method: 'POST',
        url: '/rest/secure/angelbroking/marketData/v1/OIBuildup',
        headers: this.getHeaders({
          Authorization: `Bearer ${jwtToken}`,
        }),
        data: JSON.stringify(request),
      };

      const response = await this.axiosInstance.request<OIBuildupResponse>(config);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw {
          status: false,
          message: error.response.data?.message || 'Failed to fetch OI buildup',
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
   * Option Greeks
   * Returns Delta, Gamma, Theta, Vega and Implied Volatility for multiple strike prices for an underlying and expiry
   */
  async getOptionGreek(
    jwtToken: string,
    request: OptionGreekRequest
  ): Promise<OptionGreekResponse> {
    try {
      const config: AxiosRequestConfig = {
        method: 'POST',
        url: '/rest/secure/angelbroking/marketData/v1/optionGreek',
        headers: this.getHeaders({
          Authorization: `Bearer ${jwtToken}`,
        }),
        data: JSON.stringify(request),
      };

      const response = await this.axiosInstance.request<OptionGreekResponse>(config);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw {
          status: false,
          message: error.response.data?.message || 'Failed to fetch option greeks',
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
   * NSE Scrips Allowed for Intraday
   * GET marketData/v1/nseIntraday
   */
  async getNseIntraday(jwtToken: string): Promise<NseIntradayResponse> {
    try {
      const config: AxiosRequestConfig = {
        method: 'GET',
        url: '/rest/secure/angelbroking/marketData/v1/nseIntraday',
        headers: this.getHeaders({ Authorization: `Bearer ${jwtToken}` }),
      };
      const response = await this.axiosInstance.request<NseIntradayResponse>(config);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw {
          status: false,
          message: error.response.data?.message || 'Failed to fetch NSE intraday scrips',
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
   * BSE Scrips Allowed for Intraday
   * GET marketData/v1/bseIntraday
   */
  async getBseIntraday(jwtToken: string): Promise<BseIntradayResponse> {
    try {
      const config: AxiosRequestConfig = {
        method: 'GET',
        url: '/rest/secure/angelbroking/marketData/v1/bseIntraday',
        headers: this.getHeaders({ Authorization: `Bearer ${jwtToken}` }),
      };
      const response = await this.axiosInstance.request<BseIntradayResponse>(config);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw {
          status: false,
          message: error.response.data?.message || 'Failed to fetch BSE intraday scrips',
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
   * Cautionary Scrips
   * GET securities/v1/cautionaryScrips. Optional query: scripconsent=yes
   */
  async getCautionaryScrips(
    jwtToken: string,
    scripconsent?: string
  ): Promise<CautionaryScripsResponse> {
    try {
      const config: AxiosRequestConfig = {
        method: 'GET',
        url: '/rest/secure/angelbroking/securities/v1/cautionaryScrips',
        headers: this.getHeaders({ Authorization: `Bearer ${jwtToken}` }),
        params: scripconsent ? { scripconsent } : undefined,
      };
      const response = await this.axiosInstance.request<CautionaryScripsResponse>(config);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw {
          status: false,
          message: error.response.data?.message || 'Failed to fetch cautionary scrips',
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
   * Search Scrip
   * POST order/v1/searchScrip. One scrip per request.
   */
  async searchScrip(
    jwtToken: string,
    request: SearchScripRequest
  ): Promise<SearchScripResponse> {
    try {
      const config: AxiosRequestConfig = {
        method: 'POST',
        url: '/rest/secure/angelbroking/order/v1/searchScrip',
        headers: this.getHeaders({ Authorization: `Bearer ${jwtToken}` }),
        data: JSON.stringify(request),
      };
      const response = await this.axiosInstance.request<SearchScripResponse>(config);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw {
          status: false,
          message: error.response.data?.message || 'Failed to search scrip',
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
   * Historical API: Get Candle Data
   * Returns OHLCV candles. Uses Historical API key. fromdate/todate format: "yyyy-MM-dd hh:mm"
   */
  async getCandleData(
    jwtToken: string,
    request: GetCandleDataRequest
  ): Promise<GetCandleDataResponse> {
    try {
      const config: AxiosRequestConfig = {
        method: 'POST',
        url: '/rest/secure/angelbroking/historical/v1/getCandleData',
        headers: this.getHeaders(
          { Authorization: `Bearer ${jwtToken}` },
          ApiType.HISTORICAL
        ),
        data: JSON.stringify(request),
      };
      const response = await this.axiosInstance.request<GetCandleDataResponse>(config);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw {
          status: false,
          message: error.response.data?.message || 'Failed to fetch candle data',
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
   * Historical API: Get OI Data
   * Returns historical open interest for F&O. Uses Historical API key. fromdate/todate format: "yyyy-MM-dd hh:mm"
   */
  async getOIData(
    jwtToken: string,
    request: GetOIDataRequest
  ): Promise<GetOIDataResponse> {
    try {
      const config: AxiosRequestConfig = {
        method: 'POST',
        url: '/rest/secure/angelbroking/historical/v1/getOIData',
        headers: this.getHeaders(
          { Authorization: `Bearer ${jwtToken}` },
          ApiType.HISTORICAL
        ),
        data: JSON.stringify(request),
      };
      const response = await this.axiosInstance.request<GetOIDataResponse>(config);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw {
          status: false,
          message: error.response.data?.message || 'Failed to fetch OI data',
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
   * Place Order
   * Place a new order (normal, AMO, or stoploss)
   */
  async placeOrder(
    jwtToken: string,
    request: PlaceOrderRequest
  ): Promise<PlaceOrderResponse> {
    try {
      const payload = {
        ...request,
        quantity: String(request.quantity),
        ...(request.price !== undefined && { price: String(request.price) }),
        ...(request.triggerprice !== undefined && { triggerprice: String(request.triggerprice) }),
        ...(request.squareoff !== undefined && { squareoff: String(request.squareoff) }),
        ...(request.stoploss !== undefined && { stoploss: String(request.stoploss) }),
        ...(request.trailingStopLoss !== undefined && { trailingStopLoss: String(request.trailingStopLoss) }),
      };
      const config: AxiosRequestConfig = {
        method: 'POST',
        url: '/rest/secure/angelbroking/order/v1/placeOrder',
        headers: this.getHeaders({
          Authorization: `Bearer ${jwtToken}`,
        }),
        data: JSON.stringify(payload),
      };
      const response = await this.axiosInstance.request<PlaceOrderResponse>(config);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw {
          status: false,
          message: error.response.data?.message || 'Failed to place order',
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
   * Modify Order
   * Modify an open or pending order
   */
  async modifyOrder(
    jwtToken: string,
    request: ModifyOrderRequest
  ): Promise<ModifyOrderResponse> {
    try {
      const payload = {
        ...request,
        price: String(request.price),
        quantity: String(request.quantity),
      };
      const config: AxiosRequestConfig = {
        method: 'POST',
        url: '/rest/secure/angelbroking/order/v1/modifyOrder',
        headers: this.getHeaders({
          Authorization: `Bearer ${jwtToken}`,
        }),
        data: JSON.stringify(payload),
      };
      const response = await this.axiosInstance.request<ModifyOrderResponse>(config);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw {
          status: false,
          message: error.response.data?.message || 'Failed to modify order',
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
   * Cancel Order
   * Cancel an open or pending order
   */
  async cancelOrder(
    jwtToken: string,
    request: CancelOrderRequest
  ): Promise<CancelOrderResponse> {
    try {
      const config: AxiosRequestConfig = {
        method: 'POST',
        url: '/rest/secure/angelbroking/order/v1/cancelOrder',
        headers: this.getHeaders({
          Authorization: `Bearer ${jwtToken}`,
        }),
        data: JSON.stringify(request),
      };
      const response = await this.axiosInstance.request<CancelOrderResponse>(config);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw {
          status: false,
          message: error.response.data?.message || 'Failed to cancel order',
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
   * Get Order Book
   * Retrieve order book (all orders)
   */
  async getOrderBook(jwtToken: string): Promise<GetOrderBookResponse> {
    try {
      const config: AxiosRequestConfig = {
        method: 'GET',
        url: '/rest/secure/angelbroking/order/v1/getOrderBook',
        headers: this.getHeaders({
          Authorization: `Bearer ${jwtToken}`,
        }),
      };
      const response = await this.axiosInstance.request<GetOrderBookResponse>(config);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw {
          status: false,
          message: error.response.data?.message || 'Failed to fetch order book',
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
   * Get Trade Book
   * Retrieve trade book (trades for current day)
   */
  async getTradeBook(jwtToken: string): Promise<GetTradeBookResponse> {
    try {
      const config: AxiosRequestConfig = {
        method: 'GET',
        url: '/rest/secure/angelbroking/order/v1/getTradeBook',
        headers: this.getHeaders({
          Authorization: `Bearer ${jwtToken}`,
        }),
      };
      const response = await this.axiosInstance.request<GetTradeBookResponse>(config);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw {
          status: false,
          message: error.response.data?.message || 'Failed to fetch trade book',
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
   * Get LTP Data
   * Retrieve last traded price data for a symbol
   */
  async getLtpData(
    jwtToken: string,
    request: GetLtpDataRequest
  ): Promise<GetLtpDataResponse> {
    try {
      const config: AxiosRequestConfig = {
        method: 'POST',
        url: '/rest/secure/angelbroking/order/v1/getLtpData',
        headers: this.getHeaders({
          Authorization: `Bearer ${jwtToken}`,
        }),
        data: JSON.stringify(request),
      };
      const response = await this.axiosInstance.request<GetLtpDataResponse>(config);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw {
          status: false,
          message: error.response.data?.message || 'Failed to fetch LTP data',
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
   * Get Individual Order Details
   * Retrieve order details by uniqueorderid
   */
  async getOrderDetails(
    jwtToken: string,
    uniqueOrderId: string
  ): Promise<GetOrderDetailsResponse> {
    try {
      const config: AxiosRequestConfig = {
        method: 'GET',
        url: `/rest/secure/angelbroking/order/v1/details/${encodeURIComponent(uniqueOrderId)}`,
        headers: this.getHeaders({
          Authorization: `Bearer ${jwtToken}`,
        }),
      };
      const response = await this.axiosInstance.request<GetOrderDetailsResponse>(config);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw {
          status: false,
          message: error.response.data?.message || 'Failed to fetch order details',
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

