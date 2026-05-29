import { useState, useEffect, useRef } from 'react'

function seededRng(seed) {
  let s = seed
  return () => { s = (s * 16807 + 7) % 2147483647; return s / 2147483647 }
}

// Compute pause gap positions as percentage ranges (matching LifecycleTimeline segments)
function computePauseGaps() {
  const types = ['RUNNING', 'RUNNING', 'RUNNING', 'RUNNING', 'PAUSED', 'PAUSED', 'RUNNING', 'RUNNING', 'RUNNING', 'RUNNING', 'RUNNING', 'RUNNING', 'PAUSED', 'PAUSED', 'RUNNING', 'RUNNING', 'RUNNING', 'RUNNING', 'RUNNING', 'RUNNING']
  const totalSlots = types.length
  const gaps = []
  let i = 0
  while (i < totalSlots) {
    if (types[i] === 'PAUSED') {
      const start = i
      while (i < totalSlots && types[i] === 'PAUSED') i++
      gaps.push({ leftPct: (start / totalSlots) * 100, widthPct: ((i - start) / totalSlots) * 100 })
    } else {
      i++
    }
  }
  return gaps
}

const pauseGaps = computePauseGaps()

function isInPauseGap(pct) {
  const pctVal = pct * 100
  return pauseGaps.some(gap => pctVal >= gap.leftPct && pctVal < gap.leftPct + gap.widthPct)
}

// Generate sharp angular chart data — mostly flat baseline with narrow triangular spikes
function generatePoints(count, seed, baseLevel, volatility, spikiness = 0) {
  const rng = seededRng(seed)
  const points = []
  let i = 0
  while (i < count) {
    // Small jitter around baseline
    const jitter = (rng() - 0.5) * volatility * 0.3
    const base = baseLevel + jitter

    if (spikiness > 0 && rng() < 0.15) {
      // Sharp spike: go up in 1 point, come back down in 1 point
      const peakHeight = (rng() * 0.6 + 0.2) * spikiness
      points.push(Math.max(0.02, Math.min(0.98, base)))
      i++
      if (i < count) { points.push(Math.max(0.02, Math.min(0.98, base + peakHeight))); i++ }
      if (i < count) { points.push(Math.max(0.02, Math.min(0.98, base))); i++ }
    } else {
      // Flat segment — hold near baseline for several points
      const flatLen = Math.floor(rng() * 4) + 1
      for (let j = 0; j < flatLen && i < count; j++, i++) {
        points.push(Math.max(0.02, Math.min(0.98, base)))
      }
    }
  }
  return points.slice(0, count)
}

function pointsToPath(points, width, height) {
  const step = width / (points.length - 1)
  const coords = points.map((p, i) => ({ x: i * step, y: height * (1 - p) }))
  const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ')
  const fill = `${line} L${width} ${height} L0 ${height} Z`
  return { line, fill }
}

