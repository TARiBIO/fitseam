import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    if (typeof console !== 'undefined') console.error('Fitseam error boundary:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const INK = '#1A1A1A', CREAM = '#F5F1EA', RUST = '#B85C3C';
    const wrap = { minHeight: '100vh', background: CREAM, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', fontFamily: "'DM Sans', sans-serif" };
    const eyebrow = { fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 15, color: RUST, marginBottom: 16 };
    const title = { fontFamily: "'Instrument Serif', serif", fontSize: 'clamp(36px,8vw,64px)', lineHeight: 1.1, color: INK, margin: '0 0 20px', maxWidth: 620 };
    const body = { fontSize: 15, lineHeight: 1.6, color: 'rgba(26,26,26,.68)', maxWidth: 460, margin: '0 0 32px' };
    const btn = { background: INK, color: CREAM, border: 'none', padding: '16px 32px', fontSize: 12, fontWeight: 500, letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" };

    return (
      <div style={wrap}>
        <p style={eyebrow}>Something threw us off</p>
        <h1 style={title}>Our fault, not yours.<br /><em>Give it another try.</em></h1>
        <p style={body}>An unexpected error broke the flow. Refresh the page and we'll start over — your saved sizes stay put.</p>
        <button style={btn} onClick={() => { window.location.reload(); }}>Refresh</button>
      </div>
    );
  }
}
