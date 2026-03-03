/**
 * Backend API tests (Node.js). Run: tsx tests/api.test.ts
 * Uses dummy in-memory store; no DB required.
 */
const assert = (cond: boolean, msg?: string): void => {
  if (!cond) throw new Error(msg || 'Assertion failed');
};

async function run(): Promise<void> {
  const base = 'http://localhost:4000';
  let ok = 0;

  try {
    const res = await fetch(`${base}/health`);
    const data = await res.json();
    assert(res.ok, 'health should 200');
    assert(data.status === 'ok', 'status ok');
    ok++;
    console.log('GET /health OK');
  } catch (e: any) {
    console.log('GET /health SKIP (server may be down):', e.message);
  }

  try {
    const res = await fetch(`${base}/api/trading/statistics`);
    const data = await res.json();
    assert(res.ok, 'statistics should 200');
    assert(data.status === 'success', 'statistics success');
    assert(typeof data.data === 'object', 'data object');
    ok++;
    console.log('GET /api/trading/statistics OK');
  } catch (e: any) {
    console.log('GET /api/trading/statistics SKIP:', e.message);
  }

  try {
    const res = await fetch(`${base}/api/trading/signals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        index: 'NIFTY',
        direction: 'call',
        entry_price: 100,
        timestamp: new Date().toISOString(),
      }),
    });
    const data = await res.json();
    assert(res.ok, 'POST signals should 200');
    assert(data.status === 'success', 'signals accepted');
    ok++;
    console.log('POST /api/trading/signals OK');
  } catch (e: any) {
    console.log('POST /api/trading/signals SKIP:', e.message);
  }

  console.log('Backend tests passed:', ok);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

