import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Antigravity Caught Error:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      localStorage.clear();
      window.location.href = window.location.origin + window.location.pathname;
    } catch {
      window.location.reload();
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-screen bg-[#020617] text-white flex items-center justify-center p-4">
          <div className="bg-[#0d1117] border border-red-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
              <AlertCircle size={24} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Terjadi Kendala Memuat Aplikasi</h2>
              <p className="text-xs text-slate-400 mt-1">
                Data skema mengalami kendala sementara saat dimuat di browser.
              </p>
            </div>
            {this.state.error && (
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] font-mono text-red-300 text-left overflow-x-auto max-h-32">
                {this.state.error.message}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={this.handleReload}
                className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw size={13} />
                <span>Muat Ulang</span>
              </button>
              <button
                onClick={this.handleReset}
                className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Home size={13} />
                <span>Reset Bersih</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
