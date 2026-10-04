import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Game caught unhandled runtime exception:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#080c16] text-white flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-md space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto shadow-lg shadow-rose-950/40">
              <AlertTriangle className="w-8 h-8 stroke-[2.2]" />
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                System Guard
              </span>
              <h1 className="text-2xl font-black tracking-tight text-white mt-3">
                Game State Interrupted
              </h1>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                An unexpected interface anomaly was intercepted. Your connection profile and saved answers remain safely secured.
              </p>
            </div>

            <button
              onClick={this.handleReload}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 px-6 rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Re-enter Game</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
