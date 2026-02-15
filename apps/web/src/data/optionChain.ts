/** Option chain row for NIFTY 50 – CALL | STRIKE | PUT */

export interface OptionChainRow {
  strike: number
  callIv: string
  callDelta: string
  callLtp: string
  callLtpChg: string
  callLtpChgPct: string
  putLtp: string
  putLtpChg: string
  putLtpChgPct: string
  putDelta: string
  putIv: string
  isAtm?: boolean
}

const currentPrice = 25325

export function getOptionChainData(): OptionChainRow[] {
  return [
    { strike: 25200, callIv: '8.45', callDelta: '0.72', callLtp: '₹218.50', callLtpChg: '+35.20', callLtpChgPct: '+19.21%', putLtp: '₹93.40', putLtpChg: '-28.10', putLtpChgPct: '-23.14%', putDelta: '-0.28', putIv: '8.45' },
    { strike: 25250, callIv: '8.38', callDelta: '0.68', callLtp: '₹187.20', callLtpChg: '+31.50', callLtpChgPct: '+20.19%', putLtp: '₹81.80', putLtpChg: '-35.20', putLtpChgPct: '-30.07%', putDelta: '-0.32', putIv: '8.38' },
    { strike: 25300, callIv: '8.33', callDelta: '0.63', callLtp: '₹156.65', callLtpChg: '+36.15', callLtpChgPct: '+29.95%', putLtp: '₹70.25', putLtpChg: '-54.80', putLtpChgPct: '-43.87%', putDelta: '-0.37', putIv: '8.33' },
    { strike: 25350, callIv: '8.30', callDelta: '0.58', callLtp: '₹128.40', callLtpChg: '+28.90', callLtpChgPct: '+29.08%', putLtp: '₹59.60', putLtpChg: '-42.30', putLtpChgPct: '-41.51%', putDelta: '-0.42', putIv: '8.30', isAtm: true },
    { strike: 25400, callIv: '8.28', callDelta: '0.53', callLtp: '₹102.80', callLtpChg: '+22.40', callLtpChgPct: '+27.85%', putLtp: '₹49.90', putLtpChg: '-38.20', putLtpChgPct: '-43.37%', putDelta: '-0.47', putIv: '8.28' },
    { strike: 25450, callIv: '8.26', callDelta: '0.48', callLtp: '₹80.15', callLtpChg: '+18.60', callLtpChgPct: '+30.21%', putLtp: '₹41.20', putLtpChg: '-32.10', putLtpChgPct: '-43.79%', putDelta: '-0.52', putIv: '8.26' },
    { strike: 25500, callIv: '8.24', callDelta: '0.44', callLtp: '₹61.20', callLtpChg: '+14.80', callLtpChgPct: '+31.89%', putLtp: '₹33.50', putLtpChg: '-26.40', putLtpChgPct: '-44.07%', putDelta: '-0.56', putIv: '8.24' },
  ]
}

export function getCurrentNiftyPrice(): number {
  return currentPrice
}
