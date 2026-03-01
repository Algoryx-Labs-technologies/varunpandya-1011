/** Get Profile API response */
export interface ProfileData {
  clientcode: string
  name: string
  email: string
  mobileno: string
  exchanges: string
  products: string
  lastlogintime: string
  brokerid: string
}

export interface ProfileResponse {
  status: boolean
  message: string
  errorcode: string
  data: ProfileData
}

/** Get RMS Limit API response */
export interface RMSLimitData {
  net: string
  availablecash: string
  availableintradaypayin: string
  availablelimitmargin: string
  collateral: string
  m2munrealized: string
  m2mrealized: string
  utiliseddebits: string
  utilisedspan: string
  utilisedoptionpremium: string
  utilisedholdingsales: string
  utilisedexposure: string
  utilisedturnover: string
  utilisedpayout: string
}

export interface RMSLimitResponse {
  status: boolean
  message: string
  errorcode: string
  data: RMSLimitData
}

/** Get Order Book item */
export interface OrderBookItem {
  variety: string
  ordertype: string
  producttype: string
  duration: string
  price: string
  triggerprice: string
  quantity: string
  tradingsymbol: string
  transactiontype: string
  exchange: string
  averageprice: string
  filledshares: string
  unfilledshares: string
  orderid: string
  status: string
  orderstatus: string
  updatetime: string
  filltime: string
  uniqueorderid: string
}

/** Get Holding / GetAllHolding item */
export interface HoldingItem {
  tradingsymbol: string
  exchange: string
  isin: string
  quantity: number
  product: string
  averageprice: number
  ltp: number
  symboltoken: string
  close: number
  profitandloss: number
  pnlpercentage: number
}

export interface TotalHolding {
  totalholdingvalue: number
  totalinvvalue: number
  totalprofitandloss: number
  totalpnlpercentage: number
}

export interface GetAllHoldingResponse {
  status: boolean
  message: string
  errorcode: string
  data: {
    holdings: HoldingItem[]
    totalholding: TotalHolding
  }
}

/** Get Position item (full API response shape) */
export interface PositionItem {
  exchange: string
  symboltoken: string
  producttype: string
  tradingsymbol: string
  symbolname: string
  instrumenttype?: string
  priceden?: string
  pricenum?: string
  genden?: string
  gennum?: string
  precision?: string
  multiplier?: string
  boardlotsize?: string
  buyqty: string
  sellqty: string
  buyamount: string
  sellamount: string
  symbolgroup?: string
  strikeprice?: string
  optiontype?: string
  expirydate?: string
  lotsize?: string
  cfbuyqty?: string
  cfsellqty?: string
  cfbuyamount?: string
  cfsellamount?: string
  buyavgprice: string
  sellavgprice: string
  avgnetprice?: string
  netvalue: string
  netqty: string
  totalbuyvalue?: string
  totalsellvalue?: string
  cfbuyavgprice?: string
  cfsellavgprice?: string
  totalbuyavgprice?: string
  totalsellavgprice?: string
  netprice: string
}

/** Get Position API returns net (current portfolio) and day (today's activity) */
export interface GetPositionResponse {
  status: boolean
  message: string
  errorcode: string
  data: {
    net?: PositionItem[]
    day?: PositionItem[]
  }
}

/** Position conversion request (change margin product) */
export interface PositionConversionRequest {
  exchange: string
  symboltoken: string
  oldproducttype: string
  newproducttype: string
  tradingsymbol: string
  symbolname: string
  instrumenttype?: string
  priceden?: string
  pricenum?: string
  genden?: string
  gennum?: string
  precision?: string
  multiplier?: string
  boardlotsize?: string
  buyqty: string
  sellqty: string
  buyamount: string
  sellamount: string
  transactiontype: string
  quantity: number
  type: 'DAY' | 'NET'
}

export interface PositionConversionResponse {
  status: boolean
  message: string
  errorcode: string
  data: null
}

/** Brokerage calculator */
export interface BrokerageOrderInput {
  product_type: string
  transaction_type: string
  quantity: string
  price: string
  exchange: string
  symbol_name: string
  token: string
}

export interface BrokerageBreakupItem {
  name: string
  amount: number
  msg: string
  breakup: { name: string; amount: number; msg: string; breakup: unknown[] }[]
}

export interface BrokerageSummary {
  total_charges: number
  trade_value: number
  breakup: BrokerageBreakupItem[]
}

export interface BrokerageEstimateResponse {
  status: boolean
  message: string
  errorcode: string
  data: {
    summary: BrokerageSummary
    charges: { total_charges: number; trade_value: number; breakup: BrokerageBreakupItem[] }[]
  }
}

/** Top Gainers/Losers – datatype: PercOIGainers | PercOILosers | PercPriceGainers | PercPriceLosers, expirytype: NEAR | NEXT | FAR */
export type GainersLosersDataType = 'PercOIGainers' | 'PercOILosers' | 'PercPriceGainers' | 'PercPriceLosers'
export type GainersLosersExpiryType = 'NEAR' | 'NEXT' | 'FAR'

export interface GainersLosersItem {
  tradingSymbol: string
  percentChange: number
  symbolToken: number
  ltp: number
  netChange: number
}

export interface GainersLosersResponse {
  status: boolean
  message: string
  errorcode: string
  data: GainersLosersItem[]
}

/** PCR Volume – Put-Call Ratio (GET, no body) */
export interface PCRItem {
  pcr: number
  tradingSymbol: string
}

export interface PCRResponse {
  status: boolean
  message: string
  errorcode: string
  data: PCRItem[]
}

/** OI Buildup – datatype: "Long Built Up" | "Short Built Up" | "Short Covering" | "Long Unwinding", expirytype: NEAR | NEXT | FAR */
export type OIBuildupDataType = 'Long Built Up' | 'Short Built Up' | 'Short Covering' | 'Long Unwinding'
export type OIBuildupExpiryType = 'NEAR' | 'NEXT' | 'FAR'

export interface OIBuildupItem {
  symbolToken: string
  ltp: string
  netChange: string
  percentChange: string
  opnInterest: string
  netChangeOpnInterest: string
  tradingSymbol: string
}

export interface OIBuildupResponse {
  status: boolean
  message: string
  errorcode: string
  data: OIBuildupItem[]
}
