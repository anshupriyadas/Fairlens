import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("FairLens render error:", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleHardReset = () => {
    try {
      sessionStorage.removeItem("fairlens-storage");
    } catch {}
    window.location.assign(import.meta.env.BASE_URL || "/");
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full min-h-[60vh] flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 shadow-lg text-center space-y-5">
            <div className="mx-auto w-14 h-14 bg-destructive/10 text-destructive rounded-full flex items-center justify-center">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold mb-1">Something went wrong on this page</h2>
              <p className="text-sm text-muted-foreground">
                The rest of the app is still safe. You can recover from this view.
              </p>
            </div>
            {this.state.error?.message && (
              <pre className="text-xs text-left bg-muted/50 p-3 rounded font-mono text-muted-foreground overflow-x-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex gap-3 justify-center pt-2">
              <Button variant="outline" onClick={this.handleReset} data-testid="btn-recover">
                <RotateCcw className="w-4 h-4 mr-2" />
                Try again
              </Button>
              <Button onClick={this.handleHardReset} data-testid="btn-hard-reset">
                Reset session
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
