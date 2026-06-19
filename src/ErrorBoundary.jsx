import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 32, textAlign: 'center', fontFamily: 'system-ui' }}>
          <h1 style={{ fontSize: 24, marginBottom: 8 }}>Что-то пошло не так</h1>
          <p style={{ color: '#666', marginBottom: 16 }}>Попробуй обновить страницу.</p>
          <button
            onClick={() => { this.setState({ hasError: false }); location.reload(); }}
            style={{ padding: '8px 24px', fontSize: 16, cursor: 'pointer' }}
          >
            Обновить
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
