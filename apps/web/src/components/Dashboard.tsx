import React, { useEffect, useState, useRef } from 'react'
import { getGreeting, formatDateLong } from '../utils/format'
import type { DailyPnLPoint } from '../data/dashboard'
import { getProfile, getRMSLimit, getAllHolding, getPosition, convertPosition, getTradeBook, getOrderBook, getGainersLosers, getPutCallRatio, getOIBuildup, estimateCharges, calculateMargin } from '../data/dashboard'
import type { OrderBookItem } from '../types/orderBook'
import type { TradeBookItem } from '../types/tradeBook'
import type { GainersLosersItem, PCRItem, OIBuildupItem, GainersLosersDataType, GainersLosersExpiryType, OIBuildupDataType, OIBuildupExpiryType, HoldingItem, TotalHolding, PositionItem } from '../types/dashboard'
import OrderStatusWidget from './OrderStatusWidget'

function svgPathFromSeries(points: DailyPnLPoint[], width: number, height: number, isCumulative: boolean): string {
  if (!points.length) return ''
  const vals = points.map((p) => (isCumulative ? p.cumulativePnL : p.dailyPnL))
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const range = max - min || 1
  const padding = 4
  const w = width - padding * 2
  const h = height - padding * 2
  const step = points.length > 1 ? w / (points.length - 1) : 0
  const toX = (i: number) => padding + i * step
  const toY = (v: number) => padding + h - ((v - min) / range) * h
  const d = points
    .map((_, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(vals[i])}`)
    .join(' ')
  return d
}

function CumulativeChart({ points, width, height }: { points: DailyPnLPoint[]; width: number; height: number }) {
  const pathD = svgPathFromSeries(points, width, height, true)
  const lastVal = points[points.length - 1]?.cumulativePnL ?? 0
  const fillColor = lastVal >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'
  return (
    <svg className="dashboard-chart-svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="cumulativeGrad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={fillColor} stopOpacity="0.35"/>
          <stop offset="100%" stopColor={fillColor} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path fill="none" stroke={fillColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d={pathD}/>
      <path fill="url(#cumulativeGrad)" d={`${pathD} L ${width - 4} ${height - 4} L 4 ${height - 4} Z`}/>
    </svg>
  )
}

function DailyCumulativeChart({ points, width, height }: { points: DailyPnLPoint[]; width: number; height: number }) {
  const lineD = svgPathFromSeries(points, width, height, true)
  const lastCum = points[points.length - 1]?.cumulativePnL ?? 0
  const lineColor = lastCum >= 0 ? 'var(--accent-blue)' : 'var(--accent-red)'
  const barW = Math.max(2, (width - 8) / points.length - 2)
  const maxAbs = Math.max(...points.map((p) => Math.abs(p.dailyPnL)), 1)
  return (
    <svg className="dashboard-chart-svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {points.map((p, i) => {
        const x = 4 + i * ((width - 8) / points.length)
        const barH = (Math.abs(p.dailyPnL) / maxAbs) * (height * 0.4)
        const y = p.dailyPnL >= 0 ? height - 4 - barH : height - 4
        const fill = p.dailyPnL >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'
        return <rect key={i} x={x} y={y} width={barW} height={barH} fill={fill} opacity="0.85"/>
      })}
      <path fill="none" stroke={lineColor} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" d={lineD} opacity="0.9"/>
    </svg>
  )
}

// Cache key for storing user name in localStorage
const USER_NAME_CACHE_KEY = 'algoryx_user_name'

export default function Dashboard() {
  // Initialize userName from localStorage or default to 'Trader'
  const [userName, setUserName] = useState(() => {
    const cachedName = localStorage.getItem(USER_NAME_CACHE_KEY)
    return cachedName || 'Trader'
  })
  const [todayPnL, setTodayPnL] = useState(0)
  const [todayTrades, setTodayTrades] = useState(0)
  const [todayWins, setTodayWins] = useState(0)
  const [monthlyPnL, setMonthlyPnL] = useState(0)
  const [netPnL, setNetPnL] = useState(0)
  const [netPnLPercent, setNetPnLPercent] = useState(0)
  const [winRate, setWinRate] = useState(0)
  const [totalTrades, setTotalTrades] = useState(0)
  const [profitFactor, setProfitFactor] = useState<number | null>(null)
  const [accountBalance, setAccountBalance] = useState(0)
  const [riskRewardStr, setRiskRewardStr] = useState('—')
  const [totalGains, setTotalGains] = useState(0)
  const [totalLosses, setTotalLosses] = useState(0)
  const [pnlSeries, setPnlSeries] = useState<DailyPnLPoint[]>([])
  const [orderBook, setOrderBook] = useState<OrderBookItem[]>([])
  const [tradeBook, setTradeBook] = useState<TradeBookItem[]>([])
  const [period, setPeriod] = useState(30)
  const [activeTab, setActiveTab] = useState<'live' | 'prop'>('live')
  const [gainersLosersData, setGainersLosersData] = useState<GainersLosersItem[]>([])
  const [gainersDataType, setGainersDataType] = useState<GainersLosersDataType>('PercPriceGainers')
  const [gainersExpiry, setGainersExpiry] = useState<GainersLosersExpiryType>('NEAR')
  const [pcrData, setPcrData] = useState<PCRItem[]>([])
  const [oiBuildupData, setOiBuildupData] = useState<OIBuildupItem[]>([])
  const [oiBuildupDataType, setOiBuildupDataType] = useState<OIBuildupDataType>('Long Built Up')
  const [oiBuildupExpiry, setOiBuildupExpiry] = useState<OIBuildupExpiryType>('NEAR')
  const [brokerageCalc, setBrokerageCalc] = useState({
    symbol: '',
    token: '',
    exchange: 'NSE',
    product: 'DELIVERY',
    transaction: 'BUY',
    quantity: '',
    price: '',
  })
  const [brokerageResult, setBrokerageResult] = useState<any>(null)
  const [holdings, setHoldings] = useState<HoldingItem[]>([])
  const [totalholding, setTotalholding] = useState<TotalHolding | null>(null)
  const [selectedHolding, setSelectedHolding] = useState<HoldingItem | null>(null)
  const [positionsNet, setPositionsNet] = useState<PositionItem[]>([])
  const [positionsDay, setPositionsDay] = useState<PositionItem[]>([])
  const [convertPositionSelected, setConvertPositionSelected] = useState<PositionItem | null>(null)
  const [convertNewProduct, setConvertNewProduct] = useState<string>('INTRADAY')
  const [convertResult, setConvertResult] = useState<string | null>(null)
  const [marginPositions, setMarginPositions] = useState<{ exchange: string; qty: string; price: string; productType: string; token: string; tradeType: string }[]>([
    { exchange: 'NSE', qty: '', price: '', productType: 'MARGIN', token: '', tradeType: 'BUY' },
  ])
  const [marginResult, setMarginResult] = useState<{ totalMarginRequired: number; marginComponents: Record<string, number> } | null>(null)
  const [, setIsLoading] = useState(true) // Loading state for future use
  const [hasInitialLoad, setHasInitialLoad] = useState(false)
  const isMountedRef = useRef(true)
  const loadDataRef = useRef<Promise<void> | null>(null)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Separate effect to load profile name - runs independently
  useEffect(() => {
    let cancelled = false
    
    const loadProfile = async () => {
      try {
        const profileRes = await getProfile()
        if (!cancelled && isMountedRef.current && profileRes?.status && profileRes?.data?.name) {
          const name = profileRes.data.name.trim()
          if (name) {
            // Update state and cache in localStorage
            setUserName(name)
            localStorage.setItem(USER_NAME_CACHE_KEY, name)
            console.log('Profile name loaded and cached:', name)
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load profile:', error)
          // On error, keep the cached name if available
        }
      }
    }
    
    loadProfile()
    return () => {
      cancelled = true
    }
  }, []) // Run once on mount

  useEffect(() => {
    // Prevent duplicate calls in React.StrictMode
    if (loadDataRef.current) {
      return
    }

    const loadData = async () => {
      setIsLoading(true)
      try {
        const [profile, rms, holding, tradeBookRes, orderBookRes] = await Promise.allSettled([
          getProfile(),
          getRMSLimit(),
          getAllHolding(),
          getTradeBook().catch(() => ({ status: true, data: [] })),
          getOrderBook().catch(() => ({ status: true, data: [] })),
        ])

        // Only update state if component is still mounted
        if (!isMountedRef.current) return

        // Update profile name if not already set (fallback)
        if (profile.status === 'fulfilled') {
          const profileData = profile.value
          if (profileData?.status && profileData?.data?.name) {
            const name = profileData.data.name.trim()
            if (name && isMountedRef.current) {
              setUserName(name)
              // Also cache it
              localStorage.setItem(USER_NAME_CACHE_KEY, name)
            }
          }
        }

        // Account balance from RMS: availablecash or net
        if (rms.status === 'fulfilled' && rms.value?.data) {
          const cash = Number(rms.value.data.availablecash ?? rms.value.data.net ?? 0)
          setAccountBalance(cash)
        }

        if (holding.status === 'fulfilled' && holding.value?.data?.totalholding) {
          const th = holding.value.data.totalholding
          setNetPnL(th.totalprofitandloss)
          setNetPnLPercent(th.totalpnlpercentage ?? 0)
          setTotalholding(th)
        }

        if (holding.status === 'fulfilled' && holding.value?.data?.holdings?.length) {
          const holdingsList = holding.value.data.holdings
          setHoldings(holdingsList)
          const total = holdingsList.length
          const wins = holdingsList.filter((h) => (h.profitandloss ?? 0) > 0).length
          setTotalTrades(total)
          setWinRate(total ? (wins / total) * 100 : 0)
          const gains = holdingsList.filter((h) => (h.profitandloss ?? 0) > 0).reduce((s, h) => s + (h.profitandloss ?? 0), 0)
          const losses = Math.abs(holdingsList.filter((h) => (h.profitandloss ?? 0) < 0).reduce((s, h) => s + (h.profitandloss ?? 0), 0))
          setTotalGains(gains)
          setTotalLosses(losses)
          if (losses > 0) {
            setProfitFactor(gains / losses)
          } else {
            setProfitFactor(gains > 0 ? null : 0) // null = "—" when no losses but have gains
          }
          if (losses > 0 && gains > 0) {
            const rr = (gains / losses).toFixed(2)
            setRiskRewardStr(`1:${rr}`)
          } else {
            setRiskRewardStr('—')
          }
        }

        if (tradeBookRes.status === 'fulfilled' && tradeBookRes.value?.status && Array.isArray(tradeBookRes.value.data)) {
          const trades = tradeBookRes.value.data
          setTradeBook(trades)
          setTodayTrades(trades.length)
          const wins = trades.filter((t) => Number(t.tradevalue) > 0 && t.transactiontype === 'SELL').length
          setTodayWins(wins)
          const todayPnL = trades.reduce((sum, t) => sum + Number(t.tradevalue) * (t.transactiontype === 'SELL' ? 1 : -1), 0)
          setTodayPnL(todayPnL)
          
          // Calculate monthly P&L from trades in current month
          const now = new Date()
          const currentMonth = now.getMonth()
          const currentYear = now.getFullYear()
          const monthlyTrades = trades.filter((t) => {
            if (!t.filltime) return false
            const tradeDate = new Date(t.filltime)
            return tradeDate.getMonth() === currentMonth && tradeDate.getFullYear() === currentYear
          })
          const monthlyPnLValue = monthlyTrades.reduce((sum, t) => sum + Number(t.tradevalue) * (t.transactiontype === 'SELL' ? 1 : -1), 0)
          setMonthlyPnL(monthlyPnLValue)
        }

        if (orderBookRes.status === 'fulfilled' && orderBookRes.value?.status && Array.isArray(orderBookRes.value.data)) {
          setOrderBook(orderBookRes.value.data)
        }

        setHasInitialLoad(true)
      } catch (error) {
        console.error('Failed to load dashboard data:', error)
        // Don't reset state on error - preserve existing data
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false)
        }
        loadDataRef.current = null
      }
    }
    
    loadDataRef.current = loadData()
  }, [])

  // Build P&L series from trade book data
  useEffect(() => {
    if (tradeBook.length === 0) {
      // No trade data - show empty series or use totalholding if available
      if (totalholding != null) {
        const end = new Date()
        const start = new Date(end)
        start.setDate(start.getDate() - period)
        const totalPnL = totalholding.totalprofitandloss
        // Show simple two-point series: start at 0, end at total P&L
        setPnlSeries([
          { date: start.toISOString().slice(0, 10), dailyPnL: 0, cumulativePnL: 0 },
          { date: end.toISOString().slice(0, 10), dailyPnL: totalPnL, cumulativePnL: totalPnL },
        ])
      } else {
        setPnlSeries([])
      }
      return
    }

    const end = new Date()
    const start = new Date(end)
    start.setDate(start.getDate() - period)
    
    // Group trades by date and calculate daily P&L
    const tradesByDate = new Map<string, number>()
    
    tradeBook.forEach((trade) => {
      if (!trade.filltime) return
      try {
        const tradeDate = new Date(trade.filltime)
        const dateStr = tradeDate.toISOString().slice(0, 10)
        const dateObj = new Date(dateStr)
        
        // Only include trades within the period
        if (dateObj >= start && dateObj <= end) {
          const pnl = Number(trade.tradevalue) * (trade.transactiontype === 'SELL' ? 1 : -1)
          tradesByDate.set(dateStr, (tradesByDate.get(dateStr) || 0) + pnl)
        }
      } catch (e) {
        // Skip invalid dates
        console.warn('Invalid trade date:', trade.filltime)
      }
    })

    // Build series with all days in period
    const series: DailyPnLPoint[] = []
    let cumulativePnL = 0

    for (let i = 0; i < period; i++) {
      const date = new Date(start)
      date.setDate(date.getDate() + i)
      const dateStr = date.toISOString().slice(0, 10)
      const dailyPnL = tradesByDate.get(dateStr) || 0
      cumulativePnL += dailyPnL
      series.push({
        date: dateStr,
        dailyPnL,
        cumulativePnL,
      })
    }

    setPnlSeries(series)
  }, [period, totalholding, tradeBook])

  useEffect(() => {
    if (!hasInitialLoad || !isMountedRef.current) return

    let cancelled = false
    const loadGainersLosers = async () => {
      try {
        const res = await getGainersLosers(gainersDataType, gainersExpiry)
        if (!cancelled && isMountedRef.current && res?.data) {
          setGainersLosersData(res.data)
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load gainers/losers:', error)
        }
        // Preserve existing data on error
      }
    }
    
    loadGainersLosers()
    return () => {
      cancelled = true
    }
  }, [gainersDataType, gainersExpiry, hasInitialLoad])

  useEffect(() => {
    if (!hasInitialLoad || !isMountedRef.current) return

    let cancelled = false
    const loadPCR = async () => {
      try {
        const res = await getPutCallRatio()
        if (!cancelled && isMountedRef.current && res?.data) {
          setPcrData(res.data)
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load PCR:', error)
        }
        // Preserve existing data on error
      }
    }
    
    loadPCR()
    return () => {
      cancelled = true
    }
  }, [hasInitialLoad])

  useEffect(() => {
    if (!hasInitialLoad || !isMountedRef.current) return

    let cancelled = false
    const loadOIBuildup = async () => {
      try {
        const res = await getOIBuildup(oiBuildupExpiry, oiBuildupDataType)
        if (!cancelled && isMountedRef.current && res?.data) {
          setOiBuildupData(res.data)
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load OI buildup:', error)
        }
        // Preserve existing data on error
      }
    }
    
    loadOIBuildup()
    return () => {
      cancelled = true
    }
  }, [oiBuildupDataType, oiBuildupExpiry, hasInitialLoad])

  useEffect(() => {
    if (!hasInitialLoad || !isMountedRef.current) return

    let cancelled = false
    const loadPositions = async () => {
      try {
        const res = await getPosition()
        if (!cancelled && isMountedRef.current) {
          if (res?.data?.net) setPositionsNet(res.data.net)
          if (res?.data?.day) setPositionsDay(res.data.day)
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load positions:', error)
        }
        // Preserve existing data on error
      }
    }
    
    loadPositions()
    return () => {
      cancelled = true
    }
  }, [hasInitialLoad])

  const handleConvertPosition = async () => {
    if (!convertPositionSelected) return
    setConvertResult(null)
    try {
      const qty = Math.abs(Number(convertPositionSelected.netqty))
      const res = await convertPosition({
        exchange: convertPositionSelected.exchange,
        symboltoken: convertPositionSelected.symboltoken,
        oldproducttype: convertPositionSelected.producttype,
        newproducttype: convertNewProduct,
        tradingsymbol: convertPositionSelected.tradingsymbol,
        symbolname: convertPositionSelected.symbolname,
        instrumenttype: convertPositionSelected.instrumenttype ?? '',
        priceden: convertPositionSelected.priceden ?? '1',
        pricenum: convertPositionSelected.pricenum ?? '1',
        genden: convertPositionSelected.genden ?? '1',
        gennum: convertPositionSelected.gennum ?? '1',
        precision: convertPositionSelected.precision ?? '2',
        multiplier: convertPositionSelected.multiplier ?? '-1',
        boardlotsize: convertPositionSelected.boardlotsize ?? '1',
        buyqty: convertPositionSelected.buyqty,
        sellqty: convertPositionSelected.sellqty,
        buyamount: convertPositionSelected.buyamount,
        sellamount: convertPositionSelected.sellamount,
        transactiontype: Number(convertPositionSelected.netqty) >= 0 ? 'BUY' : 'SELL',
        quantity: qty,
        type: 'DAY',
      })
      setConvertResult(res.status ? 'Conversion successful.' : res.message)
    } catch (error: any) {
      setConvertResult(error?.message || 'Conversion failed.')
    }
  }

  const handleBrokerageCalc = async () => {
    if (!brokerageCalc.symbol || !brokerageCalc.token || !brokerageCalc.quantity || !brokerageCalc.price || Number(brokerageCalc.quantity) < 1 || Number(brokerageCalc.price) <= 0) {
      return
    }
    try {
      const res = await estimateCharges([{
        product_type: brokerageCalc.product,
        transaction_type: brokerageCalc.transaction,
        quantity: brokerageCalc.quantity,
        price: brokerageCalc.price,
        exchange: brokerageCalc.exchange,
        symbol_name: brokerageCalc.symbol,
        token: brokerageCalc.token,
      }])
      if (res?.data?.summary) {
        setBrokerageResult(res.data.summary)
      }
    } catch (error) {
      console.error('Failed to calculate brokerage:', error)
    }
  }

  const handleMarginCalc = async () => {
    const valid = marginPositions.filter(
      (p) => p.token.trim() && Number(p.qty) > 0 && Number(p.price) > 0
    )
    if (valid.length === 0) return
    if (valid.length > 50) {
      setMarginResult(null)
      return
    }
    setMarginResult(null)
    try {
      const res = await calculateMargin(
        valid.map((p) => ({
          exchange: p.exchange,
          qty: Number(p.qty),
          price: Number(p.price),
          productType: p.productType,
          token: p.token.trim(),
          tradeType: p.tradeType,
          orderType: 'LIMIT',
        }))
      )
      if (res?.data) setMarginResult(res.data)
    } catch (error) {
      console.error('Failed to calculate margin:', error)
    }
  }

  const addMarginPosition = () => {
    if (marginPositions.length >= 50) return
    setMarginPositions((prev) => [...prev, { exchange: 'NSE', qty: '', price: '', productType: 'MARGIN', token: '', tradeType: 'BUY' }])
  }
  const removeMarginPosition = (index: number) => {
    setMarginPositions((prev) => prev.filter((_, i) => i !== index))
    setMarginResult(null)
  }
  const updateMarginPosition = (index: number, field: string, value: string) => {
    setMarginPositions((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)))
    setMarginResult(null)
  }

  const chartW = 400
  const chartH = 140
  const series = pnlSeries.length > 0 ? pnlSeries : []

  const todayPnLClass = todayPnL >= 0 ? 'positive' : 'negative'
  const monthlyPnLClass = monthlyPnL >= 0 ? 'positive' : 'negative'
  const netPnLClass = netPnL >= 0 ? 'positive' : 'negative'

  return (
    <div className="page-content page-content-dashboard">
      <div className="dashboard-top-bar">
        <div className="dashboard-monthly-pnl">
          <span className="dashboard-monthly-label">Monthly P&L</span>
          <span className={`dashboard-monthly-value ${monthlyPnLClass}`}>
            {monthlyPnL >= 0 ? '+' : ''}₹{Math.abs(monthlyPnL).toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      <div className="dashboard-hero">
        <div className="dashboard-hero-left">
          <p className="dashboard-date">{formatDateLong(new Date())}</p>
          <h1 className="dashboard-greeting">
            {getGreeting()}, <span className="dashboard-greeting-name">{userName}</span>
          </h1>
          <p className="dashboard-message">Stay focused. Every trade is a learning opportunity.</p>
        </div>
        <div className="dashboard-hero-right">
          <div className="dashboard-daily-summary">
            <div className="dashboard-daily-item">
              <span className="dashboard-daily-label">TODAY'S P&L</span>
              <span className={`dashboard-daily-value ${todayPnLClass}`}>
                {todayPnL >= 0 ? '+' : ''}₹{Math.abs(todayPnL).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="dashboard-daily-item">
              <span className="dashboard-daily-label">TRADES</span>
              <span className="dashboard-daily-value">{todayTrades}</span>
            </div>
            <div className="dashboard-daily-item">
              <span className="dashboard-daily-label">WINS</span>
              <span className="dashboard-daily-value">{todayWins}</span>
            </div>
          </div>
          <div className="dashboard-tabs">
            <button
              type="button"
              className={`dashboard-tab ${activeTab === 'live' ? 'active' : ''}`}
              onClick={() => setActiveTab('live')}
            >
              Live Trading
            </button>
            <button
              type="button"
              className={`dashboard-tab ${activeTab === 'prop' ? 'active' : ''}`}
              onClick={() => setActiveTab('prop')}
            >
              Prop Firm
            </button>
          </div>
          <div className="dashboard-actions">
            <button type="button" className="dashboard-btn-secondary">Tour</button>
            <select
              className="dashboard-select"
              value={period}
              onChange={(e) => setPeriod(Number(e.target.value))}
              aria-label="Period"
            >
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
            </select>
            <button type="button" className="dashboard-btn-secondary">Customize</button>
          </div>
        </div>
      </div>

      <div className="dashboard-kpi-grid">
        <div className="dashboard-kpi-card">
          <div className="dashboard-kpi-label">Net P&L</div>
          <div className={`dashboard-kpi-value ${netPnLClass}`}>
            ₹{netPnL.toLocaleString('en-IN')}
          </div>
          <div className={`dashboard-kpi-sub ${netPnLClass}`}>
            {netPnLPercent >= 0 ? '+' : ''}{netPnLPercent}% return
          </div>
          <div className="dashboard-kpi-sparkline">
            {series.length > 0 ? (
              <CumulativeChart points={series.slice(-14)} width={120} height={36} />
            ) : (
              <div style={{ width: 120, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '10px' }}>No data</div>
            )}
          </div>
        </div>
        <div className="dashboard-kpi-card">
          <div className="dashboard-kpi-label">Win Rate</div>
          <div className="dashboard-kpi-value">{winRate}%</div>
          <div className="dashboard-kpi-sub">{totalTrades} trades</div>
          <div className="dashboard-kpi-gauge">
            <div className="dashboard-gauge-track">
              <div className="dashboard-gauge-fill" style={{ width: `${winRate}%` }}></div>
            </div>
          </div>
        </div>
        <div className="dashboard-kpi-card">
          <div className="dashboard-kpi-label">Profit Factor</div>
          <div className="dashboard-kpi-value">
            {profitFactor == null ? '—' : profitFactor === 0 ? '0' : profitFactor.toFixed(2)}
          </div>
          <div className="dashboard-kpi-sub">
            {profitFactor != null && profitFactor > 0 ? (profitFactor > 1 ? 'Favourable' : 'Even') : '—'}
          </div>
        </div>
        <div className="dashboard-kpi-card">
          <div className="dashboard-kpi-label">Account Balance</div>
          <div className="dashboard-kpi-value">
            ₹{accountBalance >= 1000 ? (accountBalance / 1000).toFixed(1) + 'K' : accountBalance.toLocaleString('en-IN')}
          </div>
          <div className="dashboard-kpi-sub">Current balance</div>
          <div className="dashboard-kpi-sparkline">
            {series.length > 0 ? (
              <CumulativeChart points={series.slice(-14)} width={120} height={36} />
            ) : (
              <div style={{ width: 120, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '10px' }}>No data</div>
            )}
          </div>
        </div>
        <div className="dashboard-kpi-card">
          <div className="dashboard-kpi-label">Risk : Reward</div>
          <div className="dashboard-kpi-value">{riskRewardStr}</div>
          <div className="dashboard-kpi-sub">
            <span className="positive">+{totalGains.toFixed(0)}</span>{' '}
            <span className="negative">-{totalLosses.toFixed(0)}</span>
          </div>
        </div>
      </div>

      <div className="dashboard-charts-row">
        <div className="dashboard-card dashboard-card-score">
          <div className="dashboard-card-header">
            <h3 className="dashboard-card-title">Performance Score</h3>
          </div>
          <div className="dashboard-radar-wrap">
            <div className="dashboard-radar-placeholder">
              <span className="dashboard-ai-score-label">Score</span>
              <span className="dashboard-ai-score-value">
                {totalTrades > 0 ? Math.round(winRate * (profitFactor != null && profitFactor > 0 ? Math.min(profitFactor, 2) : 1) / 2) : 0}
              </span>
            </div>
            <div className="dashboard-score-bar">
              <div 
                className="dashboard-score-fill" 
                style={{ 
                  width: `${totalTrades > 0 ? Math.min(Math.round(winRate * (profitFactor != null && profitFactor > 0 ? Math.min(profitFactor, 2) : 1) / 2), 100) : 0}%` 
                }}
              ></div>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px', textAlign: 'center' }}>
              Based on Win Rate & Profit Factor
            </div>
          </div>
        </div>
        <div className="dashboard-card dashboard-card-chart">
          <div className="dashboard-card-header">
            <h3 className="dashboard-card-title">Net Cumulative P&L</h3>
          </div>
          <div className="dashboard-chart-wrap">
            {series.length > 0 ? (
              <CumulativeChart points={series} width={chartW} height={chartH} />
            ) : (
              <div style={{ width: chartW, height: chartH, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>No data available</div>
            )}
          </div>
          <div className="dashboard-chart-labels">
            {series.length > 0 ? (
              <>
                <span>{series[0].date}</span>
                <span>{series[series.length - 1].date}</span>
              </>
            ) : (
              <span>No data</span>
            )}
          </div>
        </div>
        <div className="dashboard-card dashboard-card-chart">
          <div className="dashboard-card-header">
            <h3 className="dashboard-card-title">Daily & Cumulative Net P&L</h3>
          </div>
          <div className="dashboard-chart-wrap">
            {series.length > 0 ? (
              <DailyCumulativeChart points={series} width={chartW} height={chartH} />
            ) : (
              <div style={{ width: chartW, height: chartH, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>No data available</div>
            )}
          </div>
          <div className="dashboard-chart-labels">
            {series.length > 0 ? (
              <>
                <span>{series[0].date.slice(5)}</span>
                <span>{series[series.length - 1].date.slice(5)}</span>
              </>
            ) : (
              <span>No data</span>
            )}
          </div>
        </div>
      </div>

      <div className="dashboard-holdings-positions-row">
        <div className="dashboard-card market-data-card">
          <div className="dashboard-card-header">
            <h3 className="dashboard-card-title">Get All Holdings</h3>
          </div>
          {totalholding && (
            <div className="holdings-summary">
              <span>Total value: ₹{totalholding.totalholdingvalue.toLocaleString('en-IN')}</span>
              <span>Inv: ₹{totalholding.totalinvvalue.toLocaleString('en-IN')}</span>
              <span className={totalholding.totalprofitandloss >= 0 ? 'positive' : 'negative'}>
                P&L: ₹{totalholding.totalprofitandloss.toFixed(2)} ({totalholding.totalpnlpercentage}%)
              </span>
            </div>
          )}
          <div className="market-data-table-wrap">
            <table className="market-data-table">
              <thead>
                <tr>
                  <th className="market-data-th">Symbol</th>
                  <th className="market-data-th">Qty</th>
                  <th className="market-data-th">Avg</th>
                  <th className="market-data-th">LTP</th>
                  <th className="market-data-th">P&L</th>
                  <th className="market-data-th">P&L %</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((h, i) => {
                  const pnlClass = h.profitandloss >= 0 ? 'positive' : 'negative'
                  return (
                    <tr
                      key={i}
                      className="market-data-tr holdings-row"
                      onClick={() => setSelectedHolding(h)}
                    >
                      <td className="market-data-td">{h.tradingsymbol}</td>
                      <td className="market-data-td">{h.quantity}</td>
                      <td className="market-data-td">₹{h.averageprice.toFixed(2)}</td>
                      <td className="market-data-td">₹{h.ltp.toFixed(2)}</td>
                      <td className={`market-data-td ${pnlClass}`}>₹{h.profitandloss.toFixed(2)}</td>
                      <td className={`market-data-td ${pnlClass}`}>{h.pnlpercentage.toFixed(2)}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {selectedHolding && (
            <div className="holding-detail" onClick={(e) => e.stopPropagation()}>
              <div className="holding-detail-header">
                <h4>Single Holding: {selectedHolding.tradingsymbol}</h4>
                <button type="button" className="holding-detail-close" onClick={() => setSelectedHolding(null)}>×</button>
              </div>
              <dl className="holding-detail-dl">
                <dt>Exchange</dt><dd>{selectedHolding.exchange}</dd>
                <dt>ISIN</dt><dd>{selectedHolding.isin}</dd>
                <dt>Quantity</dt><dd>{selectedHolding.quantity}</dd>
                <dt>Product</dt><dd>{selectedHolding.product}</dd>
                <dt>Avg Price</dt><dd>₹{selectedHolding.averageprice.toFixed(2)}</dd>
                <dt>LTP</dt><dd>₹{selectedHolding.ltp.toFixed(2)}</dd>
                <dt>Close</dt><dd>₹{selectedHolding.close?.toFixed(2) ?? '-'}</dd>
                <dt>P&L</dt><dd className={selectedHolding.profitandloss >= 0 ? 'positive' : 'negative'}>₹{selectedHolding.profitandloss.toFixed(2)}</dd>
                <dt>P&L %</dt><dd className={selectedHolding.pnlpercentage >= 0 ? 'positive' : 'negative'}>{selectedHolding.pnlpercentage.toFixed(2)}%</dd>
              </dl>
            </div>
          )}
        </div>

        <div className="dashboard-card market-data-card">
          <div className="dashboard-card-header">
            <h3 className="dashboard-card-title">Get Position</h3>
          </div>
          <div className="positions-tabs">
            <h4 className="positions-subtitle">Net (current portfolio)</h4>
            <div className="market-data-table-wrap">
              <table className="market-data-table">
                <thead>
                  <tr>
                    <th className="market-data-th">Symbol</th>
                    <th className="market-data-th">Product</th>
                    <th className="market-data-th">Net Qty</th>
                    <th className="market-data-th">Net Value</th>
                    <th className="market-data-th">Net Price</th>
                  </tr>
                </thead>
                <tbody>
                  {positionsNet.map((p, i) => (
                    <tr key={i} className="market-data-tr">
                      <td className="market-data-td">{p.tradingsymbol}</td>
                      <td className="market-data-td">{p.producttype}</td>
                      <td className="market-data-td">{p.netqty}</td>
                      <td className="market-data-td">{p.netvalue}</td>
                      <td className="market-data-td">{p.netprice}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <h4 className="positions-subtitle">Day (today&apos;s activity)</h4>
            <div className="market-data-table-wrap">
              <table className="market-data-table">
                <thead>
                  <tr>
                    <th className="market-data-th">Symbol</th>
                    <th className="market-data-th">Product</th>
                    <th className="market-data-th">Net Qty</th>
                    <th className="market-data-th">Net Value</th>
                  </tr>
                </thead>
                <tbody>
                  {positionsDay.length === 0 ? (
                    <tr><td className="market-data-td market-data-td-muted" colSpan={4}>No day positions</td></tr>
                  ) : (
                    positionsDay.map((p, i) => (
                      <tr key={i} className="market-data-tr">
                        <td className="market-data-td">{p.tradingsymbol}</td>
                        <td className="market-data-td">{p.producttype}</td>
                        <td className="market-data-td">{p.netqty}</td>
                        <td className="market-data-td">{p.netvalue}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="dashboard-card market-data-card">
          <div className="dashboard-card-header">
            <h3 className="dashboard-card-title">Convert Position</h3>
          </div>
          <p className="convert-position-desc">Change a position&apos;s margin product (e.g. DELIVERY → INTRADAY).</p>
          <div className="convert-position-form">
            <div className="brokerage-row">
              <label className="brokerage-label">Position</label>
              <select
                className="brokerage-input"
                value={convertPositionSelected ? `${convertPositionSelected.symboltoken}-${convertPositionSelected.tradingsymbol}` : ''}
                onChange={(e) => {
                  const v = e.target.value
                  if (!v) { setConvertPositionSelected(null); return }
                  const pos = [...positionsNet, ...positionsDay].find(
                    (p) => `${p.symboltoken}-${p.tradingsymbol}` === v
                  )
                  setConvertPositionSelected(pos ?? null)
                }}
                aria-label="Select position"
              >
                <option value="">Select position</option>
                {[...positionsNet, ...positionsDay].map((p, i) => (
                  <option key={i} value={`${p.symboltoken}-${p.tradingsymbol}`}>
                    {p.tradingsymbol} ({p.producttype})
                  </option>
                ))}
              </select>
            </div>
            <div className="brokerage-row">
              <label className="brokerage-label">New product type</label>
              <select
                className="brokerage-input"
                value={convertNewProduct}
                onChange={(e) => setConvertNewProduct(e.target.value)}
                aria-label="New product"
              >
                <option value="DELIVERY">DELIVERY</option>
                <option value="INTRADAY">INTRADAY</option>
                <option value="MARGIN">MARGIN</option>
              </select>
            </div>
            <button
              type="button"
              className="brokerage-btn-calc"
              onClick={handleConvertPosition}
              disabled={!convertPositionSelected}
            >
              Convert Position
            </button>
            {convertResult && <p className="convert-position-result">{convertResult}</p>}
          </div>
        </div>
      </div>

      <div className="dashboard-market-row">
        <div className="dashboard-card market-data-card">
          <div className="dashboard-card-header">
            <h3 className="dashboard-card-title">Top Gainers / Losers</h3>
            <div className="market-data-controls">
              <select
                className="market-data-select"
                value={gainersDataType}
                onChange={(e) => setGainersDataType(e.target.value as GainersLosersDataType)}
                aria-label="Data type"
              >
                <option value="PercPriceGainers">Price Gainers</option>
                <option value="PercPriceLosers">Price Losers</option>
                <option value="PercOIGainers">OI Gainers</option>
                <option value="PercOILosers">OI Losers</option>
              </select>
              <select
                className="market-data-select"
                value={gainersExpiry}
                onChange={(e) => setGainersExpiry(e.target.value as GainersLosersExpiryType)}
                aria-label="Expiry"
              >
                <option value="NEAR">NEAR</option>
                <option value="NEXT">NEXT</option>
                <option value="FAR">FAR</option>
              </select>
            </div>
          </div>
          <div className="market-data-table-wrap">
            <table className="market-data-table">
              <thead>
                <tr>
                  <th className="market-data-th">Symbol</th>
                  <th className="market-data-th">% Chg</th>
                  <th className="market-data-th">LTP</th>
                  <th className="market-data-th">Net Chg</th>
                </tr>
              </thead>
              <tbody>
                {gainersLosersData.slice(0, 10).map((r, i) => {
                  const pct = r.percentChange
                  const pctClass = pct >= 0 ? 'positive' : 'negative'
                  const pctStr = (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%'
                  const netChg = r.netChange
                  const netChgClass = netChg >= 0 ? 'positive' : 'negative'
                  const netChgStr = (netChg >= 0 ? '+' : '') + Number(netChg).toLocaleString('en-IN', { maximumFractionDigits: 2 })
                  return (
                    <tr key={i} className="market-data-tr">
                      <td className="market-data-td">{r.tradingSymbol}</td>
                      <td className={`market-data-td ${pctClass}`}>{pctStr}</td>
                      <td className="market-data-td market-data-td-muted">
                        {Number(r.ltp).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>
                      <td className={`market-data-td ${netChgClass}`}>{netChgStr}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="dashboard-card market-data-card">
          <div className="dashboard-card-header">
            <h3 className="dashboard-card-title">PCR (Put-Call Ratio)</h3>
          </div>
          <div className="market-data-table-wrap">
            <table className="market-data-table">
              <thead>
                <tr>
                  <th className="market-data-th">Symbol</th>
                  <th className="market-data-th">PCR</th>
                </tr>
              </thead>
              <tbody>
                {pcrData.length === 0 ? (
                  <tr className="market-data-tr">
                    <td colSpan={2} className="market-data-td market-data-td-muted" style={{ textAlign: 'center' }}>
                      No data
                    </td>
                  </tr>
                ) : (
                  pcrData.slice(0, 12).map((r, i) => (
                    <tr key={i} className="market-data-tr">
                      <td className="market-data-td">{r.tradingSymbol}</td>
                      <td className="market-data-td market-data-pcr">{Number(r.pcr).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="dashboard-card market-data-card">
          <div className="dashboard-card-header">
            <h3 className="dashboard-card-title">OI Buildup</h3>
            <div className="market-data-controls">
              <select
                className="market-data-select"
                value={oiBuildupDataType}
                onChange={(e) => setOiBuildupDataType(e.target.value as OIBuildupDataType)}
                aria-label="Data type"
              >
                <option value="Long Built Up">Long Built Up</option>
                <option value="Short Built Up">Short Built Up</option>
                <option value="Short Covering">Short Covering</option>
                <option value="Long Unwinding">Long Unwinding</option>
              </select>
              <select
                className="market-data-select"
                value={oiBuildupExpiry}
                onChange={(e) => setOiBuildupExpiry(e.target.value as OIBuildupExpiryType)}
                aria-label="Expiry"
              >
                <option value="NEAR">NEAR</option>
                <option value="NEXT">NEXT</option>
                <option value="FAR">FAR</option>
              </select>
            </div>
          </div>
          <div className="market-data-table-wrap">
            <table className="market-data-table">
              <thead>
                <tr>
                  <th className="market-data-th">Symbol</th>
                  <th className="market-data-th">LTP</th>
                  <th className="market-data-th">% Chg</th>
                  <th className="market-data-th">OI</th>
                </tr>
              </thead>
              <tbody>
                {oiBuildupData.length === 0 ? (
                  <tr className="market-data-tr">
                    <td colSpan={4} className="market-data-td market-data-td-muted" style={{ textAlign: 'center' }}>
                      No data
                    </td>
                  </tr>
                ) : (
                  oiBuildupData.slice(0, 10).map((r, i) => {
                    const pct = Number(r.percentChange)
                    const pctClass = pct >= 0 ? 'positive' : 'negative'
                    const pctStr = (pct >= 0 ? '+' : '') + Number(r.percentChange).toFixed(2) + '%'
                    return (
                      <tr key={i} className="market-data-tr">
                        <td className="market-data-td">{r.tradingSymbol}</td>
                        <td className="market-data-td market-data-td-muted">{r.ltp}</td>
                        <td className={`market-data-td ${pctClass}`}>{pctStr}</td>
                        <td className="market-data-td market-data-td-muted">
                          {Number(r.opnInterest).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="dashboard-bottom-row">
        <OrderStatusWidget />

        <div className="dashboard-card dashboard-card-wide">
          <div className="dashboard-card-header">
            <h3 className="dashboard-card-title">Order Book</h3>
            <span className="dashboard-sync-badge">
              {orderBook.length} {orderBook.length === 1 ? 'order' : 'orders'} synced today
            </span>
          </div>
          <div className="dashboard-recent-table-wrap">
            <table className="dashboard-recent-table">
              <thead>
                <tr>
                  <th className="dashboard-recent-th">DATE</th>
                  <th className="dashboard-recent-th">SYMBOL</th>
                  <th className="dashboard-recent-th">P&L</th>
                </tr>
              </thead>
              <tbody>
                {orderBook.map((o, i) => {
                  const dateStr = o.filltime || o.updatetime || o.exchtime || ''
                  const timeOnly = dateStr.includes(' ') ? dateStr.split(' ')[1] || dateStr : dateStr
                  const date = timeOnly || '-'
                  return (
                    <tr key={o.uniqueorderid || i} className="dashboard-recent-tr">
                      <td className="dashboard-recent-td">{date}</td>
                      <td className="dashboard-recent-td">{o.tradingsymbol}</td>
                      <td className="dashboard-recent-td">—</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="dashboard-card dashboard-card-wide">
          <div className="dashboard-card-header">
            <h3 className="dashboard-card-title">Trade Book</h3>
            <span className="dashboard-sync-badge">
              {tradeBook.length} {tradeBook.length === 1 ? 'trade' : 'trades'} synced today
            </span>
          </div>
          <div className="dashboard-recent-table-wrap">
            <table className="dashboard-recent-table">
              <thead>
                <tr>
                  <th className="dashboard-recent-th">DATE</th>
                  <th className="dashboard-recent-th">SYMBOL</th>
                  <th className="dashboard-recent-th">P&L</th>
                </tr>
              </thead>
              <tbody>
                {tradeBook.map((t, i) => {
                  const date = t.filltime || '-'
                  const value = Number(t.tradevalue)
                  const pnlClass = value >= 0 ? 'positive' : 'negative'
                  const pnlStr = value >= 0 ? `+₹${value.toFixed(2)}` : `₹${value.toFixed(2)}`
                  return (
                    <tr key={t.orderid || t.fillid || i} className="dashboard-recent-tr">
                      <td className="dashboard-recent-td">{date}</td>
                      <td className="dashboard-recent-td">{t.tradingsymbol}</td>
                      <td className={`dashboard-recent-td ${pnlClass}`}>{pnlStr}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="dashboard-card dashboard-card-calculator">
          <div className="dashboard-card-header">
            <h3 className="dashboard-card-title">Brokerage Calculator</h3>
          </div>
          <div className="brokerage-calc">
            <div className="brokerage-form">
              <div className="brokerage-row">
                <label className="brokerage-label">Symbol</label>
                <input
                  type="text"
                  className="brokerage-input"
                  placeholder="e.g. SBIN-EQ"
                  value={brokerageCalc.symbol}
                  onChange={(e) => setBrokerageCalc({ ...brokerageCalc, symbol: e.target.value })}
                />
              </div>
              <div className="brokerage-row">
                <label className="brokerage-label">Token</label>
                <input
                  type="text"
                  className="brokerage-input"
                  placeholder="e.g. 3045"
                  value={brokerageCalc.token}
                  onChange={(e) => setBrokerageCalc({ ...brokerageCalc, token: e.target.value })}
                />
              </div>
              <div className="brokerage-row">
                <label className="brokerage-label">Exchange</label>
                <select
                  className="brokerage-input"
                  value={brokerageCalc.exchange}
                  onChange={(e) => setBrokerageCalc({ ...brokerageCalc, exchange: e.target.value })}
                >
                  <option value="NSE">NSE</option>
                  <option value="BSE">BSE</option>
                </select>
              </div>
              <div className="brokerage-row">
                <label className="brokerage-label">Product</label>
                <select
                  className="brokerage-input"
                  value={brokerageCalc.product}
                  onChange={(e) => setBrokerageCalc({ ...brokerageCalc, product: e.target.value })}
                >
                  <option value="DELIVERY">DELIVERY</option>
                  <option value="INTRADAY">INTRADAY</option>
                  <option value="MARGIN">MARGIN</option>
                </select>
              </div>
              <div className="brokerage-row">
                <label className="brokerage-label">Transaction</label>
                <select
                  className="brokerage-input"
                  value={brokerageCalc.transaction}
                  onChange={(e) => setBrokerageCalc({ ...brokerageCalc, transaction: e.target.value })}
                >
                  <option value="BUY">BUY</option>
                  <option value="SELL">SELL</option>
                </select>
              </div>
              <div className="brokerage-row">
                <label className="brokerage-label">Quantity</label>
                <input
                  type="number"
                  className="brokerage-input"
                  placeholder="10"
                  min="1"
                  value={brokerageCalc.quantity}
                  onChange={(e) => setBrokerageCalc({ ...brokerageCalc, quantity: e.target.value })}
                />
              </div>
              <div className="brokerage-row">
                <label className="brokerage-label">Price (₹)</label>
                <input
                  type="number"
                  className="brokerage-input"
                  placeholder="800"
                  min="0"
                  step="0.01"
                  value={brokerageCalc.price}
                  onChange={(e) => setBrokerageCalc({ ...brokerageCalc, price: e.target.value })}
                />
              </div>
              <button
                type="button"
                className="brokerage-btn-calc"
                onClick={handleBrokerageCalc}
              >
                Calculate Charges
              </button>
            </div>
            <div className="brokerage-result">
              {!brokerageResult ? (
                <div className="brokerage-result-placeholder">
                  Enter details and click Calculate.
                </div>
              ) : (
                <div className="brokerage-result-content">
                  <div className="brokerage-total">
                    <span>Total Charges</span>
                    <strong>₹{brokerageResult.total_charges.toFixed(2)}</strong>
                  </div>
                  <div className="brokerage-trade-value">
                    <span>Trade Value</span>
                    <span>₹{brokerageResult.trade_value.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="brokerage-breakup">
                    {brokerageResult.breakup
                      .filter((b: any) => b.amount > 0 || (b.breakup && b.breakup.length > 0))
                      .map((b: any, i: number) => (
                        <React.Fragment key={i}>
                          <div className="brokerage-breakup-item">
                            <span>{b.name}</span>
                            <span>₹{b.amount.toFixed(2)}</span>
                          </div>
                          {b.breakup && b.breakup.length > 0
                            ? b.breakup.map((s: any, j: number) => (
                                <div key={j} className="brokerage-breakup-sub">
                                  <span>{s.name}</span>
                                  <span>₹{s.amount.toFixed(2)}</span>
                                </div>
                              ))
                            : null}
                        </React.Fragment>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="dashboard-card dashboard-card-calculator">
          <div className="dashboard-card-header">
            <h3 className="dashboard-card-title">Margin Calculator</h3>
          </div>
          <p className="convert-position-desc">Calculate real-time margin for a basket (max 50 positions).</p>
          <div className="brokerage-calc">
            <div className="brokerage-form">
              {marginPositions.map((pos, idx) => (
                <div key={idx} className="brokerage-row margin-position-row">
                  <span className="margin-position-label">Position {idx + 1}</span>
                  <select
                    className="brokerage-input margin-input-sm"
                    value={pos.exchange}
                    onChange={(e) => updateMarginPosition(idx, 'exchange', e.target.value)}
                    aria-label="Exchange"
                  >
                    <option value="NSE">NSE</option>
                    <option value="BSE">BSE</option>
                    <option value="NFO">NFO</option>
                    <option value="MCX">MCX</option>
                  </select>
                  <input
                    type="text"
                    className="brokerage-input margin-input-sm"
                    placeholder="Token"
                    value={pos.token}
                    onChange={(e) => updateMarginPosition(idx, 'token', e.target.value)}
                  />
                  <select
                    className="brokerage-input margin-input-sm"
                    value={pos.productType}
                    onChange={(e) => updateMarginPosition(idx, 'productType', e.target.value)}
                    aria-label="Product"
                  >
                    <option value="DELIVERY">DELIVERY</option>
                    <option value="INTRADAY">INTRADAY</option>
                    <option value="MARGIN">MARGIN</option>
                  </select>
                  <select
                    className="brokerage-input margin-input-sm"
                    value={pos.tradeType}
                    onChange={(e) => updateMarginPosition(idx, 'tradeType', e.target.value)}
                    aria-label="Trade type"
                  >
                    <option value="BUY">BUY</option>
                    <option value="SELL">SELL</option>
                  </select>
                  <input
                    type="number"
                    className="brokerage-input margin-input-sm"
                    placeholder="Qty"
                    min="1"
                    value={pos.qty}
                    onChange={(e) => updateMarginPosition(idx, 'qty', e.target.value)}
                  />
                  <input
                    type="number"
                    className="brokerage-input margin-input-sm"
                    placeholder="Price"
                    min="0"
                    step="0.01"
                    value={pos.price}
                    onChange={(e) => updateMarginPosition(idx, 'price', e.target.value)}
                  />
                  <button
                    type="button"
                    className="brokerage-btn-calc margin-remove-btn"
                    onClick={() => removeMarginPosition(idx)}
                    aria-label="Remove position"
                    disabled={marginPositions.length === 1}
                  >
                    −
                  </button>
                </div>
              ))}
              <div className="brokerage-row">
                <button type="button" className="brokerage-btn-calc" onClick={addMarginPosition} disabled={marginPositions.length >= 50}>
                  + Add Position
                </button>
                <button type="button" className="brokerage-btn-calc" onClick={handleMarginCalc}>
                  Calculate Margin
                </button>
              </div>
            </div>
            <div className="brokerage-result">
              {!marginResult ? (
                <div className="brokerage-result-placeholder">
                  Add positions and click Calculate Margin.
                </div>
              ) : (
                <div className="brokerage-result-content">
                  <div className="brokerage-total">
                    <span>Total Margin Required</span>
                    <strong>₹{marginResult.totalMarginRequired.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                  </div>
                  {marginResult.marginComponents && Object.keys(marginResult.marginComponents).length > 0 && (
                    <div className="brokerage-breakup">
                      {Object.entries(marginResult.marginComponents).map(([name, amount]) => (
                        <div key={name} className="brokerage-breakup-item">
                          <span>{name}</span>
                          <span>₹{Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

