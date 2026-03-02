"""
Vertex Missed Trade Detector — Institutional Post-Trade Opportunity Analysis

Identifies signals that were generated but not executed; attributes potential
P&L, risk-reward, and suggested reason (reversal, weak pattern, low R:R).
Exportable for review and strategy tuning. Designed for accountability.
"""
from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd
from loguru import logger

from journal.trade_journal import TradeJournal
from strategy.trading_strategy import TradeSignal

EXECUTION_TIME_TOLERANCE_SEC = 300  # 5 minutes
LOT_SIZE_ASSUMPTION = 50
MIN_RR_RATIO = 0.01  # 1% move as min target for "small target" reason


class MissedTradeDetector:
    """
    Compares generated signals to executed trades; flags missed opportunities
    with potential P&L and categorized reasons (reversal, pattern strength, R:R).
    """

    def __init__(self, journal: TradeJournal) -> None:
        self.journal = journal
        self.missed_trades: List[Dict[str, Any]] = []

    def detect_missed_trades(
        self,
        signals: List[TradeSignal],
        executed_trades: Optional[List[Dict]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Mark signals that were not executed within time tolerance.
        executed_trades: list of dicts with entry_time (and optionally symbol).
        Returns list of missed opportunity records.
        """
        executed = executed_trades if executed_trades is not None else []
        try:
            exec_times = set()
            for t in executed:
                et = t.get("entry_time")
                if et is not None:
                    try:
                        exec_times.add(pd.Timestamp(et))
                    except Exception:
                        pass
            missed = []
            for signal in signals or []:
                if not isinstance(signal, TradeSignal):
                    continue
                ts = getattr(signal, "timestamp", None)
                if ts is None:
                    continue
                try:
                    sig_time = pd.Timestamp(ts) if not isinstance(ts, datetime) else ts
                except Exception:
                    continue
                was_executed = False
                for et in exec_times:
                    if abs((sig_time - et).total_seconds()) < EXECUTION_TIME_TOLERANCE_SEC:
                        was_executed = True
                        break
                if was_executed:
                    continue
                potential_pnl = self._potential_pnl(signal)
                missed.append({
                    "signal_id": f"{getattr(signal, 'index', '')}_{sig_time.isoformat()}",
                    "index": getattr(signal, "index", ""),
                    "direction": getattr(signal, "direction", ""),
                    "entry_price": getattr(signal, "entry_price", 0),
                    "target_price": getattr(signal, "target_price", 0),
                    "stop_loss": getattr(signal, "stop_loss", 0),
                    "level_type": getattr(signal, "level_type", ""),
                    "pattern": getattr(signal, "pattern", ""),
                    "timeframe": getattr(signal, "timeframe", ""),
                    "timestamp": sig_time.isoformat() if hasattr(sig_time, "isoformat") else str(sig_time),
                    "potential_pnl": potential_pnl,
                    "reason": self._suggest_reason(signal),
                    "risk_reward": self._risk_reward_ratio(signal),
                })
            self.missed_trades.extend(missed)
            if missed:
                logger.info(f"Missed trades detected: {len(missed)}")
            return missed
        except Exception as e:
            logger.exception(f"detect_missed_trades: {e}")
            return []

    def _potential_pnl(self, signal: TradeSignal) -> float:
        """Simplified potential P&L assuming target hit and LOT_SIZE_ASSUMPTION lots."""
        try:
            entry = getattr(signal, "entry_price", 0) or 0
            target = getattr(signal, "target_price", 0) or 0
            direction = (getattr(signal, "direction", "") or "").strip().lower()
            if direction == "call":
                return (target - entry) * LOT_SIZE_ASSUMPTION
            return (entry - target) * LOT_SIZE_ASSUMPTION
        except Exception:
            return 0.0

    def _risk_reward_ratio(self, signal: TradeSignal) -> float:
        """Target range / risk range (entry to stop)."""
        try:
            entry = float(getattr(signal, "entry_price", 0) or 0)
            target = float(getattr(signal, "target_price", 0) or 0)
            sl = float(getattr(signal, "stop_loss", 0) or 0)
            if entry == 0:
                return 0.0
            direction = (getattr(signal, "direction", "") or "").strip().lower()
            if direction == "call":
                risk = entry - sl
                reward = target - entry
            else:
                risk = sl - entry
                reward = entry - target
            return (reward / risk) if risk > 0 else 0.0
        except Exception:
            return 0.0

    def _suggest_reason(self, signal: TradeSignal) -> str:
        """Human-readable reason why trade might have been skipped."""
        reasons = []
        level_type = (getattr(signal, "level_type", "") or "").strip().upper()
        if level_type in ("RU", "RD"):
            reasons.append("Reversal signal—may require manual confirmation")
        pattern = (getattr(signal, "pattern", "") or "").upper()
        if "SPINNING" in pattern:
            reasons.append("Weak pattern signal")
        rr = self._risk_reward_ratio(signal)
        if 0 < rr < 1:
            reasons.append("Sub-1:1 risk-reward")
        entry = getattr(signal, "entry_price", 0) or 0
        target = getattr(signal, "target_price", 0) or 0
        if entry and abs(target - entry) / entry < MIN_RR_RATIO:
            reasons.append("Small target—low R:R")
        return "; ".join(reasons) if reasons else "Signal generated but not executed"

    def get_missed_trades_summary(self) -> Dict[str, Any]:
        """Aggregate summary: total missed, potential P&L, breakdown by direction/level_type, top by P&L."""
        if not self.missed_trades:
            return {
                "total_missed": 0,
                "potential_pnl": 0,
                "by_direction": {},
                "by_level_type": {},
                "top_missed": [],
            }
        try:
            df = pd.DataFrame(self.missed_trades)
            by_dir = df.groupby("direction").size().to_dict() if "direction" in df.columns else {}
            by_level = df.groupby("level_type").size().to_dict() if "level_type" in df.columns else {}
            top = []
            if "potential_pnl" in df.columns:
                top = df.nlargest(5, "potential_pnl")[["index", "direction", "potential_pnl", "reason"]].to_dict("records")
            return {
                "total_missed": len(df),
                "potential_pnl": round(float(df["potential_pnl"].sum()), 2),
                "by_direction": by_dir,
                "by_level_type": by_level,
                "top_missed": top,
            }
        except Exception as e:
            logger.error(f"Missed trades summary: {e}")
            return {"total_missed": 0, "potential_pnl": 0, "by_direction": {}, "by_level_type": {}, "top_missed": []}

    def export_missed_trades(self, filepath: str) -> bool:
        """Export missed trades and summary to JSON."""
        try:
            path = Path(filepath)
            path.parent.mkdir(parents=True, exist_ok=True)
            payload = {
                "missed_trades": self.missed_trades,
                "summary": self.get_missed_trades_summary(),
                "exported_at": datetime.now().isoformat(),
            }
            with open(path, "w", encoding="utf-8") as f:
                json.dump(payload, f, indent=2, default=str)
            logger.info(f"Missed trades exported to {path}")
            return True
        except Exception as e:
            logger.error(f"Export missed trades: {e}")
            return False
