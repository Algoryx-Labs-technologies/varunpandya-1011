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

/** Get Position item */
export interface PositionItem {
  exchange: string
  symboltoken: string
  producttype: string
  tradingsymbol: string
  symbolname: string
  netqty: string
  netvalue: string
  buyavgprice: string
  sellavgprice: string
  netprice: string
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
  opnInterest: number
  netChangeOpnInterest: number
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