// Mirrored chart: two series spiking away from a shared horizontal center line
function formatHoverTime(pct) {
  // Map 0-1 to 14:10 – 20:00
  const startMin = 14 * 60 + 10
  const endMin = 20 * 60
  const min = startMin + pct * (endMin - startMin)
  const h = Math.floor(min / 60)
  const m = Math.floor(min % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function MirroredMetricCard({ title, value, seed, paused }) {
  const [hoverPct, setHoverPct] = useState(null)
  const width = 448
  const upperH = 37
  const lowerH = 65
  const totalChartH = upperH + lowerH
  const topOffset = 62
  const visibleCount = 100

  const [upperPointsState, setUpperPointsState] = useState(() => generatePoints(visibleCount, seed, 0.08, 0.10, 0.6))
  const [lowerPointsState, setLowerPointsState] = useState(() => generatePoints(visibleCount, seed + 200, 0.12, 0.12, 0.7))
  const upperRngRef = useRef(seededRng(seed + 7000))
  const lowerRngRef = useRef(seededRng(seed + 8000))

  useEffect(() => {
    if (paused) return
    const interval = setInterval(() => {
      setUpperPointsState(prev => [...prev.slice(1), generateNextPoint(upperRngRef.current, 0.08, 0.10, 0.6, prev[prev.length - 1])])
      setLowerPointsState(prev => [...prev.slice(1), generateNextPoint(lowerRngRef.current, 0.12, 0.12, 0.7, prev[prev.length - 1])])
    }, 5000)
    return () => clearInterval(interval)
  }, [paused])

  const step = width / (visibleCount - 1)

  const upperLine = upperPointsState.map((p, i) => {
    const x = (i * step).toFixed(1)
    const y = (upperH * (1 - p)).toFixed(1)
    return `${i === 0 ? 'M' : 'L'}${x} ${y}`
  }).join(' ')
  const upperFill = `${upperLine} L${width} ${upperH} L0 ${upperH} Z`

  const lowerLine = lowerPointsState.map((p, i) => {
    const x = (i * step).toFixed(1)
    const y = (lowerH * p).toFixed(1)
    return `${i === 0 ? 'M' : 'L'}${x} ${y}`
  }).join(' ')
  const lowerFill = `${lowerLine} L${width} 0 L0 0 Z`

  const [displayVal, setDisplayVal] = useState(value)
  const valRngRef = useRef(seededRng(seed + 999))
  useEffect(() => {
    if (paused) return
    const interval = setInterval(() => {
      const r = valRngRef.current()
      const base = parseInt(value)
      setDisplayVal(`${base + Math.round((r - 0.5) * 4)}%`)
    }, 5000)
    return () => clearInterval(interval)
  }, [value, seed, paused])

  return (
    <div className="flex-1 relative bg-white overflow-hidden outline outline-1 outline-[#D6D6D6]" style={{ height: 175 }}>
      <div className="absolute top-3.5 left-4 z-10">
        <span className="text-sm font-bold uppercase text-[#0A0A0A]">{title}</span>
      </div>
      <div className="absolute top-3.5 right-4 z-10">
        <span className="text-2xl text-[#333333]">{displayVal}</span>
      </div>
      {/* Upper half — blue, spikes upward */}
      <svg
        viewBox={`0 0 ${width} ${upperH}`}
        preserveAspectRatio="none"
        className="absolute left-0 w-full"
        style={{ top: topOffset, height: upperH }}
      >
        <path d={upperFill} fill="#0000FC33" style={{ transition: 'none' }} />
        <path d={upperLine} fill="none" stroke="#0000FC" strokeWidth="1.5" strokeLinejoin="bevel" vectorEffect="non-scaling-stroke" style={{ transition: 'none' }} />
        {pauseGaps.map((gap, i) => (
          <rect key={`gap-${i}`} x={`${gap.leftPct}%`} y="0" width={`${gap.widthPct}%`} height={upperH} fill="white" />
        ))}
      </svg>
      {/* Lower half — teal, spikes downward */}
      <svg
        viewBox={`0 0 ${width} ${lowerH}`}
        preserveAspectRatio="none"
        className="absolute left-0 w-full"
        style={{ top: topOffset + upperH, height: lowerH }}
      >
        <path d={lowerFill} fill="#01DFDF33" style={{ transition: 'none' }} />
        <path d={lowerLine} fill="none" stroke="#01B4B4" strokeWidth="1.5" strokeLinejoin="bevel" vectorEffect="non-scaling-stroke" style={{ transition: 'none' }} />
        {pauseGaps.map((gap, i) => (
          <rect key={`gap-${i}`} x={`${gap.leftPct}%`} y="0" width={`${gap.widthPct}%`} height={lowerH} fill="white" />
        ))}
      </svg>
      {/* Hover interaction — upper half (Read) */}
      <div
        className="absolute left-0 w-full z-20"
        style={{ top: topOffset, height: upperH }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.parentElement.getBoundingClientRect()
          setHoverPct({ pct: (e.clientX - rect.left) / rect.width, zone: 'upper' })
        }}
        onMouseLeave={() => setHoverPct(null)}
      />
      {/* Hover interaction — lower half (Write) */}
      <div
        className="absolute left-0 w-full z-20"
        style={{ top: topOffset + upperH, height: lowerH }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.parentElement.getBoundingClientRect()
          setHoverPct({ pct: (e.clientX - rect.left) / rect.width, zone: 'lower' })
        }}
        onMouseLeave={() => setHoverPct(null)}
      />
      {/* Hover line + marker + time label */}
      {hoverPct !== null && (() => {
        const { pct, zone } = hoverPct
        const inGap = isInPauseGap(pct)
        const idx = Math.min(Math.floor(pct * visibleCount), visibleCount - 1)
        if (zone === 'upper') {
          const val = inGap ? 0 : (upperPointsState[idx] || 0)
          const markerY = topOffset + upperH * (1 - val)
          return (
            <>
              <div className="absolute top-0 bottom-0 w-px bg-[#D6D6D6] z-10 pointer-events-none" style={{ left: `${pct * 100}%` }} />
              {!inGap && <div className="absolute w-[7px] h-[7px] bg-[#0A0A0A] z-10 pointer-events-none" style={{
                left: `calc(${pct * 100}% - 3.5px)`,
                top: markerY - 3.5,
              }} />}
              <div className="absolute z-20 pointer-events-none border border-[#D6D6D6] bg-white px-1.5 py-0.5 flex items-center gap-2" style={{
                left: `calc(${pct * 100}% - 22px)`,
                top: inGap ? topOffset + upperH - 28 : markerY - 28,
              }}>
                <span className="font-mono text-xs text-[#0A0A0A]">{formatHoverTime(pct)}</span>
                <span className="font-mono text-xs text-[#0000FC]">Read {inGap ? '0' : `${Math.round(val * 100)}%`}</span>
              </div>
            </>
          )
        } else {
          const val = inGap ? 0 : (lowerPointsState[idx] || 0)
          const markerY = topOffset + upperH + lowerH * val
          return (
            <>
              <div className="absolute top-0 bottom-0 w-px bg-[#D6D6D6] z-10 pointer-events-none" style={{ left: `${pct * 100}%` }} />
              {!inGap && <div className="absolute w-[7px] h-[7px] bg-[#0A0A0A] z-10 pointer-events-none" style={{
                left: `calc(${pct * 100}% - 3.5px)`,
                top: markerY - 3.5,
              }} />}
              <div className="absolute z-20 pointer-events-none border border-[#D6D6D6] bg-white px-1.5 py-0.5 flex items-center gap-2" style={{
                left: `calc(${pct * 100}% - 22px)`,
                top: inGap ? topOffset + upperH + 10 : markerY + 10,
              }}>
                <span className="font-mono text-xs text-[#0A0A0A]">{formatHoverTime(pct)}</span>
                <span className="font-mono text-xs text-[#01B4B4]">Write {inGap ? '0' : `${Math.round(val * 100)}%`}</span>
              </div>
            </>
          )
        }
      })()}
    </div>
  )
}

