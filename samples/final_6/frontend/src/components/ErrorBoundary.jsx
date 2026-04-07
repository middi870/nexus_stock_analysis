/**
 * ErrorBoundary — catches render errors per-component.
 * Prevents the full-app black screen by isolating crashes.
 * Shows an inline error card instead of killing everything.
 */
import { Component } from 'react'
import { IcoRefresh, IcoInfo } from '../icons.jsx'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, info: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    this.setState({ info })
    console.error('[NEXUS ErrorBoundary]', error, info)
  }

  reset() {
    this.setState({ error: null, info: null })
  }

  render() {
    const { error }  = this.state
    const { name = 'Component', children } = this.props

    if (!error) return children

    const msg = error?.message || String(error)

    return (
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 32, background: 'var(--bg)',
      }}>
        <div style={{
          maxWidth: 420, width: '100%',
          background: 'var(--s2)', border: '1px solid rgba(239,68,68,.25)',
          borderRadius: 'var(--rr3)', padding: '24px 28px',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <IcoInfo size={16} stroke="var(--red)"/>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--t1)' }}>
                {name} failed to render
              </div>
              <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 2 }}>
                An unexpected error occurred in this panel
              </div>
            </div>
          </div>

          {/* Error message */}
          <div style={{
            background: 'rgba(239,68,68,.06)', borderRadius: 'var(--rr)',
            padding: '9px 12px', marginBottom: 16,
            fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--red)',
            wordBreak: 'break-word', lineHeight: 1.6,
          }}>
            {msg}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => this.reset()}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 'var(--rr)',
                background: 'var(--s3)', border: '1px solid var(--b2)',
                color: 'var(--t2)', cursor: 'pointer',
                fontFamily: 'var(--ui)', fontSize: 12, fontWeight: 500,
              }}
            >
              <IcoRefresh size={13}/> Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 'var(--rr)',
                background: 'transparent', border: '1px solid var(--b1)',
                color: 'var(--t3)', cursor: 'pointer',
                fontFamily: 'var(--ui)', fontSize: 12,
              }}
            >
              Reload page
            </button>
          </div>
        </div>
      </div>
    )
  }
}
