import { useState, useCallback, useEffect } from 'react'
import type { VertexWsData } from '../../hooks/useWebSocket'
import { getBotApiBase } from '../../utils/botApi'
import PriceChart from './PriceChart'
import OptionChainPanel from './OptionChainPanel'

const LEVEL_TYPES = [
  { code: 'EU', label: 'EU – Easy Up', desc: 'Buy Call on break' },
  { code: 'TFD', label: 'TFD – Target From Down', desc: 'Exit EU' },
  { code: 'ED', label: 'ED – Easy Down', desc: 'Buy Put on break' },
  { code: 'TFU', label: 'TFU – Target From Up', desc: 'Exit ED' },
  { code: 'RU', label: 'RU – Reversal Up', desc: 'Buy Call reversal' },
  { code: 'TFRU', label: 'TFRU – Target For Reversal Up', desc: 'Exit RU' },
  { code: 'RD', label: 'RD – Reversal Down', desc: 'Buy Put reversal' },
  { code: 'TFRD', label: 'TFRD – Target For Reversal Down', desc: 'Exit RD' },
  { code: 'EURTZ', label: 'EURTZ – Easy Up Retest Zone', desc: '2 trades, same strike' },
  { code: 'EDRTZ', label: 'EDRTZ – Easy Down Retest Zone', desc: '2 trades, same strike' },
]

interface ManualLevel {
  id: number
  index: string
  timeframe: string
  type: string
  price: number
  stoploss?: number
  target?: number
}

interface LevelItem {
  type: string
  price: number
  confidence?: number
  stoploss?: number
  target?: number
}

interface BotTradingViewProps {
  data: VertexWsData | null
}

