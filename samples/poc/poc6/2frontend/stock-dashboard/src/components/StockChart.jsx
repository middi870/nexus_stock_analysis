import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, Legend,
} from 'recharts'

// ── Shared tooltip ─────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-bg-card border border-bg-border rounded-xl px-3 py-2.5 shadow-xl text-xs font-mono">
      <div className="text-text-muted mb-1">{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-text-secondary">{p.name || p.dataKey}:</span>
          <span className="text-text-primary">
            {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Price Chart ────────────────────────────────────────────────────────────
export function PriceChart({ data }) {
  return (
    <div className="bg-bg-card border border-bg-border rounded-2xl p-5 animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-600 text-text-primary text-sm">Price History</h3>
          <p className="text-xs text-text-muted font-mono mt-0.5">{data.length} trading sessions</p>
        </div>
        <div className="flex gap-2">
          {['MA20', 'MA50'].map(ma => (
            <span key={ma} className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-bg-hover text-text-secondary border border-bg-border">
              {ma}
            </span>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#00d4ff" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2d3d" vertical={false} />
          <XAxis dataKey="date" tick={{ fill: '#4a5568', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                 tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fill: '#4a5568', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                 tickLine={false} axisLine={false} width={60}
                 tickFormatter={v => `₹${v?.toLocaleString()}`} />
          <Tooltip content={<ChartTooltip />} />
          <Area  type="monotone" dataKey="close" name="Price" stroke="#00d4ff" strokeWidth={1.5}
                 fill="url(#priceGrad)" dot={false} activeDot={{ r: 4, fill: '#00d4ff', strokeWidth: 0 }} />
          <Line  type="monotone" dataKey="ma20" name="MA20" stroke="#ffa726" strokeWidth={1.2}
                 dot={false} strokeDasharray="4 4" />
          <Line  type="monotone" dataKey="ma50" name="MA50" stroke="#7c4dff" strokeWidth={1.2}
                 dot={false} strokeDasharray="4 4" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── RSI Chart ──────────────────────────────────────────────────────────────
export function RSIChart({ data }) {
  return (
    <div className="bg-bg-card border border-bg-border rounded-2xl p-5 animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-600 text-text-primary text-sm">RSI (14)</h3>
        <div className="flex gap-3 text-[10px] font-mono">
          <span className="text-accent-red">Overbought &gt;70</span>
          <span className="text-accent-green">Oversold &lt;30</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={130}>
        <LineChart data={data} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2d3d" vertical={false} />
          <XAxis dataKey="date" tick={{ fill: '#4a5568', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                 tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis domain={[0, 100]} tick={{ fill: '#4a5568', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                 tickLine={false} axisLine={false} width={30} />
          <Tooltip content={<ChartTooltip />} />
          <ReferenceLine y={70} stroke="#ff4757" strokeDasharray="3 3" strokeOpacity={0.6} />
          <ReferenceLine y={30} stroke="#00e676" strokeDasharray="3 3" strokeOpacity={0.6} />
          <ReferenceLine y={50} stroke="#4a5568" strokeDasharray="2 6" strokeOpacity={0.4} />
          <Line type="monotone" dataKey="rsi" name="RSI" stroke="#00d4ff" strokeWidth={1.5}
                dot={false} activeDot={{ r: 4, fill: '#00d4ff', strokeWidth: 0 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── MACD Chart ─────────────────────────────────────────────────────────────
export function MACDChart({ data }) {
  return (
    <div className="bg-bg-card border border-bg-border rounded-2xl p-5 animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-600 text-text-primary text-sm">MACD (12, 26, 9)</h3>
        <div className="flex gap-3 text-[10px] font-mono">
          <span className="flex items-center gap-1"><span className="inline-block w-4 border-t border-accent-cyan" />MACD</span>
          <span className="flex items-center gap-1"><span className="inline-block w-4 border-t border-amber-400 border-dashed" />Signal</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={130}>
        <BarChart data={data} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2d3d" vertical={false} />
          <XAxis dataKey="date" tick={{ fill: '#4a5568', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                 tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fill: '#4a5568', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                 tickLine={false} axisLine={false} width={30} />
          <Tooltip content={<ChartTooltip />} />
          <ReferenceLine y={0} stroke="#4a5568" />
          <Bar dataKey="macd_hist" name="Histogram" radius={[1, 1, 0, 0]}
               fill="#00d4ff" opacity={0.6}
               // color each bar by sign
               label={false}
          >
            {data.map((entry, i) => (
              <rect
                key={i}
                fill={(entry.macd_hist || 0) >= 0 ? '#00e676' : '#ff4757'}
              />
            ))}
          </Bar>
          <Line type="monotone" dataKey="macd"        name="MACD"   stroke="#00d4ff" strokeWidth={1.5} dot={false} />
          <Line type="monotone" dataKey="macd_signal" name="Signal" stroke="#ffa726" strokeWidth={1.2} dot={false} strokeDasharray="4 4" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Metric Card ────────────────────────────────────────────────────────────
export function MetricCard({ label, value, sub, color = 'cyan', delta }) {
  const colorMap = {
    cyan:   'text-accent-cyan   border-accent-cyan/20   bg-accent-cyan/5',
    green:  'text-accent-green  border-accent-green/20  bg-accent-green/5',
    red:    'text-accent-red    border-accent-red/20    bg-accent-red/5',
    amber:  'text-accent-amber  border-accent-amber/20  bg-accent-amber/5',
    purple: 'text-accent-purple border-accent-purple/20 bg-accent-purple/5',
  }
  const cls = colorMap[color] || colorMap.cyan

  return (
    <div className={`bg-bg-card border ${cls} rounded-2xl p-4 transition-all hover:shadow-glow animate-slide-up`}>
      <div className="text-[10px] text-text-muted font-mono uppercase tracking-widest mb-2">{label}</div>
      <div className={`text-xl font-mono font-600 ${cls.split(' ')[0]} num-anim`}>{value ?? '—'}</div>
      {sub   && <div className="text-xs text-text-muted mt-1 font-mono">{sub}</div>}
      {delta != null && (
        <div className={`text-xs font-mono mt-1 ${delta >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
          {delta >= 0 ? '+' : ''}{delta.toFixed(2)}%
        </div>
      )}
    </div>
  )
}
