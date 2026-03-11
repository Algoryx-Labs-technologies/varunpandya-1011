"""
Vertex Trade Journal — Institutional-Grade Trade Logging & Audit Trail

Immutable append-only trade records with full auditability: schema versioning,
session identifiers, optional slippage/commission, and rich query and export.
Designed for compliance and post-trade analysis.
"""
from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional
from uuid import uuid4

import pandas as pd
from loguru import logger

from config import Config
try:
    from utils.logging_config import step_log as _step
except ImportError:
    def _step(m, s, d="", **k): logger.info(f"[{m}] {s} | {d}")

# Schema version for forward compatibility
JOURNAL_SCHEMA_VERSION = "1.0"


class Trade:
    """
    Single executed trade: immutable record with P&L, levels, pattern,
    and optional execution metadata (slippage, commission, session_id).
    """

    __slots__ = (
        "trade_id", "index", "symbol", "direction", "entry_price", "exit_price",
        "quantity", "entry_time", "exit_time", "exit_reason", "pnl",
        "level_type", "pattern", "timeframe", "session_id", "slippage", "commission", "meta",
    )

    def __init__(
        self,
        trade_id: str,
        index: str,
        symbol: str,
        direction: str,
        entry_price: float,
        exit_price: float,
        quantity: int,
        entry_time: datetime,
        exit_time: datetime,
        exit_reason: str,
        pnl: float,
        level_type: str,
        pattern: str,
        timeframe: str = "",
        session_id: Optional[str] = None,
        slippage: Optional[float] = None,
        commission: Optional[float] = None,
        meta: Optional[Dict[str, Any]] = None,
    ):
        self.trade_id = trade_id or str(uuid4())[:8]
        self.index = str(index or "").strip().upper()
        self.symbol = str(symbol or "")
        self.direction = str(direction or "").strip().lower()
        self.entry_price = float(entry_price)
        self.exit_price = float(exit_price)
        self.quantity = int(quantity)
        self.entry_time = entry_time
        self.exit_time = exit_time
        self.exit_reason = str(exit_reason or "")
        self.pnl = float(pnl)
        self.level_type = str(level_type or "")
        self.pattern = str(pattern or "")
        self.timeframe = str(timeframe or "")
        self.session_id = session_id
        self.slippage = slippage
        self.commission = commission
        self.meta = meta or {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "trade_id": self.trade_id,
            "index": self.index,
            "symbol": self.symbol,
            "direction": self.direction,
            "entry_price": self.entry_price,
            "exit_price": self.exit_price,
            "quantity": self.quantity,
            "entry_time": self.entry_time.isoformat() if isinstance(self.entry_time, datetime) else str(self.entry_time),
            "exit_time": self.exit_time.isoformat() if isinstance(self.exit_time, datetime) else str(self.exit_time),
            "exit_reason": self.exit_reason,
            "pnl": self.pnl,
            "level_type": self.level_type,
            "pattern": self.pattern,
            "timeframe": self.timeframe,
            "session_id": self.session_id,
            "slippage": self.slippage,
            "commission": self.commission,
            "meta": self.meta,
        }


