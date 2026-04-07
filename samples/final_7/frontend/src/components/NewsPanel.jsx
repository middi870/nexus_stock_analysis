/**
 * NewsPanel — #6 news feed via /news/{symbol}.
 * Shows latest headlines with publisher, date, and clickable link.
 * Handles loading, empty, and error states gracefully.
 */
import { useState, useEffect } from 'react'
import { api } from '../api.js'
import { IcoGlobe, IcoRefresh } from '../icons.jsx'

function NewsCard({ article }) {
  return (
    <a
      href={article.link || '#'}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display:'block', textDecoration:'none',
        padding:'12px 14px',
        borderBottom:'1px solid var(--b1)',
        transition:'background .1s',
        background:'transparent',
      }}
      onMouseEnter={e => e.currentTarget.style.background='var(--s3)'}
      onMouseLeave={e => e.currentTarget.style.background='transparent'}
    >
      {/* Publisher + date */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
        <IcoGlobe size={10} stroke="var(--t4)"/>
        <span style={{ fontSize:9, color:'var(--t4)', fontFamily:'var(--mono)',
          letterSpacing:'.04em' }}>
          {article.publisher || 'Unknown source'}
        </span>
        {article.published && (
          <>
            <span style={{ fontSize:9, color:'var(--t4)' }}>·</span>
            <span style={{ fontSize:9, color:'var(--t4)', fontFamily:'var(--mono)' }}>
              {article.published}
            </span>
          </>
        )}
      </div>

      {/* Title */}
      <div style={{
        fontSize:12, fontWeight:600, color:'var(--t1)',
        lineHeight:1.5, marginBottom:4,
      }}>
        {article.title}
      </div>

      {/* Summary */}
      {article.summary && (
        <div style={{
          fontSize:11, color:'var(--t3)', lineHeight:1.55,
          display:'-webkit-box', WebkitLineClamp:2,
          WebkitBoxOrient:'vertical', overflow:'hidden',
        }}>
          {article.summary}
        </div>
      )}
    </a>
  )
}

export default function NewsPanel({ symbol }) {
  const [articles, setArticles] = useState(null)   // null = loading
  const [error,    setError    ] = useState(null)
  const [ts,       setTs       ] = useState(Date.now())

  useEffect(() => {
    if (!symbol) return
    setArticles(null); setError(null)
    const ctrl = new AbortController()
    api.news(symbol, ctrl.signal)
      .then(res => {
        setArticles(Array.isArray(res?.articles) ? res.articles : [])
        setError(res?.error || null)
      })
      .catch(e => {
        if (e.name !== 'AbortError') { setArticles([]); setError(e.message) }
      })
    return () => ctrl.abort()
  }, [symbol, ts])

  const refresh = () => setTs(Date.now())

  return (
    <div style={{ background:'var(--s1)', border:'1px solid var(--b1)',
      borderRadius:'var(--rr2)', overflow:'hidden' }}>

      {/* Header */}
      <div style={{
        padding:'9px 14px', borderBottom:'1px solid var(--b1)',
        display:'flex', alignItems:'center', justifyContent:'space-between',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
          <IcoGlobe size={13} stroke="var(--t2)"/>
          <span style={{ fontWeight:700, fontSize:12, color:'var(--t1)' }}>
            Latest News
          </span>
          <span style={{ fontSize:9, color:'var(--t4)', fontFamily:'var(--mono)',
            background:'var(--s3)', padding:'2px 6px', borderRadius:3 }}>
            {symbol}
          </span>
        </div>
        <button className="btn-icon" onClick={refresh} title="Refresh news">
          <IcoRefresh size={13}/>
        </button>
      </div>

      {/* Content */}
      {articles === null ? (
        <div style={{ padding:'20px 14px' }}>
          {[90,70,80,60].map((w,i) => (
            <div key={i} className="skel" style={{ height:11, width:`${w}%`,
              marginBottom:10, borderRadius:3 }}/>
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div style={{ padding:28, textAlign:'center', color:'var(--t4)',
          fontSize:12, fontFamily:'var(--mono)' }}>
          {error
            ? `Could not fetch news: ${error}`
            : 'No recent news found for this stock.'}
        </div>
      ) : (
        articles.map((a, i) => <NewsCard key={i} article={a}/>)
      )}
    </div>
  )
}
