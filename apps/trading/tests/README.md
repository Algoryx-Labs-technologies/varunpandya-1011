# Trading tests

Run from `apps/trading` (project root for trading backend). Install deps first:

```bash
cd apps/trading
pip install -r requirements.txt
pip install pytest
pytest tests/ -v
```

Or run a single file:

```bash
pytest tests/test_position_sizing.py -v
pytest tests/test_indicators.py -v
pytest tests/test_levels.py -v
pytest tests/test_patterns.py -v
pytest tests/test_config.py -v
pytest tests/test_journal.py -v
pytest tests/test_risk.py -v
pytest tests/test_data_dummy.py -v
```

Tests use dummy data (conftest.py). No live API or real `key.txt` required.