class TradeJournal:
    """
    Append-only trade journal with schema versioning, persistence,
    and rich query/export. Edge cases: corrupt JSON, missing keys, unwritable dir.
    """

    def __init__(self) -> None:
        self.trades: List[Trade] = []
        self.journal_file = Path(Config.DATA_DIR) / f"trades_{datetime.now().strftime('%Y%m%d')}.json"
        self.load_trades()

    def add_trade(self, trade: Optional[Trade]) -> None:
        """Append one trade and persist. No-op if trade is None."""
        if trade is None:
            logger.warning("add_trade: ignored None")
            return
        self.trades.append(trade)
        self.save_trades()
        logger.info(f"Trade logged: {trade.trade_id} | P&L: {trade.pnl:.2f}")
        _step("journal", "add_trade", "logged", trade_id=trade.trade_id, index=trade.index, pnl=trade.pnl)

    def save_trades(self) -> bool:
        """Persist journal to JSON. Ensures parent dir exists. Returns False on error."""
        try:
            path = Path(self.journal_file)
            path.parent.mkdir(parents=True, exist_ok=True)
            payload = {
                "schema_version": JOURNAL_SCHEMA_VERSION,
                "exported_at": datetime.now().isoformat(),
                "trades": [t.to_dict() for t in self.trades],
            }
            with open(path, "w", encoding="utf-8") as f:
                json.dump(payload, f, indent=2, default=str)
            return True
        except OSError as e:
            logger.error(f"Journal save failed (file/dir): {e}")
            return False
        except Exception as e:
            logger.exception("Journal save failed: %s", e)
            return False

    def load_trades(self) -> None:
        """Load from JSON. Supports legacy list format and new { schema_version, trades }. Skips bad rows."""
        path = Path(self.journal_file)
        if not path.exists():
            return
        try:
            with open(path, "r", encoding="utf-8") as f:
                raw = json.load(f)
            if isinstance(raw, list):
                trades_list = raw
            elif isinstance(raw, dict) and "trades" in raw:
                trades_list = raw["trades"]
            else:
                logger.warning("Journal file format unknown; ignoring")
                return
            if not isinstance(trades_list, list):
                return
            self.trades = []
            for i, t in enumerate(trades_list):
                if not isinstance(t, dict):
                    continue
                try:
                    self.trades.append(self._dict_to_trade(t))
                except Exception as e:
                    logger.debug(f"Journal row {i} skipped: {e}")
            if self.trades:
                logger.info(f"Loaded {len(self.trades)} trades from journal")
        except json.JSONDecodeError as e:
            logger.error(f"Journal file corrupt: {e}")
        except Exception as e:
            logger.error(f"Journal load failed: {e}")

    def _dict_to_trade(self, data: Dict[str, Any]) -> Trade:
        """Map dict to Trade; defaults for missing keys."""
        return Trade(
            trade_id=str(data.get("trade_id", "")),
            index=str(data.get("index", "")),
            symbol=str(data.get("symbol", "")),
            direction=str(data.get("direction", "")),
            entry_price=float(data.get("entry_price", 0)),
            exit_price=float(data.get("exit_price", 0)),
            quantity=int(data.get("quantity", 0)),
            entry_time=pd.to_datetime(data.get("entry_time"), errors="coerce") or datetime.now(),
            exit_time=pd.to_datetime(data.get("exit_time"), errors="coerce") or datetime.now(),
            exit_reason=str(data.get("exit_reason", "")),
            pnl=float(data.get("pnl", 0)),
            level_type=str(data.get("level_type", "")),
            pattern=str(data.get("pattern", "")),
            timeframe=str(data.get("timeframe", "")),
            session_id=data.get("session_id"),
            slippage=data.get("slippage"),
            commission=data.get("commission"),
            meta=dict(data.get("meta", {})),
        )

    def get_statistics(self) -> Dict[str, Any]:
        """Quick stats: total trades, P&L, win rate, avg win/loss, max drawdown, profit factor."""
        if not self.trades:
            return {
                "total_trades": 0,
                "total_pnl": 0,
                "win_rate": 0,
                "avg_win": 0,
                "avg_loss": 0,
                "max_drawdown": 0,
                "profit_factor": 0,
            }
        df = pd.DataFrame([t.to_dict() for t in self.trades])
        total_pnl = float(df["pnl"].sum())
        wins = df[df["pnl"] > 0]
        losses = df[df["pnl"] <= 0]
        n = len(df)
        win_rate = (len(wins) / n * 100) if n else 0
        avg_win = float(wins["pnl"].mean()) if len(wins) else 0
        avg_loss = float(losses["pnl"].mean()) if len(losses) else 0
        cum = df["pnl"].cumsum()
        dd = cum - cum.expanding().max()
        max_dd = float(abs(dd.min())) if len(dd) and not dd.isna().all() else 0
        gross_profit = float(wins["pnl"].sum()) if len(wins) else 0
        gross_loss = float(abs(losses["pnl"].sum())) if len(losses) else 0
        pf = (gross_profit / gross_loss) if gross_loss > 0 else (0 if gross_profit == 0 else 99.99)
        return {
            "total_trades": n,
            "total_pnl": round(total_pnl, 2),
            "win_rate": round(win_rate, 2),
            "avg_win": round(avg_win, 2),
            "avg_loss": round(avg_loss, 2),
            "max_drawdown": round(max_dd, 2),
            "profit_factor": round(min(pf, 99.99), 2),
        }

    def get_trades_by_index(self, index: str) -> List[Trade]:
        """All trades for a given index (e.g. NIFTY, BANKNIFTY)."""
        idx = str(index or "").strip().upper()
        return [t for t in self.trades if t.index == idx]

    def get_trades_by_date(self, date: datetime) -> List[Trade]:
        """All trades with entry on the given calendar date."""
        d = getattr(date, "date", lambda: date)() if date else None
        if not d:
            return []
        return [t for t in self.trades if getattr(t.entry_time, "date", lambda: None)() == d]

    def get_trades_by_date_range(self, start: datetime, end: datetime) -> List[Trade]:
        """Trades with entry_time in [start, end] (inclusive)."""
        out = []
        for t in self.trades:
            et = getattr(t, "entry_time", None)
            if et is None:
                continue
            if start and et < start:
                continue
            if end and et > end:
                continue
            out.append(t)
        return out

    def get_trades_by_level_type(self, level_type: str) -> List[Trade]:
        """Filter by level type (EU, ED, RU, etc.)."""
        lt = str(level_type or "").strip().upper()
        return [t for t in self.trades if t.level_type == lt]

    def export_to_csv(self, filepath: Optional[str] = None) -> bool:
        """Export flat CSV for Excel/BI. Returns False on error."""
        if not self.trades:
            logger.warning("No trades to export")
            return False
        path = Path(filepath or (Config.DATA_DIR / f"trades_{datetime.now().strftime('%Y%m%d')}.csv"))
        try:
            path.parent.mkdir(parents=True, exist_ok=True)
            df = pd.DataFrame([t.to_dict() for t in self.trades])
            # Flatten meta for CSV
            if "meta" in df.columns:
                df = df.drop(columns=["meta"], errors="ignore")
            df.to_csv(path, index=False, encoding="utf-8")
            logger.info(f"Trades exported to {path}")
            _step("journal", "export_to_csv", "done", path=str(path), count=len(self.trades))
            return True
        except Exception as e:
            logger.exception("Export CSV failed: %s", e)
            return False

    def export_to_excel(self, filepath: Optional[str] = None) -> bool:
        """Export to Excel. Returns False on error."""
        if not self.trades:
            logger.warning("No trades to export")
            return False
        path = Path(filepath or (Config.DATA_DIR / f"trades_{datetime.now().strftime('%Y%m%d')}.xlsx"))
        try:
            path.parent.mkdir(parents=True, exist_ok=True)
            df = pd.DataFrame([t.to_dict() for t in self.trades])
            if "meta" in df.columns:
                df = df.drop(columns=["meta"], errors="ignore")
            df.to_excel(path, index=False)
            logger.info(f"Trades exported to {path}")
            _step("journal", "export_to_excel", "done", path=str(path), count=len(self.trades))
            return True
        except Exception as e:
            logger.exception("Export Excel failed: %s", e)
            return False
