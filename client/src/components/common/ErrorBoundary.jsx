import { Component } from "react";

// Catches a crash in any child component so the visitor sees a clear message instead of a blank page.
export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error("Unexpected UI error:", error, info?.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="max-w-md text-sm opacity-70">An unexpected error occurred. Please reload the page. If it keeps happening, try again in a few minutes.</p>
        <div className="flex gap-3">
          <button type="button" className="btn-primary" onClick={() => window.location.reload()}>Reload page</button>
          <button type="button" className="btn-ghost" onClick={() => { window.location.href = "/"; }}>Go to home</button>
        </div>
      </div>
    );
  }
}
