/** Trade Book API response item – matches Get Trade Book API */
export interface TradeBookItem {
  exchange: string
  producttype: string
  tradingsymbol: string
  instrumenttype: string
  symbolgroup: string
  strikeprice: string
  optiontype: string
  expirydate: string
  marketlot: string
  precision: string
  multiplier: string
  tradevalue: string
  transactiontype: string
  fillprice: string
  fillsize: string
  orderid: string
  fillid: string
  filltime: string
}
