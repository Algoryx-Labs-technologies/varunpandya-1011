import type { TradeBookItem } from '../types/tradeBook'

/** Mock trade book data – in real app, replace with Get Trade Book API response data */
export function getTradeBookData(): TradeBookItem[] {
  return [
    {
      exchange: 'NSE',
      producttype: 'DELIVERY',
      tradingsymbol: 'NIFTY25FEB25300CE',
      instrumenttype: '',
      symbolgroup: 'EQ',
      strikeprice: '-1',
      optiontype: '',
      expirydate: '',
      marketlot: '1',
      precision: '2',
      multiplier: '-1',
      tradevalue: '175.00',
      transactiontype: 'BUY',
      fillprice: '175.00',
      fillsize: '1',
      orderid: '201020000000095',
      fillid: '50005750',
      filltime: '13:27:53',
    },
  ]
}
