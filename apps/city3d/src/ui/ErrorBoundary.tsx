/* A render or mount error used to leave a blank page (React unmounts the whole tree). This keeps the
   failure on screen with a way out: reload, or reload with the lightest graphics settings, which is
   what usually fixes an out-of-memory or WebGL failure on a tablet. */
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { getLocale } from '@view/i18n';
import { quality, saveQuality } from '@view/quality';

interface State { error: Error | null }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State { return { error }; }

  componentDidCatch(error: Error, info: ErrorInfo) { console.error('[city3d] crashed', error, info.componentStack); }

  private reload = (light: boolean) => {
    if (light) saveQuality(quality('low'));
    location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const en = getLocale() === 'en';
    return (
      <div className="kvc-loader" role="alert">
        <div className="kvc-loader-error">
          <p>{en ? 'The 3D map stopped working.' : 'Bản đồ 3D gặp sự cố và đã dừng.'}</p>
          <p>{error.message}</p>
          <button type="button" className="game-loader-retry" onClick={() => this.reload(false)}>{en ? 'Reload' : 'Tải lại'}</button>
          <button type="button" className="game-loader-retry" onClick={() => this.reload(true)}>
            {en ? 'Reload with low graphics' : 'Tải lại với đồ họa thấp'}
          </button>
        </div>
      </div>
    );
  }
}
