import type { TradeBookItem } from '../types/tradeBook'

export const TRADE_BOOK_COLUMNS: { key: keyof TradeBookItem; label: string }[] = [
  { key: 'orderid', label: 'Order ID' },
  { key: 'fillid', label: 'Fill ID' },
  { key: 'tradingsymbol', label: 'Trading Symbol' },
  { key: 'transactiontype', label: 'Type' },
  { key: 'fillsize', label: 'Fill Size' },
  { key: 'fillprice', label: 'Fill Price' },
  { key: 'tradevalue', label: 'Trade Value' },
  { key: 'filltime', label: 'Fill Time' },
  { key: 'exchange', label: 'Exchange' },
  { key: 'producttype', label: 'Product' },
  { key: 'instrumenttype', label: 'Instrument' },
  { key: 'symbolgroup', label: 'Symbol Group' },
  { key: 'strikeprice', label: 'Strike Price' },
  { key: 'optiontype', label: 'Option Type' },
  { key: 'expirydate', label: 'Expiry' },
  { key: 'marketlot', label: 'Market Lot' },
  { key: 'precision', label: 'Precision' },
  { key: 'multiplier', label: 'Multiplier' },
]
