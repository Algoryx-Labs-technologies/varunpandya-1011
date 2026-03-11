# Trading tests

Unit and E2E tests for config, data fetcher, broker, strategy, levels, patterns, risk, journal, position sizing. **Testing is done on real-time historical data that has been fetched** when available; otherwise synthetic dummy data is used.

Run from `apps/trading`. Install deps first:

```bash
cd apps/trading
pip install -r requirements.txt
pip install pytest
pytest tests/ -v
```

## Real historical data for tests

Tests use **fetched historical OHLC** from `data/historical/index_ohlc/{index}/{timeframe}/ohlc.csv` when present:

1. **Fetch data first** (recommended): run the E2E script so that indicators, levels, patterns, ML, and E2E flow tests run on real data:
   ```bash
   python tests/run_e2e_with_logs.py
   ```
2. **Fixtures** (`conftest.py`):
   - **`historical_ohlc_df`**: Loads OHLC from the first available index/timeframe in `data/historical/index_ohlc/`. `None` if no data.
   - **`real_ohlc_df`**: Uses `historical_ohlc_df` when available (≥20 bars); otherwise falls back to **`dummy_ohlc_df`** (synthetic 50-candle OHLC).
3. **Tests using real data**: `test_indicators.py`, `test_levels.py`, `test_patterns.py`, `test_ml_and_missed_trade.py`, and `test_e2e_data_flow.py::test_e2e_levels_journal_ml_flow` use the **`real_ohlc_df`** fixture, so they run on fetched historical data when present.
4. **`test_historical_data.py`**: Dedicated tests that **require** fetched historical OHLC (indicators, patterns, levels, ML, strategy on real data). They **skip** with a clear message if no data exists—run `run_e2e_with_logs.py` first to populate.

No live API or real credentials are required for unit tests; when historical files are missing, tests fall back to dummy data or skip (historical-only tests).

## Logging (per-folder)

The trading system logs with `[broker]`, `[data]`, `[main]`, `[strategy]` etc. for each step. See `utils/logging_config.py` and step_log usage in broker, data_fetcher, main.

## End-to-end test with full logging

Run the E2E script to exercise broker connect → LTP → OHLC (1m/5m/15m) → option chain for each index. This also **populates historical OHLC** used by pytest. Logs go to console and to `logs/e2e_YYYYMMDD_HHMMSS.log`:

```bash
cd apps/trading
python tests/run_e2e_with_logs.py
# or
venv\Scripts\python tests/run_e2e_with_logs.py
```

Requires `.env` with Angel One credentials (and `ANGEL_ONE_TOTP_SECRET` for live connect). If TOTP is not set, the script still runs config and token/tradingsymbol checks.

## Pytest E2E (optional live broker)

- `test_e2e_data_flow.py`: config, tokens, and optional live broker + data flow.
- Live tests are skipped unless `ANGEL_ONE_TOTP_SECRET` is set.

```bash
pytest tests/test_e2e_data_flow.py -v
pytest tests/test_e2e_data_flow.py -v -k "live or broker"   # run only live tests if TOTP set
```

## Run single test files

```bash
pytest tests/test_historical_data.py -v   # requires fetched OHLC; skips if none
pytest tests/test_position_sizing.py -v
pytest tests/test_indicators.py -v
pytest tests/test_levels.py -v
pytest tests/test_patterns.py -v
pytest tests/test_config.py -v
pytest tests/test_journal.py -v
pytest tests/test_risk.py -v
pytest tests/test_data_dummy.py -v
pytest tests/test_e2e_data_flow.py -v
```

For full system description and run process, see repo root **`TRADING_ENGINE_EXPLAINED.md`**.
