import { useState } from 'react';
import './DiscoverPanel.css';

const STEPS = [
  { num: 1, title: 'You set the rules', desc: 'Define price levels (or let the system suggest them). These are like “watch zones” where you’re interested in trading.' },
  { num: 2, title: 'The bot watches the market', desc: 'It keeps an eye on live prices and candlestick patterns. When price crosses a level with a clear pattern, it’s a potential signal.' },
  { num: 3, title: 'Trades when it makes sense', desc: 'If the setup matches your strategy, the bot can place an option trade (Call or Put) for you. You stay in control with limits.' },
  { num: 4, title: 'You see everything here', desc: 'Charts, signals, trades, risk status, and logs—all in one place. Live when the market is open, so you’re never in the dark.' },
];

const SAFETY = [
  { icon: '🛡️', title: 'Daily trade limit', text: 'Cap how many trades can be taken per day. Once reached, no new trades until the next day (unless you unlock).' },
  { icon: '⏰', title: 'Kill switch', text: 'At a set time (e.g. 3:15 PM), the system stops new trades and can square off open positions. Protects you from overnight risk.' },
  { icon: '📈', title: 'Optional profit target', text: 'You can set a daily profit goal (e.g. 20% of capital). When hit, the bot stops new trades for the day—lock in gains.' },
  { icon: '🛑', title: 'Stop loss on every trade', text: 'Each trade has a stop loss. If price goes against you, the trade is closed automatically to limit the loss.' },
];

const TABS_GUIDE = [
  { tab: 'Dashboard', short: 'Your snapshot: total trades, win rate, P&L, and recent activity.' },
  { tab: 'Trading', short: 'Live chart, your levels, and the option chain. See where price is and what’s available.' },
  { tab: 'Signals & Trades', short: 'Every signal the bot generated and every trade it executed. Full history at a glance.' },
  { tab: 'Patterns', short: 'When the bot spots a candlestick pattern at a level, it shows up here before a trade.' },
  { tab: 'Risk & Alerts', short: 'Trade count, max trades, kill-switch status, and important alerts. Your control centre.' },
  { tab: 'Statistics & Analytics', short: 'Win rate, profit factor, and performance breakdown. Know how you’re doing.' },
  { tab: 'Logs', short: 'Day-by-day log of what happened. Pick a date and see all events stored for that day.' },
];

const GOOD_TO_KNOW = [
  'Market status (Live / Market closed) is based on Indian market hours (9:15 AM – 3:30 PM, Mon–Fri).',
  'The bot can hold a trade for at least 7–10 candles before taking profit or squaring off—you can adjust this.',
  'All trading logs are saved so you can review any day later from the Logs tab.',
];

function Accordion({ title, children, open, onToggle }) {
  return (
    <div className={`discover-accordion ${open ? 'open' : ''}`}>
      <button type="button" className="discover-accordion-head" onClick={onToggle} aria-expanded={open}>
        <span>{title}</span>
        <span className="discover-accordion-icon" aria-hidden>{open ? '−' : '+'}</span>
      </button>
      {open && <div className="discover-accordion-body">{children}</div>}
    </div>
  );
}

export default function DiscoverPanel() {
  const [openSection, setOpenSection] = useState('safety');

  return (
    <div className="discover-panel">
      <section className="discover-hero">
        <h2 className="discover-title">What is Vertex Options?</h2>
        <p className="discover-tagline">
          Your command centre for options trading. A smart bot watches the market and can place trades when your levels and conditions are met—while you see everything live and stay in control with built-in safety limits.
        </p>
      </section>

      <section className="discover-flow">
        <h3 className="discover-section-title">How it works</h3>
        <div className="discover-steps">
          {STEPS.map((step) => (
            <div key={step.num} className="discover-step">
              <div className="discover-step-num">{step.num}</div>
              <div className="discover-step-content">
                <h4>{step.title}</h4>
                <p>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="discover-accordions">
        <Accordion
          title="Your safety nets"
          open={openSection === 'safety'}
          onToggle={() => setOpenSection(openSection === 'safety' ? null : 'safety')}
        >
          <div className="discover-safety-grid">
            {SAFETY.map((item) => (
              <div key={item.title} className="discover-safety-card">
                <span className="discover-safety-icon">{item.icon}</span>
                <h4>{item.title}</h4>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        </Accordion>

        <Accordion
          title="What you see on each tab"
          open={openSection === 'tabs'}
          onToggle={() => setOpenSection(openSection === 'tabs' ? null : 'tabs')}
        >
          <ul className="discover-tabs-list">
            {TABS_GUIDE.map((item) => (
              <li key={item.tab}>
                <strong>{item.tab}</strong> — {item.short}
              </li>
            ))}
          </ul>
        </Accordion>

        <Accordion
          title="Good to know"
          open={openSection === 'tips'}
          onToggle={() => setOpenSection(openSection === 'tips' ? null : 'tips')}
        >
          <ul className="discover-tips-list">
            {GOOD_TO_KNOW.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </Accordion>
      </section>

      <section className="discover-cta">
        <p>Use the tabs above to explore your dashboard, charts, signals, and logs. The status in the top-right shows whether the market is <strong>Live</strong>, <strong>Market closed</strong>, or <strong>Offline</strong>.</p>
      </section>
    </div>
  );
}
