# Manual Levels – User Reference

Use **levels_sample.csv** or **levels_sample.xlsx** as a reference for adding levels. For **automatic** level calculation (pivot, K-Means, ATR, Bollinger, SAR, ML), see the repo root **`TRADING_ENGINE_EXPLAINED.md`** Section 4 (Levels).

## Required columns (for bot loader)

| Column     | Description                    | Example  |
|-----------|--------------------------------|----------|
| `price`   | Level price (number)           | 24150    |
| `type`    | One of the 10 level type codes | EU       |
| `timeframe` | 1m, 5m, or 15m               | 5m       |

## Optional columns

| Column     | Description                    | Example  |
|-----------|--------------------------------|----------|
| `index`   | NIFTY, BANKNIFTY, or FINNIFTY  | NIFTY    |
| `stoploss`| Optional stop loss price       | 24100    |
| `target`  | Optional target price          | 24200    |
| `confidence` | 0–1 (used when merging/ranking) | 0.9   |

## The 10 level types

| Code  | Full name                 | Action |
|-------|----------------------------|--------|
| **EU**   | Easy Up                    | Buy Call when price breaks above level |
| **TFD**  | Target From Down           | Target for EU – exit the long |
| **ED**   | Easy Down                  | Buy Put when price breaks below level |
| **TFU**  | Target From Up             | Target for ED – exit the short |
| **RU**   | Reversal Up                | Buy Call on bullish reversal at level |
| **TFRU** | Target For Reversal Up    | Exit RU trade at this target |
| **RD**   | Reversal Down              | Buy Put on bearish reversal at level |
| **TFRD** | Target For Reversal Down  | Exit RD trade at this target |
| **EURTZ**| Easy Up Retest Zone        | Same as EU; second entry on retest, same strike |
| **EDRTZ**| Easy Down Retest Zone      | Same as ED; second entry on retest, same strike |

## Loading in the app

- **Python bot**: Set `LEVELS_FILE` in `.env` (e.g. `levels/levels.csv`). On startup the bot loads the file if it exists (required columns: `price`, `type`, `timeframe`).  
- **GUI**: In the Trading tab, use “Add level” with the type dropdown, or “Load from file” and choose your CSV/Excel.
