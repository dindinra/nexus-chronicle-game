import { Component, type ReactNode } from 'react';

interface BoundaryState {
  error: Error | null;
}

// Error Boundary: cegah satu error render membuat SELURUH app blank (whitescreen).
// Tanpa ini, React 18 akan unmount seluruh tree saat ada uncaught render error.
class ErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, color: '#ff6677', fontFamily: 'monospace' }}>
          <h1>⚠ Terjadi error pada komponen:</h1>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{this.state.error.message}</pre>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#aaa', fontSize: 11 }}>{this.state.error.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
