"""
Log cleanup: delete previous log files so E2E/system test runs keep only recent logs.
Call cleanup_old_logs(log_dir) at the start of run_e2e_with_logs.py and run_system_test.py.

Note: data/*.json (e.g. trades_YYYYMMDD.json) are journal persistence — do not delete.
Option chain snapshots live under data/historical/option_chain/{index}/ — also keep.
"""
from pathlib import Path
from datetime import datetime
from typing import Optional
import logging

_log = logging.getLogger(__name__)


def cleanup_old_logs(
    log_dir: Path,
    keep_recent: bool = True,
    keep_trading_log: bool = False,
) -> int:
    """
    Delete previous E2E, system_test, and rotated trading logs so this run's logs are "recent".
    Optionally keep trading.log (current app log).
    Returns number of files removed.
    """
    log_dir = Path(log_dir)
    if not log_dir.is_dir():
        return 0
    removed = 0
    now = datetime.now()
    # Patterns: e2e_*.log, system_test_*.log, trading.*.log (rotated), and dated subdirs (SmartApi)
    for f in log_dir.iterdir():
        try:
            if f.is_file():
                name = f.name
                if name == "trading.log" and keep_trading_log:
                    pass  # keep current app log
                elif name.startswith("e2e_") and name.endswith(".log"):
                    f.unlink()
                    removed += 1
                elif name.startswith("system_test_") and name.endswith(".log"):
                    f.unlink()
                    removed += 1
                elif name.startswith("trading.") and name.endswith(".log"):
                    # rotated trading.*.log (not trading.log)
                    f.unlink()
                    removed += 1
                elif name.endswith(".log"):
                    # any other .log (e.g. future scripts)
                    f.unlink()
                    removed += 1
            elif f.is_dir() and len(f.name) == 10 and f.name[:4].isdigit() and f.name[4] == "-":
                # YYYY-MM-DD subdir (SmartApi logzero)
                for sub in f.iterdir():
                    if sub.is_file():
                        sub.unlink()
                        removed += 1
                f.rmdir()
                removed += 1
        except OSError as e:
            _log.debug("Could not remove %s: %s", f, e)
    return removed
