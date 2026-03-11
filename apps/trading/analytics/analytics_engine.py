"""
Vertex Analytics Engine — Institutional-Grade Trade Analytics

Research-quality performance analytics: expectancy, risk-adjusted returns,
drawdown analysis, and multi-dimensional breakdowns (level type, timeframe,
index, pattern). Designed for auditability and decision support.

References:
  - Expectancy & profit factor: standard institutional metrics
  - Drawdown: peak-to-trough equity decline; recovery duration
  - Rolling Sharpe proxy: (mean PnL) / (std PnL) over rolling window
"""
from __future__ import annotations

import json
import math
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from loguru import logger

from journal.trade_journal import Trade, TradeJournal
try:
    from utils.logging_config import step_log as _step
except ImportError:
    def _step(m, s, d="", **k): logger.info(f"[{m}] {s} | {d}")


@dataclass
class AnalyticsSummary:
    """Canonical summary schema for APIs and exports."""
    total_trades: int
    winning_trades: int
    losing_trades: int
    win_rate_pct: float
    total_pnl: float
    avg_win: float
    avg_loss: float
    expectancy_per_trade: float
    profit_factor: float
    avg_rr: float
    avg_holding_min: float
    max_drawdown: float
    max_drawdown_pct: float
    sharpe_proxy_20: float
    consistency_score: float
    level_performance: Dict[str, Any]
    timeframe_performance: Dict[str, Any]
    index_performance: Dict[str, Any]
    pattern_performance: Dict[str, Any]
    best_trade: Optional[Dict]
    worst_trade: Optional[Dict]
    last_updated: str