export default function BotTradingView({ data }: BotTradingViewProps) {
  const [selectedIndex, setSelectedIndex] = useState('NIFTY')
  const [selectedTimeframe, setSelectedTimeframe] = useState('5m')
  const [manualLevels, setManualLevels] = useState<ManualLevel[]>([])
  const [form, setForm] = useState({ type: 'EU', price: '', stoploss: '', target: '' })
  const [fileError, setFileError] = useState('')
  const [candles, setCandles] = useState<Array<{ time: string | number; open: number; high: number; low: number; close: number }>>([])

  const base = getBotApiBase()
  const apiBase = base || (typeof window !== 'undefined' ? window.location.origin : '')

  const marketData = data?.marketData?.[selectedIndex]?.[selectedTimeframe]
  const serverLevels = data?.levels?.[selectedIndex]?.[selectedTimeframe]
  const currentLevels: LevelItem[] = serverLevels?.levels ?? []
  const myLevelsForView = manualLevels.filter((l) => l.index === selectedIndex && l.timeframe === selectedTimeframe)

  useEffect(() => {
    const fromWs = data?.ohlc?.[selectedIndex]?.[selectedTimeframe]
    if (fromWs && fromWs.length > 0) {
      setCandles(fromWs)
      return
    }
    fetch(`${apiBase}/api/trading/ohlc?index=${selectedIndex}&timeframe=${selectedTimeframe}&limit=500`)
      .then((res) => res.json())
      .then((r: { status: string; data?: typeof candles }) => {
        if (r.status === 'success' && Array.isArray(r.data)) setCandles(r.data)
        else setCandles([])
      })
      .catch(() => setCandles([]))
  }, [selectedIndex, selectedTimeframe, data?.ohlc?.[selectedIndex]?.[selectedTimeframe], apiBase])

  const buildLevelsPayload = useCallback((): LevelItem[] => {
    const fromServer = currentLevels.map((l) => ({
      type: l.type,
      price: l.price,
      confidence: l.confidence ?? 1,
      stoploss: l.stoploss,
      target: l.target,
    }))
    const fromManual = myLevelsForView.map((l) => ({
      type: l.type,
      price: l.price,
      confidence: 1,
      stoploss: l.stoploss,
      target: l.target,
    }))
    return [...fromServer, ...fromManual]
  }, [currentLevels, myLevelsForView])

  const syncLevelsToBackend = useCallback(
    (levelsArray: LevelItem[]) => {
      fetch(`${apiBase}/api/trading/levels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index: selectedIndex, timeframe: selectedTimeframe, levels: levelsArray }),
      }).catch(() => {})
    },
    [selectedIndex, selectedTimeframe, apiBase]
  )

  const addLevel = useCallback(() => {
    const price = parseFloat(form.price)
    if (!Number.isFinite(price)) return
    const level: ManualLevel = {
      id: Date.now(),
      index: selectedIndex,
      timeframe: selectedTimeframe,
      type: form.type,
      price,
      stoploss: form.stoploss ? parseFloat(form.stoploss) : undefined,
      target: form.target ? parseFloat(form.target) : undefined,
    }
    setManualLevels((prev) => [...prev, level])
    setForm((f) => ({ ...f, price: '', stoploss: '', target: '' }))
    const newPayload = [
      ...buildLevelsPayload(),
      { type: level.type, price: level.price, confidence: 1, stoploss: level.stoploss, target: level.target },
    ]
    syncLevelsToBackend(newPayload)
  }, [form, selectedIndex, selectedTimeframe, buildLevelsPayload, syncLevelsToBackend])

  const removeManualLevel = useCallback(
    (id: number) => {
      setManualLevels((prev) => {
        const next = prev.filter((l) => l.id !== id)
        const remaining = next.filter((l) => l.index === selectedIndex && l.timeframe === selectedTimeframe)
        const payload = [
          ...currentLevels.map((l) => ({ type: l.type, price: l.price, confidence: l.confidence ?? 1, stoploss: l.stoploss, target: l.target })),
          ...remaining.map((l) => ({ type: l.type, price: l.price, confidence: 1, stoploss: l.stoploss, target: l.target })),
        ]
        syncLevelsToBackend(payload)
        return next
      })
    },
    [selectedIndex, selectedTimeframe, currentLevels, syncLevelsToBackend]
  )

  const handleFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFileError('')
      const file = e.target.files?.[0]
      if (!file) return
      const isCsv = file.name.toLowerCase().endsWith('.csv')
      const isExcel = /\.(xlsx?|xls)$/i.test(file.name)
      if (!isCsv && !isExcel) {
        setFileError('Use a .csv or .xlsx file. See sample.')
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const text = String(reader.result)
          const rows: ManualLevel[] = []
          if (isCsv) {
            const lines = text.split(/\r?\n/).filter(Boolean)
            const headers = lines[0].split(',').map((h) => h.trim())
            const priceIdx = headers.findIndex((h) => h.toLowerCase() === 'price')
            const typeIdx = headers.findIndex((h) => h.toLowerCase() === 'type')
            const tfIdx = headers.findIndex((h) => h.toLowerCase() === 'timeframe')
            const indexIdx = headers.findIndex((h) => h.toLowerCase() === 'index')
            const slIdx = headers.findIndex((h) => h.toLowerCase() === 'stoploss')
            const targetIdx = headers.findIndex((h) => h.toLowerCase() === 'target')
            if (priceIdx === -1 || typeIdx === -1 || tfIdx === -1) {
              setFileError('CSV must have columns: price, type, timeframe')
              return
            }
            for (let i = 1; i < lines.length; i++) {
              const cells = lines[i].split(',').map((c) => c.trim())
              const price = parseFloat(cells[priceIdx])
              if (!Number.isFinite(price)) continue
              rows.push({
                id: Date.now() + i,
                index: (indexIdx >= 0 && cells[indexIdx]) || selectedIndex,
                timeframe: (tfIdx >= 0 && cells[tfIdx]) || selectedTimeframe,
                type: (cells[typeIdx] ?? '').toUpperCase(),
                price,
                stoploss: slIdx >= 0 && cells[slIdx] ? parseFloat(cells[slIdx]) : undefined,
                target: targetIdx >= 0 && cells[targetIdx] ? parseFloat(cells[targetIdx]) : undefined,
              })
            }
          } else {
            setFileError('Excel: please save as CSV or use the sample CSV.')
            e.target.value = ''
            return
          }
          setManualLevels((prev) => [...prev, ...rows])
        } catch (err) {
          setFileError(err instanceof Error ? err.message : 'Failed to parse file')
        }
      }
      reader.onerror = () => setFileError('Could not read file')
      if (isCsv) reader.readAsText(file)
      else setFileError('Excel upload not supported in browser. Use CSV or download sample.')
      e.target.value = ''
    },
    [selectedIndex, selectedTimeframe]
  )

  return (
    <div className="trading-view">
      <div className="trading-controls">
        <select value={selectedIndex} onChange={(e) => setSelectedIndex(e.target.value)} aria-label="Index">
          <option value="NIFTY">NIFTY</option>
          <option value="BANKNIFTY">BANKNIFTY</option>
          <option value="FINNIFTY">FINNIFTY</option>
        </select>
        <select value={selectedTimeframe} onChange={(e) => setSelectedTimeframe(e.target.value)} aria-label="Timeframe">
          <option value="1m">1m</option>
          <option value="5m">5m</option>
          <option value="15m">15m</option>
        </select>
      </div>

      <PriceChart
        index={selectedIndex}
        timeframe={selectedTimeframe}
        candles={candles}
        levels={{ serverLevels: currentLevels, manualLevels: myLevelsForView }}
        currentPrice={marketData?.current_price}
        height={420}
      />
      <OptionChainPanel index={selectedIndex} optionChainFromWs={data?.optionChain?.[selectedIndex]} />

      <div className="levels-panel">
        <h3>Manual levels (chart input)</h3>
        <p className="levels-hint">All 10 level types available. Add below or load from file.</p>

        <div className="levels-form">
          <select
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            aria-label="Level type"
            title={LEVEL_TYPES.find((t) => t.code === form.type)?.desc}
          >
            {LEVEL_TYPES.map(({ code, label }) => (
              <option key={code} value={code}>{label}</option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Price"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            step="any"
            min={0}
            className="level-input"
          />
          <input
            type="number"
            placeholder="Stoploss (opt)"
            value={form.stoploss}
            onChange={(e) => setForm((f) => ({ ...f, stoploss: e.target.value }))}
            step="any"
            className="level-input"
          />
          <input
            type="number"
            placeholder="Target (opt)"
            value={form.target}
            onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))}
            step="any"
            className="level-input"
          />
          <button type="button" className="btn-add-level" onClick={addLevel}>
            Add level
          </button>
        </div>

        <div className="levels-file-actions">
          <label className="btn-load-file">
            <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} hidden />
            Load from file (CSV/Excel ref)
          </label>
          <a href={`${apiBase}/api/trading/levels/sample`} download="levels_sample.csv" className="link-download-sample">
            Download sample CSV
          </a>
        </div>
        {fileError && <p className="levels-error">{fileError}</p>}

        <div className="levels-list-wrapper">
          <h4>Levels on chart ({selectedIndex} {selectedTimeframe})</h4>
          {currentLevels.length > 0 ? (
            <div className="levels-list">
              {currentLevels.map((level, idx) => (
                <div key={`${level.type}-${level.price}-${idx}`} className="level-item">
                  <span className="level-type" title={LEVEL_TYPES.find((t) => t.code === level.type)?.desc}>{level.type}</span>
                  <span className="level-price mono">₹{Number(level.price).toLocaleString()}</span>
                  {level.stoploss != null && <span className="level-opt">SL: {level.stoploss}</span>}
                  {level.target != null && <span className="level-opt">Tgt: {level.target}</span>}
                  <span className="level-confidence">{((level.confidence ?? 1) * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">No levels. Add above or load sample.</p>
          )}
        </div>

        {myLevelsForView.length > 0 && (
          <div className="manual-levels-list">
            <h4>Your manual entries (remove here)</h4>
            {myLevelsForView.map((l) => (
              <div key={l.id} className="level-item level-item-manual">
                <span className="level-type">{l.type}</span>
                <span className="level-price mono">₹{l.price}</span>
                <button type="button" className="btn-remove-level" onClick={() => removeManualLevel(l.id)} aria-label="Remove">×</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
