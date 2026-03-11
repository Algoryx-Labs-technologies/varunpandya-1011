#!/usr/bin/env python3
"""
Run full end-to-end testing and save all logs to logs/.
Executes: (1) pytest tests/  (2) tests/run_e2e_with_logs.py  (3) run_system_test.py
Writes a summary to logs/e2e_testing_summary_YYYYMMDD_HHMMSS.txt with paths to all log files.
Run from apps/trading: python run_e2e_testing_and_save_logs.py
"""
import subprocess
import sys
from pathlib import Path
from datetime import datetime

APP_ROOT = Path(__file__).resolve().parent
LOG_DIR = APP_ROOT / "logs"
LOG_DIR.mkdir(exist_ok=True)
ts = datetime.now().strftime("%Y%m%d_%H%M%S")
summary_path = LOG_DIR / f"e2e_testing_summary_{ts}.txt"
log_paths = []


def run(cmd: list, log_name: str) -> bool:
    """Run command and save stdout/stderr to logs/<log_name>. Return success."""
    out_file = LOG_DIR / log_name
    log_paths.append(str(out_file))
    try:
        with open(out_file, "w", encoding="utf-8") as f:
            r = subprocess.run(
                cmd,
                cwd=str(APP_ROOT),
                stdout=f,
                stderr=subprocess.STDOUT,
                text=True,
                timeout=300,
            )
        return r.returncode == 0
    except subprocess.TimeoutExpired:
        with open(out_file, "a", encoding="utf-8") as f:
            f.write("\n[TIMEOUT after 300s]\n")
        return False
    except Exception as e:
        with open(out_file, "a", encoding="utf-8") as f:
            f.write(f"\n[ERROR] {e}\n")
        return False


def main():
    py = sys.executable
    summary_lines = [f"E2E testing run at {datetime.now().isoformat()}", "=" * 60]

    # 1) Pytest
    summary_lines.append("\n1) Pytest (tests/)")
    pytest_log = f"pytest_full_{ts}.log"
    ok = run([py, "-m", "pytest", "tests/", "-v", "--tb=short"], pytest_log)
    summary_lines.append(f"   Log: logs/{pytest_log}")
    summary_lines.append(f"   Result: {'PASS' if ok else 'FAIL/ERROR'}")

    # 2) E2E script (writes its own logs/e2e_*.log; we also capture console)
    summary_lines.append("\n2) E2E script (run_e2e_with_logs.py)")
    e2e_capture = f"e2e_console_{ts}.log"
    ok2 = run([py, "tests/run_e2e_with_logs.py"], e2e_capture)
    summary_lines.append(f"   Console capture: logs/{e2e_capture}")
    summary_lines.append(f"   (Script also writes to logs/e2e_YYYYMMDD_HHMMSS.log)")
    summary_lines.append(f"   Result: {'PASS' if ok2 else 'FAIL/ERROR'}")

    # 3) System test (writes its own logs/system_test_*.log; we also capture)
    summary_lines.append("\n3) System test (run_system_test.py)")
    sys_capture = f"system_test_console_{ts}.log"
    ok3 = run([py, "run_system_test.py"], sys_capture)
    summary_lines.append(f"   Console capture: logs/{sys_capture}")
    summary_lines.append(f"   (Script also writes to logs/system_test_YYYYMMDD_HHMMSS.log)")
    summary_lines.append(f"   Result: {'PASS' if ok3 else 'FAIL/ERROR'}")

    summary_lines.append("\n" + "=" * 60)
    summary_lines.append("All log files from this run:")
    for p in log_paths:
        summary_lines.append(f"  {p}")
    summary_lines.append(f"\nSummary written to: {summary_path}")

    with open(summary_path, "w", encoding="utf-8") as f:
        f.write("\n".join(summary_lines))

    print("\n".join(summary_lines))
    return 0 if (ok and ok2 and ok3) else 1


if __name__ == "__main__":
    sys.exit(main())
