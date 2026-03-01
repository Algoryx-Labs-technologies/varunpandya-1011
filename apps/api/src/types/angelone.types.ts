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
 * API Type Enum
 */
export enum ApiType {
  TRADING = 'Trading',
  PUBLISHER = 'Publisher',
  HISTORICAL = 'Historical',
  MARKET = 'Market',
}

/**
 * API Key Configuration
 */
export interface ApiKeyConfig {
  apiKey: string;
  secretKey: string;
}

/**
 * AngelOne API Configuration
 */
export interface AngelOneConfig {
  apiKeys: {
    trading: ApiKeyConfig;
    publisher: ApiKeyConfig;
    historical: ApiKeyConfig;
    market: ApiKeyConfig;
  };
  baseUrl: string;
  clientLocalIP?: string;
  clientPublicIP?: string;
  macAddress?: string;
  defaultApiType?: ApiType;
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

// --- Market Data (Gainers/Losers, PCR, OI BuildUp) ---

/** Gainers/Losers datatype: PercPriceGainers | PercPriceLosers | PercOILosers | PercOIGainers */
export type GainersLosersDataType = 'PercPriceGainers' | 'PercPriceLosers' | 'PercOILosers' | 'PercOIGainers';

/** Expiry type: NEAR | NEXT | FAR */
export type GainersLosersExpiryType = 'NEAR' | 'NEXT' | 'FAR';

export interface GainersLosersRequest {
  datatype: GainersLosersDataType;
  expirytype: GainersLosersExpiryType;
}

export interface GainersLosersItem {
  tradingSymbol: string;
  percentChange: number;
  symbolToken: number;
  opnInterest: number;
  netChangeOpnInterest: number;
}

export interface GainersLosersResponse {
  status: boolean;
  message: string;
  errorcode: string;
  data: GainersLosersItem[];
}

export interface PutCallRatioItem {
  pcr: number;
  tradingSymbol: string;
}

export interface PutCallRatioResponse {
  status: boolean;
  message: string;
  errorcode: string;
  data: PutCallRatioItem[];
}

/** OI BuildUp datatype: "Long Built Up" | "Short Built Up" | "Short Covering" | "Long Unwinding" */
export type OIBuildupDataType = 'Long Built Up' | 'Short Built Up' | 'Short Covering' | 'Long Unwinding';

export type OIBuildupExpiryType = 'NEAR' | 'NEXT' | 'FAR';

export interface OIBuildupRequest {
  expirytype: OIBuildupExpiryType;
  datatype: OIBuildupDataType;
}

export interface OIBuildupItem {
  symbolToken: string;
  ltp: string;
  netChange: string;
  percentChange: string;
  opnInterest: string;
  netChangeOpnInterest: string;
  tradingSymbol: string;
}

export interface OIBuildupResponse {
  status: boolean;
  message: string;
  errorcode: string;
  data: OIBuildupItem[];
}

// --- Option Greeks ---

export interface OptionGreekRequest {
  name: string;
  expirydate: string;
}

export interface OptionGreekItem {
  name: string;
  expiry: string;
  strikePrice: string;
  optionType: string;
  delta: string;
  gamma: string;
  theta: string;
  vega: string;
  impliedVolatility: string;
  tradeVolume: string;
}

export interface OptionGreekResponse {
  status: boolean;
  message: string;
  errorcode: string;
  data: OptionGreekItem[];
}

// --- Order APIs ---

/** Order variety: NORMAL | STOPLOSS | ROBO */
export type OrderVariety = 'NORMAL' | 'STOPLOSS' | 'ROBO';

/** Transaction type: BUY | SELL */
export type TransactionType = 'BUY' | 'SELL';

/** Order type: MARKET | LIMIT | STOPLOSS_LIMIT | STOPLOSS_MARKET */
export type OrderType = 'MARKET' | 'LIMIT' | 'STOPLOSS_LIMIT' | 'STOPLOSS_MARKET';

/** Product type: DELIVERY | CARRYFORWARD | MARGIN | INTRADAY | BO */
export type ProductType = 'DELIVERY' | 'CARRYFORWARD' | 'MARGIN' | 'INTRADAY' | 'BO';

/** Duration: DAY | IOC */
export type OrderDuration = 'DAY' | 'IOC';

/** Exchange: BSE | NSE | NFO | MCX | BFO | CDS */
export type OrderExchange = 'BSE' | 'NSE' | 'NFO' | 'MCX' | 'BFO' | 'CDS';

export interface PlaceOrderRequest {
  variety: OrderVariety;
  tradingsymbol: string;
  symboltoken: string;
  exchange: OrderExchange;
  transactiontype: TransactionType;
  ordertype: OrderType;
  producttype: ProductType;
  duration: OrderDuration;
  quantity: string | number;
  price?: string | number;
  triggerprice?: string | number;
  squareoff?: string | number;
  stoploss?: string | number;
  trailingStopLoss?: string | number;
  disclosedquantity?: number;
  ordertag?: string;
  scripconsent?: string;
}

export interface PlaceOrderResponseData {
  script?: string;
  orderid: string;
  uniqueorderid: string;
}

export interface PlaceOrderResponse {
  status: boolean;
  message: string;
  errorcode: string;
  data: PlaceOrderResponseData;
}

export interface ModifyOrderRequest {
  variety: OrderVariety;
  orderid: string;
  ordertype: OrderType;
  producttype: ProductType;
  duration: OrderDuration;
  price: string | number;
  quantity: string | number;
  tradingsymbol?: string;
  symboltoken?: string;
  exchange?: OrderExchange;
}

export interface ModifyOrderResponseData {
  orderid: string;
  uniqueorderid: string;
}

export interface ModifyOrderResponse {
  status: boolean;
  message: string;
  errorcode: string;
  data: ModifyOrderResponseData;
}

export interface CancelOrderRequest {
  variety: OrderVariety;
  orderid: string;
}

export interface CancelOrderResponseData {
  orderid: string;
  uniqueorderid: string;
}

export interface CancelOrderResponse {
  status: boolean;
  message: string;
  errorcode: string;
  data: CancelOrderResponseData;
}

export interface OrderBookItem {
  variety: string;
  ordertype: string;
  producttype: string;
  duration: string;
  price: string;
  triggerprice: string;
  quantity: string;
  disclosedquantity: string;
  squareoff: string;
  stoploss: string;
  trailingstoploss: string;
  tradingsymbol: string;
  transactiontype: string;
  exchange: string;
  symboltoken: string | null;
  instrumenttype: string;
  strikeprice: string;
  optiontype: string;
  expirydate: string;
  lotsize: string;
  cancelsize: string;
  averageprice: string;
  filledshares: string;
  unfilledshares: string;
  orderid: string;
  text: string;
  status: string;
  orderstatus: string;
  updatetime: string;
  exchtime: string;
  exchorderupdatetime: string;
  fillid: string;
  filltime: string;
  parentorderid: string;
  uniqueorderid: string;
  exchangeorderid: string;
}

export interface GetOrderBookResponse {
  status: boolean;
  message: string;
  errorcode: string;
  data: OrderBookItem[];
}

export interface TradeBookItem {
  exchange: string;
  producttype: string;
  tradingsymbol: string;
  instrumenttype: string;
  symbolgroup: string;
  strikeprice: string;
  optiontype: string;
  expirydate: string;
  marketlot: string;
  precision: string;
  multiplier: string;
  tradevalue: string;
  transactiontype: string;
  fillprice: string;
  fillsize: string;
  orderid: string;
  fillid: string;
  filltime: string;
}

export interface GetTradeBookResponse {
  status: boolean;
  message: string;
  errorcode: string;
  data: TradeBookItem[];
}

export interface GetLtpDataRequest {
  exchange: OrderExchange;
  tradingsymbol: string;
  symboltoken: string;
}

export interface LtpDataItem {
  exchange: string;
  tradingsymbol: string;
  symboltoken: string;
  open: string;
  high: string;
  low: string;
  close: string;
  ltp: string;
}

export interface GetLtpDataResponse {
  status: boolean;
  message: string;
  errorcode: string;
  data: LtpDataItem;
}

export interface GetOrderDetailsResponse {
  status: boolean;
  message: string;
  errorcode: string;
  data: OrderBookItem;
}

