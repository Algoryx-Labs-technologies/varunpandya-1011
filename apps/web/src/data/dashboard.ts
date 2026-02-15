import type {
  ProfileResponse,
  RMSLimitResponse,
  GetAllHoldingResponse,
  BrokerageEstimateResponse,
  BrokerageOrderInput,
  GainersLosersDataType,
  GainersLosersExpiryType,
  GainersLosersResponse,
  PCRResponse,
  OIBuildupDataType,
  OIBuildupExpiryType,
  OIBuildupResponse,
} from '../types/dashboard'
import type { TradeBookItem } from '../types/tradeBook'

/** Mock: Get Profile – replace with real API call */
export function getProfile(): Promise<ProfileResponse> {
  return Promise.resolve({
    status: true,
    message: 'SUCCESS',
    errorcode: '',
    data: {
      clientcode: 'YOUR_CLIENT_CODE',
      name: 'Varun',
      email: 'varun@gmail.com',
      mobileno: '',
      exchanges: '["NSE","BSE","MCX","CDS","NCDEX","NFO"]',
      products: '["DELIVERY","INTRADAY","MARGIN"]',
      lastlogintime: '',
      brokerid: 'B2C',
    },
  })
}

/** Mock: Get RMS Limit – replace with real API call */
export function getRMSLimit(): Promise<RMSLimitResponse> {
  return Promise.resolve({
    status: true,
    message: 'SUCCESS',
    errorcode: '',
    data: {
      net: '234700',
      availablecash: '230000',
      availableintradaypayin: '0',
      availablelimitmargin: '0',
      collateral: '0',
      m2munrealized: '0',
      m2mrealized: '0',
      utiliseddebits: '0',
      utilisedspan: '0',
      utilisedoptionpremium: '0',
      utilisedholdingsales: '0',
      utilisedexposure: '0',
      utilisedturnover: '0',
      utilisedpayout: '0',
    },
  })
}

/** Mock: Get All Holding – replace with real API call */
export function getAllHolding(): Promise<GetAllHoldingResponse> {
  return Promise.resolve({
    status: true,
    message: 'SUCCESS',
    errorcode: '',
    data: {
      holdings: [
        { tradingsymbol: 'TATASTEEL-EQ', exchange: 'NSE', isin: 'INE081A01020', quantity: 2, product: 'DELIVERY', averageprice: 111.87, ltp: 130.15, symboltoken: '3499', close: 129.6, profitandloss: 37, pnlpercentage: 16.34 },
        { tradingsymbol: 'PARAGMILK-EQ', exchange: 'NSE', isin: 'INE883N01014', quantity: 2, product: 'DELIVERY', averageprice: 154.03, ltp: 201, symboltoken: '17130', close: 192.1, profitandloss: 94, pnlpercentage: 30.49 },
        { tradingsymbol: 'SBIN-EQ', exchange: 'NSE', isin: 'INE062A01020', quantity: 8, product: 'DELIVERY', averageprice: 573.1, ltp: 579.05, symboltoken: '3045', close: 570.5, profitandloss: 48, pnlpercentage: 1.04 },
      ],
      totalholding: {
        totalholdingvalue: 5294,
        totalinvvalue: 5116,
        totalprofitandloss: 178.14,
        totalpnlpercentage: 3.48,
      },
    },
  })
}

/** Mock: Get Trade Book (today's trades) – replace with real API call */
export function getTradeBook(): Promise<{ status: boolean; data: TradeBookItem[] }> {
  return Promise.resolve({
    status: true,
    data: [
      { exchange: 'NSE', producttype: 'DELIVERY', tradingsymbol: 'ITC-EQ', instrumenttype: '', symbolgroup: 'EQ', strikeprice: '-1', optiontype: '', expirydate: '', marketlot: '1', precision: '2', multiplier: '-1', tradevalue: '175.00', transactiontype: 'BUY', fillprice: '175.00', fillsize: '1', orderid: '201020000000095', fillid: '50005750', filltime: '13:27:53' },
      { exchange: 'NSE', producttype: 'INTRADAY', tradingsymbol: 'SBIN-EQ', instrumenttype: '', symbolgroup: 'EQ', strikeprice: '-1', optiontype: '', expirydate: '', marketlot: '1', precision: '2', multiplier: '-1', tradevalue: '-580.00', transactiontype: 'SELL', fillprice: '580.00', fillsize: '1', orderid: '201020000000096', fillid: '50005751', filltime: '14:15:22' },
      { exchange: 'NSE', producttype: 'DELIVERY', tradingsymbol: 'RELIANCE-EQ', instrumenttype: '', symbolgroup: 'EQ', strikeprice: '-1', optiontype: '', expirydate: '', marketlot: '1', precision: '2', multiplier: '-1', tradevalue: '2298.25', transactiontype: 'BUY', fillprice: '2298.25', fillsize: '1', orderid: '201020000000097', fillid: '50005752', filltime: '15:02:10' },
    ],
  })
}

/** Cumulative P&L by day (for charts) – in real app derive from trade book / positions over time */
export interface DailyPnLPoint {
  date: string
  dailyPnL: number
  cumulativePnL: number
}

export function getCumulativePnLSeries(periodDays: number = 30): DailyPnLPoint[] {
  const points: DailyPnLPoint[] = []
  let cum = 0
  const now = new Date()
  for (let i = periodDays - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dayStr = d.toISOString().slice(0, 10)
    const daily = (Math.random() - 0.45) * 800
    cum += daily
    points.push({ date: dayStr, dailyPnL: daily, cumulativePnL: cum })
  }
  return points
}

