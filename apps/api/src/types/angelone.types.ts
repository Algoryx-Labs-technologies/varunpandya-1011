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
 * Holding Item
 */
export interface HoldingItem {
  tradingsymbol: string;
  exchange: string;
  isin: string;
  t1quantity: number;
  realisedquantity: number;
  quantity: number;
  authorisedquantity: number;
  product: string;
  collateralquantity: number | null;
  collateraltype: string | null;
  haircut: number;
  averageprice: number;
  ltp: number;
  symboltoken: string;
  close: number;
  profitandloss: number;
  pnlpercentage: number;
}

/**
 * Get Holding Response
 */
export interface GetHoldingResponse {
  status: boolean;
  message: string;
  errorcode: string;
  data: HoldingItem[];
}

/**
 * Total Holding Summary
 */
export interface TotalHoldingSummary {
  totalholdingvalue: number;
  totalinvvalue: number;
  totalprofitandloss: number;
  totalpnlpercentage: number;
}

/**
 * Get All Holdings Response
 */
export interface GetAllHoldingsResponse {
  status: boolean;
  message: string;
  errorcode: string;
  data: {
    holdings: HoldingItem[];
    totalholding: TotalHoldingSummary;
  };
}

/**
 * Position Item
 */
export interface PositionItem {
  exchange: string;
  symboltoken: string;
  producttype: string;
  tradingsymbol: string;
  symbolname: string;
  instrumenttype: string;
  priceden: string;
  pricenum: string;
  genden: string;
  gennum: string;
  precision: string;
  multiplier: string;
  boardlotsize: string;
  buyqty: string;
  sellqty: string;
  buyamount: string;
  sellamount: string;
  symbolgroup: string;
  strikeprice: string;
  optiontype: string;
  expirydate: string;
  lotsize: string;
  cfbuyqty: string;
  cfsellqty: string;
  cfbuyamount: string;
  cfsellamount: string;
  buyavgprice: string;
  sellavgprice: string;
  avgnetprice: string;
  netvalue: string;
  netqty: string;
  totalbuyvalue: string;
  totalsellvalue: string;
  cfbuyavgprice: string;
  cfsellavgprice: string;
  totalbuyavgprice: string;
  totalsellavgprice: string;
  netprice: string;
}

/**
 * Get Position Response
 */
export interface GetPositionResponse {
  status: boolean;
  message: string;
  errorcode: string;
  data: PositionItem[];
}

/**
 * Convert Position Request
 */
export interface ConvertPositionRequest {
  exchange: string;
  symboltoken: string;
  oldproducttype: string;
  newproducttype: string;
  tradingsymbol: string;
  symbolname: string;
  instrumenttype: string;
  priceden: string;
  pricenum: string;
  genden: string;
  gennum: string;
  precision: string;
  multiplier: string;
  boardlotsize: string;
  buyqty: string;
  sellqty: string;
  buyamount: string;
  sellamount: string;
  transactiontype: string;
  quantity: number;
  type: string;
}

/**
 * Convert Position Response
 */
export interface ConvertPositionResponse {
  status: boolean;
  message: string;
  errorcode: string;
  data: null;
}

/**
 * Margin Calculator Position
 */
export interface MarginCalculatorPosition {
  exchange: string;
  qty: number;
  price: number;
  productType: string;
  token: string;
  tradeType: string;
  orderType?: string;
}

/**
 * Margin Calculator Request
 */
export interface MarginCalculatorRequest {
  positions: MarginCalculatorPosition[];
}

/**
 * Margin Components
 */
export interface MarginComponents {
  netPremium: number;
  spanMargin: number;
  marginBenefit: number;
  deliveryMargin: number;
  nonNFOMargin: number;
  totOptionsPremium: number;
}

/**
 * Margin Calculator Response
 */
export interface MarginCalculatorResponse {
  status: boolean;
  message: string;
  errorcode: string;
  data: {
    totalMarginRequired: number;
    marginComponents: MarginComponents;
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

