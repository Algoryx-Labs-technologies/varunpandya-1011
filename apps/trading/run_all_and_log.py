#!/usr/bin/env python3
"""
Run the full Python trading engine: system test (config, indicators, patterns, levels,
strikes, ML, broker check, backend check) then the trading bot (main.py).
All output is stored in logs. Run from apps/trading: python run_all_and_log.py
"""
import sys
import subprocess
from pathlib import Path
from datetime import datetime

APP_ROOT = Path(__file__).resolve().parent
LOGS_DIR = APP_ROOT / "logs"
LOGS_DIR.mkdir(exist_ok=True)

# 1) Run system test (writes to logs/system_test_YYYYMMDD_HHMMSS.log)
print("Running system test (config, indicators, patterns, levels, strikes, ML, broker, backend)...")
result = subprocess.run(
    [sys.executable, str(APP_ROOT / "run_system_test.py")],
    cwd=str(APP_ROOT),
    capture_output=False,
)
if result.returncode != 0:
    print("System test had non-zero exit code:", result.returncode)

# 2) Run trading bot (writes to logs/trading.log via loguru)
print("\nRunning trading bot (main.py). Logs go to logs/trading.log ...")
bot_result = subprocess.run(
    [sys.executable, str(APP_ROOT / "main.py")],
    cwd=str(APP_ROOT),
    capture_output=False,
)

# 3) Report where logs are stored
system_test_logs = sorted(LOGS_DIR.glob("system_test_*.log"), key=lambda p: p.stat().st_mtime, reverse=True)
trading_log = LOGS_DIR / "trading.log"
print("\n" + "=" * 60)
print("  LOGS STORED")
print("=" * 60)
print("  Trading bot (main.py):", trading_log if trading_log.exists() else "(none yet)")
if system_test_logs:
    print("  Latest system test:   ", system_test_logs[0])
    print("  All system test logs: ", [p.name for p in system_test_logs[:5]])
print("  Logs directory:       ", LOGS_DIR)
print("=" * 60)
