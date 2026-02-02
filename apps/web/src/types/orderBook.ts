/** Order Book API response item – matches Get Order Book API */
export interface OrderBookItem {
  variety: string
  ordertype: string
  producttype: string
  duration: string
  price: string
  triggerprice: string
  quantity: string
  disclosedquantity: string
  squareoff: string
  stoploss: string
  trailingstoploss: string
  tradingsymbol: string
  transactiontype: string
  exchange: string
  symboltoken: string | null
  instrumenttype: string
  strikeprice: string
  optiontype: string
  expirydate: string
  lotsize: string
  cancelsize: string
  averageprice: string
  filledshares: string
  unfilledshares: string
  orderid: number
  text: string
  status: string
  orderstatus: string
  updatetime: string
  exchtime: string
  exchorderupdatetime: string
  fillid: string
  filltime: string
  parentorderid: string
  uniqueorderid: string
  exchangeorderid: string
}
