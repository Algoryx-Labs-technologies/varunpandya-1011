/**
 * Frontend smoke test. Run: npm test (if Jest/Vitest is configured).
 * Minimal check that App renders without throwing.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders Vertex header', () => {
    render(<App />);
    expect(screen.getByText(/Vertex/)).toBeInTheDocument();
  });

  it('renders nav tabs', () => {
    render(<App />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Trading')).toBeInTheDocument();
    expect(screen.getByText('Signals')).toBeInTheDocument();
  });
});
