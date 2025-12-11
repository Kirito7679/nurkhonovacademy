import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#030712] p-4">
          <div className="card p-8 max-w-md w-full text-center animate-fade-scale">
            <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4 animate-pulse-glow" />
            <h2 className="text-2xl font-bold text-white mb-4 font-mono">
              <span className="text-red-400">error</span> occurred
            </h2>
            <p className="text-gray-400 mb-6 font-mono">
              <span className="text-[#39ff14]">if</span>{' '}
              <span className="text-white">(error)</span>{' '}
              <span className="text-[#39ff14]">return</span>{' '}
              <span className="text-gray-500">'Что-то пошло не так'</span>;
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="glow-button px-6 py-3 border border-transparent rounded-lg text-sm font-medium text-black bg-gradient-primary hover:shadow-lg hover:shadow-[#39ff14]/50 transition-all font-mono font-bold"
            >
              reload()
            </button>
            {this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-sm text-gray-500 cursor-pointer font-mono mb-2">
                  <span className="text-[#39ff14]">//</span> Детали ошибки
                </summary>
                <pre className="text-xs text-red-400 bg-[#1f2937] p-4 rounded-lg overflow-auto font-mono">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