class AnalyticsEngine:
    """
    Institutional-grade analytics: expectancy, risk-adjusted metrics,
    drawdown, and multi-factor performance breakdowns.
    """

    def __init__(self, journal: Optional[TradeJournal] = None) -> None:
        self.journal = journal

    def compute_statistics(self) -> Dict[str, Any]:
        """
        Full statistics suite: P&L, expectancy, profit factor, drawdown,
        rolling Sharpe proxy, consistency score, and breakdowns by
        level type, timeframe, index, and pattern.
        """
        try:
            _step("analytics", "compute_statistics", "start")
            if self.journal is None:
                _step("analytics", "compute_statistics", "no journal")
                return self._empty_stats()
            trades = self.journal.trades or []
            if not trades:
                _step("analytics", "compute_statistics", "no trades")
                return self._empty_stats()

            df = pd.DataFrame([self._trade_to_row(t) for t in trades])
            df = df.sort_values("entry_time").reset_index(drop=True)

            # --- Core P&L ---
            total_trades = len(df)
            wins = df[df["pnl"] > 0]
            losses = df[df["pnl"] <= 0]
            n_win, n_loss = len(wins), len(losses)
            total_pnl = float(df["pnl"].sum())
            avg_win = float(wins["pnl"].mean()) if n_win else 0.0
            avg_loss = float(losses["pnl"].mean()) if n_loss else 0.0
            win_rate = (n_win / total_trades * 100) if total_trades else 0.0

            # --- Expectancy (expected P&L per trade) ---
            prob_win = n_win / total_trades if total_trades else 0
            prob_loss = n_loss / total_trades if total_trades else 0
            expectancy = prob_win * avg_win + prob_loss * avg_loss

            # --- Profit factor & avg R:R ---
            gross_profit = float(wins["pnl"].sum()) if n_win else 0.0
            gross_loss_abs = float(np.abs(losses["pnl"].sum())) if n_loss else 0.0
            profit_factor = (gross_profit / gross_loss_abs) if gross_loss_abs > 0 else (float("inf") if gross_profit > 0 else 0.0)
            avg_rr = (abs(avg_win / avg_loss) if avg_loss != 0 else 0.0)

            # --- Holding time (minutes) ---
            df["entry_ts"] = pd.to_datetime(df["entry_time"], errors="coerce")
            df["exit_ts"] = pd.to_datetime(df["exit_time"], errors="coerce")
            df["holding_min"] = (df["exit_ts"] - df["entry_ts"]).dt.total_seconds() / 60
            avg_holding = float(df["holding_min"].replace([np.inf, -np.inf], np.nan).dropna().mean())
            if math.isnan(avg_holding):
                avg_holding = 0.0

            # --- Drawdown ---
            cum = df["pnl"].cumsum()
            running_max = cum.expanding().max()
            dd = cum - running_max
            max_dd = float(abs(dd.min())) if len(dd) and not dd.isna().all() else 0.0
            peak = float(running_max.max()) if len(running_max) else 0.0
            max_dd_pct = (max_dd / peak * 100) if peak > 0 else 0.0

            # --- Rolling Sharpe proxy (20-trade window) ---
            roll = 20
            pnl = df["pnl"].values
            if len(pnl) >= roll:
                rolling_mean = pd.Series(pnl).rolling(roll).mean().dropna()
                rolling_std = pd.Series(pnl).rolling(roll).std().dropna()
                idx = rolling_std > 0
                sharpe_proxy = float((rolling_mean[idx] / rolling_std[idx]).mean()) if idx.any() else 0.0
            else:
                sharpe_proxy = (float(np.mean(pnl) / np.std(pnl)) if len(pnl) > 1 and np.std(pnl) > 0 else 0.0)

            # --- Consistency: fraction of rolling 5-trade windows that are profitable ---
            if len(pnl) >= 5:
                windows = pd.Series(pnl).rolling(5).sum()
                consistency = float((windows > 0).sum() / max(1, len(windows.dropna()))) * 100
            else:
                consistency = (100.0 if total_pnl > 0 else 0.0)

            # --- Breakdowns ---
            level_perf = self._breakdown_by(df, "level_type")
            tf_perf = self._breakdown_by(df, "timeframe")
            idx_perf = self._breakdown_by(df, "index")
            pattern_perf = self._breakdown_by(df, "pattern")

            # --- Best / worst ---
            best = df.loc[df["pnl"].idxmax()].to_dict() if total_trades else None
            worst = df.loc[df["pnl"].idxmin()].to_dict() if total_trades else None
            for d in (best, worst):
                if d:
                    for k in list(d):
                        if hasattr(d[k], "isoformat"):
                            d[k] = d[k].isoformat() if d[k] else None

            return {
                "total_trades": total_trades,
                "winning_trades": n_win,
                "losing_trades": n_loss,
                "win_rate": round(win_rate, 2),
                "total_pnl": round(total_pnl, 2),
                "avg_win": round(avg_win, 2),
                "avg_loss": round(avg_loss, 2),
                "expectancy_per_trade": round(expectancy, 2),
                "profit_factor": round(min(profit_factor, 99.99), 2),
                "avg_rr": round(avg_rr, 2),
                "avg_holding_time": round(avg_holding, 2),
                "max_drawdown": round(max_dd, 2),
                "max_drawdown_pct": round(max_dd_pct, 2),
                "sharpe_proxy_20": round(sharpe_proxy, 3),
                "consistency_score": round(consistency, 2),
                "level_performance": level_perf,
                "timeframe_performance": tf_perf,
                "index_performance": idx_perf,
                "pattern_performance": pattern_perf,
                "best_trade": best,
                "worst_trade": worst,
                "last_updated": datetime.now().isoformat(),
            }
        except Exception as e:
            logger.exception(f"Analytics compute error: {e}")
            return self._empty_stats()

    def _trade_to_row(self, t: Trade) -> Dict[str, Any]:
        out = t.to_dict()
        out["entry_time"] = getattr(t, "entry_time", None)
        out["exit_time"] = getattr(t, "exit_time", None)
        return out

    def _breakdown_by(self, df: pd.DataFrame, column: str) -> Dict[str, Dict[str, float]]:
        if column not in df.columns or df[column].isna().all():
            return {}
        result: Dict[str, Dict[str, float]] = {}
        for val in df[column].dropna().unique():
            sub = df[df[column] == val]
            n = len(sub)
            if n == 0:
                continue
            wins = (sub["pnl"] > 0).sum()
            result[str(val)] = {
                "count": n,
                "win_rate": round(wins / n * 100, 2),
                "total_pnl": round(float(sub["pnl"].sum()), 2),
                "avg_pnl": round(float(sub["pnl"].mean()), 2),
            }
        return result

    def _empty_stats(self) -> Dict[str, Any]:
        return {
            "total_trades": 0,
            "winning_trades": 0,
            "losing_trades": 0,
            "win_rate": 0,
            "total_pnl": 0,
            "avg_win": 0,
            "avg_loss": 0,
            "expectancy_per_trade": 0,
            "profit_factor": 0,
            "avg_rr": 0,
            "avg_holding_time": 0,
            "max_drawdown": 0,
            "max_drawdown_pct": 0,
            "sharpe_proxy_20": 0,
            "consistency_score": 0,
            "level_performance": {},
            "timeframe_performance": {},
            "index_performance": {},
            "pattern_performance": {},
            "best_trade": None,
            "worst_trade": None,
            "last_updated": datetime.now().isoformat(),
        }

    def get_daily_performance(self, date: Optional[datetime] = None) -> Dict[str, Any]:
        """Performance for a single session (calendar date)."""
        date = date or datetime.now()
        try:
            trades = getattr(self.journal, "trades", []) or []
            date_trades = [
                t for t in trades
                if pd.to_datetime(getattr(t, "entry_time", None), errors="coerce").date() == date.date()
            ]
            if not date_trades:
                return self._empty_stats()
            temp = TradeJournal()
            temp.trades = date_trades
            return AnalyticsEngine(temp).compute_statistics()
        except Exception as e:
            logger.error(f"Daily performance error: {e}")
            return self._empty_stats()

    def get_rolling_performance(self, window_trades: int = 20) -> List[Dict[str, Any]]:
        """Rolling window statistics (last N trades per window)."""
        try:
            trades = getattr(self.journal, "trades", []) or []
            if len(trades) < window_trades:
                return []
            df = pd.DataFrame([self._trade_to_row(t) for t in trades]).sort_values("entry_time")
            out = []
            for i in range(window_trades, len(df) + 1):
                w = df.iloc[i - window_trades:i]
                stats = self._empty_stats()
                stats["total_trades"] = len(w)
                stats["total_pnl"] = round(float(w["pnl"].sum()), 2)
                stats["win_rate"] = round((w["pnl"] > 0).sum() / len(w) * 100, 2)
                stats["window_end"] = w["entry_time"].iloc[-1]
                if hasattr(stats["window_end"], "isoformat"):
                    stats["window_end"] = stats["window_end"].isoformat()
                out.append(stats)
            return out
        except Exception as e:
            logger.error(f"Rolling performance error: {e}")
            return []

    def export_analytics_report(self, filepath: str) -> bool:
        """Export full analytics report (JSON) with summary and rolling view."""
        try:
            path = Path(filepath)
            path.parent.mkdir(parents=True, exist_ok=True)
            stats = self.compute_statistics()
            rolling = self.get_rolling_performance(20)
            report = {
                "summary": {
                    "total_trades": stats["total_trades"],
                    "win_rate": stats["win_rate"],
                    "total_pnl": stats["total_pnl"],
                    "expectancy_per_trade": stats["expectancy_per_trade"],
                    "profit_factor": stats["profit_factor"],
                    "max_drawdown": stats["max_drawdown"],
                    "sharpe_proxy_20": stats["sharpe_proxy_20"],
                    "consistency_score": stats["consistency_score"],
                },
                "detailed_statistics": stats,
                "rolling_20": rolling,
                "generated_at": datetime.now().isoformat(),
            }
            with open(path, "w", encoding="utf-8") as f:
                json.dump(report, f, indent=2, default=str)
            logger.info(f"Analytics report exported to {path}")
            return True
        except Exception as e:
            logger.exception(f"Export analytics report failed: {e}")
            return False