// Generate a single new point in the same style as generatePoints
function generateNextPoint(rng, baseLevel, volatility, spikiness, prevVal) {
  const jitter = (rng() - 0.5) * volatility * 0.3
  const base = baseLevel + jitter
  if (spikiness > 0 && rng() < 0.15) {
    // Return a spike peak — caller can add the return-to-base on the next call
    const peakHeight = (rng() * 0.6 + 0.2) * spikiness
    return Math.max(0.02, Math.min(0.98, base + peakHeight))
  }
  return Math.max(0.02, Math.min(0.98, base))
}

function MetricCard({ title, value, unit, seed, baseLevel, volatility, spikiness, strokeColor, fillColor, lines, paused }) {
  const [hoverPct, setHoverPct] = useState(null)
  const width = 448
  const chartH = 145
  const visibleCount = 100

  const [pointsState, setPointsState] = useState(() => generatePoints(visibleCount, seed, baseLevel, volatility, spikiness))
  const [extraPointsState, setExtraPointsState] = useState(() =>
    (lines || []).map(l => generatePoints(visibleCount, l.seed, l.baseLevel, l.volatility, l.spikiness || 0))
  )
  const rngRef = useRef(seededRng(seed + 5000))
  const extraRngsRef = useRef((lines || []).map((l, i) => seededRng(seed + 6000 + i)))

  useEffect(() => {
    if (paused) return
    const interval = setInterval(() => {
      setPointsState(prev => {
        const next = [...prev.slice(1), generateNextPoint(rngRef.current, baseLevel, volatility, spikiness, prev[prev.length - 1])]
        return next
      })
      if (lines && lines.length > 0) {
        setExtraPointsState(prev => prev.map((pts, i) => {
          const l = lines[i]
          return [...pts.slice(1), generateNextPoint(extraRngsRef.current[i], l.baseLevel, l.volatility, l.spikiness || 0, pts[pts.length - 1])]
        }))
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [baseLevel, volatility, spikiness, lines, paused])

  const primary = pointsToPath(pointsState, width, chartH)
  const extraPaths = (lines || []).map((l, i) => ({
    ...pointsToPath(extraPointsState[i] || [], width, chartH),
    ...l,
  }))

  const [displayVal, setDisplayVal] = useState(value)
  const valRngRef = useRef(seededRng(seed + 999))
  useEffect(() => {
    if (paused) return
    const interval = setInterval(() => {
      const r = valRngRef.current()
      if (value.includes('GB')) {
        const base = parseFloat(value)
        setDisplayVal(`${(base + (r - 0.5) * 0.04).toFixed(2)} GB`)
      } else if (value.includes('%')) {
        const base = parseInt(value)
        setDisplayVal(`${base + Math.round((r - 0.5) * 4)}%`)
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [value, seed, paused])

  return (
    <div className="flex-1 relative bg-white overflow-hidden outline outline-1 outline-[#D6D6D6]" style={{ height: 175 }}>
      <div className="absolute top-3.5 left-4 z-10">
        <span className="text-sm font-bold uppercase text-[#0A0A0A]">{title}</span>
      </div>
      <div className="absolute top-3.5 right-4 z-10">
        <span className="text-2xl text-[#333333]">{displayVal}</span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${chartH}`}
        preserveAspectRatio="none"
        className="absolute bottom-0 left-0 w-full"
        style={{ height: chartH }}
      >
        <path d={primary.fill} fill={fillColor} style={{ transition: 'none' }} />
        <path d={primary.line} fill="none" stroke={strokeColor} strokeWidth="1.5" vectorEffect="non-scaling-stroke" style={{ transition: 'none' }} />
        {extraPaths.map((ep, i) => (
          <g key={i}>
            {ep.fillColor && <path d={ep.fill} fill={ep.fillColor} style={{ transition: 'none' }} />}
            <path d={ep.line} fill="none" stroke={ep.strokeColor} strokeWidth="1.5" vectorEffect="non-scaling-stroke" style={{ transition: 'none' }} />
          </g>
        ))}
        {pauseGaps.map((gap, i) => (
          <rect key={`gap-${i}`} x={`${gap.leftPct}%`} y="0" width={`${gap.widthPct}%`} height={chartH} fill="white" />
        ))}
      </svg>
      {/* Hover interaction layer */}
      <div
        className="absolute inset-0 z-20"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          setHoverPct((e.clientX - rect.left) / rect.width)
        }}
        onMouseLeave={() => setHoverPct(null)}
      />
      {/* Hover line + marker + time label */}
      {hoverPct !== null && (() => {
        const inGap = isInPauseGap(hoverPct)
        const idx = Math.min(Math.floor(hoverPct * visibleCount), visibleCount - 1)
        const pointVal = inGap ? 0 : (pointsState[idx] || 0)
        const markerY = 175 - chartH + chartH * (1 - pointVal)
        const metricVal = inGap ? '0' : (unit === 'GB' ? `${(pointVal * 8).toFixed(2)} GB` : `${Math.round(pointVal * 100)}%`)
        return (
          <>
            <div className="absolute top-0 bottom-0 w-px bg-[#D6D6D6] z-10 pointer-events-none" style={{ left: `${hoverPct * 100}%` }} />
            {!inGap && <div className="absolute w-[7px] h-[7px] bg-[#0A0A0A] z-10 pointer-events-none" style={{
              left: `calc(${hoverPct * 100}% - 3.5px)`,
              top: markerY - 3.5,
            }} />}
            <div className="absolute z-20 pointer-events-none border border-[#D6D6D6] bg-white px-1.5 py-0.5 flex items-center gap-2" style={{
              left: `calc(${hoverPct * 100}% - 22px)`,
              top: inGap ? 175 - 28 : markerY - 28,
            }}>
              <span className="font-mono text-xs text-[#0A0A0A]">{formatHoverTime(hoverPct)}</span>
              <span className="font-mono text-xs text-[#707070]">{metricVal}</span>
            </div>
          </>
        )
      })()}
    </div>
  )
}

export default function MetricsPanel({ paused }) {
  return (
    <div className="flex items-stretch shrink-0">
      {/* CPU — spiky teal, dark teal area fill, ~30% base with peaks to 70% */}
      <MetricCard
        title="CPU"
        value="23%"
        unit="%"
        seed={123}
        baseLevel={0.30}
        volatility={0.12}
        spikiness={0.5}
        strokeColor="#01B4B4"
        fillColor="#01DFDF33"
        paused={paused}
      />
      <div className="w-px bg-[#D6D6D6]" />
      {/* MEMORY — flat green line near top, solid dark green fill */}
      <MetricCard
        title="MEMORY"
        value="6.70 GB"
        unit="GB"
        seed={456}
        baseLevel={0.82}
        volatility={0.015}
        spikiness={0}
        strokeColor="#01DF22"
        fillColor="#01DF2233"
        paused={paused}
      />
      <div className="w-px bg-[#D6D6D6]" />
      {/* DISK — mirrored chart: blue spikes up, teal spikes down from center */}
      <MirroredMetricCard
        title="DISK"
        value="34%"
        seed={789}
        paused={paused}
      />
    </div>
  )
}
