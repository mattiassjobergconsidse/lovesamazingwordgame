import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  readonly title: string;
  readonly message: string;
  readonly reloadLabel: string;
  readonly onReload: () => void;
  readonly children: ReactNode;
}

interface ErrorBoundaryState {
  readonly hasError: boolean;
}

/** Shows a friendly message instead of a blank screen when rendering fails. */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Unhandled render error", error, info.componentStack);
  }

  override render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }
    return (
      <div role="alert" className="error-boundary">
        <h1>{this.props.title}</h1>
        <p>{this.props.message}</p>
        <button type="button" className="button" onClick={this.props.onReload}>
          {this.props.reloadLabel}
        </button>
      </div>
    );
  }
}