/** Estimate brokerage – replace with real POST to estimateCharges API */
export function estimateCharges(orders: BrokerageOrderInput[]): Promise<BrokerageEstimateResponse> {
  const tradeValue = orders.reduce((sum, o) => sum + Number(o.quantity) * Number(o.price), 0)
  const totalCharges = tradeValue * 0.0002 + orders.length * 0.5
  const res: BrokerageEstimateResponse = {
    status: true,
    message: 'SUCCESS',
    errorcode: '',
    data: {
      summary: {
        total_charges: Math.round(totalCharges * 100) / 100,
        trade_value: tradeValue,
        breakup: [
          { name: 'Angel One Brokerage', amount: 0, msg: '', breakup: [] },
          { name: 'External Charges', amount: Math.round(totalCharges * 0.9 * 100) / 100, msg: '', breakup: [
            { name: 'Exchange Transaction Charges', amount: Math.round(totalCharges * 0.2 * 100) / 100, msg: '', breakup: [] },
            { name: 'Stamp Duty', amount: Math.round(totalCharges * 0.5 * 100) / 100, msg: '', breakup: [] },
            { name: 'SEBI Fees', amount: Math.round(totalCharges * 0.02 * 100) / 100, msg: '', breakup: [] },
          ]},
          { name: 'Taxes', amount: Math.round(totalCharges * 0.1 * 100) / 100, msg: '', breakup: [
            { name: 'Security Transaction Tax', amount: 0, msg: '', breakup: [] },
            { name: 'GST', amount: Math.round(totalCharges * 0.1 * 100) / 100, msg: '', breakup: [] },
          ]},
        ],
      },
      charges: orders.map(() => ({
        total_charges: totalCharges / orders.length,
        trade_value: tradeValue / orders.length,
        breakup: [],
      })),
    },
  }
  return Promise.resolve(res)
}

/** Mock: Top Gainers/Losers – replace with POST to gainersLosers API */
export function getGainersLosers(
  datatype: GainersLosersDataType,
  _expirytype: GainersLosersExpiryType
): Promise<GainersLosersResponse> {
  const symbols = ['HDFCBANK25JAN24FUT', 'IEX25JAN24FUT', 'KOTAKBANK25JAN24FUT', 'ICICIGI25JAN24FUT', 'DRREDDY25JAN24FUT', 'TATASTEEL25JAN24FUT', 'OFSS25JAN24FUT', 'INDUSINDBK25JAN24FUT', 'CUB25JAN24FUT', 'GUJGASLTD25JAN24FUT']
  const isGainer = datatype.includes('Gainers')
  const data = symbols.map((tradingSymbol, i) => ({
    tradingSymbol,
    percentChange: isGainer ? 20.02 - i * 1.5 : -(10.5 + i * 0.8),
    symbolToken: 55394 + i,
    opnInterest: Math.floor(118861600 * (0.3 + Math.random() * 0.7)),
    netChangeOpnInterest: Math.floor((isGainer ? 1 : -1) * (1.98e7 - i * 1e6)),
  }))
  return Promise.resolve({ status: true, message: 'SUCCESS', errorcode: '', data })
}

/** Mock: PCR Volume – replace with GET putCallRatio API */
export function getPutCallRatio(): Promise<PCRResponse> {
  const data = [
    { pcr: 1.04, tradingSymbol: 'NIFTY25JAN24FUT' },
    { pcr: 0.58, tradingSymbol: 'HEROMOTOCO25JAN24FUT' },
    { pcr: 0.65, tradingSymbol: 'ADANIPORTS25JAN24FUT' },
    { pcr: 0.92, tradingSymbol: 'BANKNIFTY25JAN24FUT' },
    { pcr: 1.12, tradingSymbol: 'RELIANCE25JAN24FUT' },
    { pcr: 0.78, tradingSymbol: 'TCS25JAN24FUT' },
    { pcr: 0.88, tradingSymbol: 'SBIN25JAN24FUT' },
    { pcr: 1.15, tradingSymbol: 'INFY25JAN24FUT' },
  ]
  return Promise.resolve({ status: true, message: 'SUCCESS', errorcode: '', data })
}

/** Mock: OI Buildup – replace with POST OIBuildup API */
export function getOIBuildup(
  _expirytype: OIBuildupExpiryType,
  _datatype: OIBuildupDataType
): Promise<OIBuildupResponse> {
  const data = [
    { symbolToken: '55424', ltp: '723.8', netChange: '-28.25', percentChange: '-3.76', opnInterest: '24982.5', netChangeOpnInterest: '-76.25', tradingSymbol: 'JINDALSTEL25JAN24FUT' },
    { symbolToken: '55452', ltp: '134.25', netChange: '-5.05', percentChange: '-3.63', opnInterest: '67965.0', netChangeOpnInterest: '-3120.0', tradingSymbol: 'NATIONALUM25JAN24FUT' },
    { symbolToken: '55418', ltp: '892.5', netChange: '-12.4', percentChange: '-1.37', opnInterest: '45210.0', netChangeOpnInterest: '-2100.0', tradingSymbol: 'HINDALCO25JAN24FUT' },
    { symbolToken: '55398', ltp: '245.6', netChange: '4.2', percentChange: '1.74', opnInterest: '125000.0', netChangeOpnInterest: '5200.0', tradingSymbol: 'TATAMOTORS25JAN24FUT' },
    { symbolToken: '55461', ltp: '112.3', netChange: '-2.1', percentChange: '-1.84', opnInterest: '98700.0', netChangeOpnInterest: '-1500.0', tradingSymbol: 'ONGC25JAN24FUT' },
  ]
  return Promise.resolve({ status: true, message: 'SUCCESS', errorcode: '', data })
}
