import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
  compact?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const {
      fallbackTitle = "Något gick fel",
      fallbackDescription = "Den här sektionen kunde inte laddas. Försök igen eller ladda om sidan.",
      compact = false,
    } = this.props;

    if (compact) {
      return (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-sm text-muted-foreground flex-1">{fallbackTitle}</p>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={this.handleReset}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Försök igen
          </Button>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <AlertTriangle className="h-10 w-10 text-destructive opacity-50" />
        <div className="space-y-1">
          <p className="text-sm font-medium">{fallbackTitle}</p>
          <p className="text-xs text-muted-foreground max-w-sm">{fallbackDescription}</p>
        </div>
        <Button variant="outline" size="sm" onClick={this.handleReset}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Försök igen
        </Button>
      </div>
    );
  }
}
