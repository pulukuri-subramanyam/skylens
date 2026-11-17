import { Component } from 'react';
import { reportEvent } from '../lib/monitoring';

export class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    reportEvent('render_error');
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="app-container">
        <section className="error-container" role="alert">
          <div className="error-content">
            <h1 className="error-title">Skylens couldn't display this page</h1>
            <p className="error-message">
              Reload to try again. Your saved cities are still stored on this device.
            </p>
            <button className="retry-btn" type="button" onClick={() => window.location.reload()}>
              Reload page
            </button>
          </div>
        </section>
      </main>
    );
  }
}
