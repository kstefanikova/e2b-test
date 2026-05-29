import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Search, Filter, Download } from './Icons'

const LOG_TEMPLATES = [
  { level: 'INFO', messages: [
    'sandbox initialized [vCPUs=2 RAM=2048MB DISK=5GB]',
    'kernel boot complete in 142ms',
    'python 3.11.9 runtime ready',
    'waiting for workload...',
    'agent: iteration #{n} done',
    'continuing with {n} valid rows',
    'loading dataset from data/input.csv [{n} MB]',
    'checkpoint saved to /tmp/ckpt-{n}.bin',
    'processed batch {n}/500 [{n} rows]',
    'model inference latency: {n}ms',
    'cache hit ratio: 0.{n}',
    'allocated {n}MB for tensor buffer',
    'connected to redis://cache:6379',
    'heartbeat OK [seq={n}]',
    'syncing state to coordinator',
    'GPU utilization: {n}%',
    'compression ratio: {n}:1',
    'writing output to /results/run-{n}.parquet',
    'pipeline stage 3/{n} complete',
    'received task from queue [priority={n}]',
  ]},
  { level: 'WARN', messages: [
    'memory pressure detected',
    'GC pause exceeded 50ms [{n}ms]',
    'disk I/O latency spike: {n}ms',
    'connection pool near capacity [{n}/100]',
    'retrying request after timeout [attempt {n}]',
    'swap usage rising: {n}MB',
    'CPU throttling detected on core {n}',
  ]},
  { level: 'ERROR', messages: [
    'agent: unhandled exception in step #{n}',
    'OOM killed subprocess [PID {n}]',
    'connection refused to db://primary:{n}',
    'assertion failed: tensor shape mismatch at dim {n}',
    'timeout after 30s waiting for lock #{n}',
  ]},
]

function seededRandom(seed) {
  let s = seed
  return () => {
    s = (s * 16807 + 7) % 2147483647
    return s / 2147483647
  }
}

function generateLog(index, rng) {
  const r = rng()
  const templateGroup = r < 0.82 ? LOG_TEMPLATES[0] : r < 0.94 ? LOG_TEMPLATES[1] : LOG_TEMPLATES[2]
  const msg = templateGroup.messages[Math.floor(rng() * templateGroup.messages.length)]
  const n = Math.floor(rng() * 9999) + 1

  // Timeline spans 14:10:00 to 20:00:00 = 21000 seconds
  // Spread logs across this range, with small random jitter for realism
  const startSec = 14 * 3600 + 10 * 60 // 14:10:00 in seconds
  const endSec = 20 * 3600             // 20:00:00 in seconds
  const spanSec = endSec - startSec    // 21000 seconds
  const stepMs = (spanSec * 1000) / INITIAL_COUNT
  const jitter = Math.floor(rng() * stepMs * 0.8)
  const totalMs = startSec * 1000 + Math.floor(index * stepMs) + jitter

  const hour = Math.floor(totalMs / 3600000) % 24
  const min = Math.floor(totalMs / 60000) % 60
  const sec = Math.floor(totalMs / 1000) % 60
  const ms = totalMs % 1000

  const time = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(ms).padStart(3, '0')}`

  return {
    time,
    level: templateGroup.level,
    message: msg.replace(/\{n\}/g, String(n)),
  }
}

function generateInitialLogs(count) {
  const rng = seededRandom(42)
  const logs = []
  for (let i = 0; i < count; i++) {
    logs.push(generateLog(i, rng))
  }
  return logs
}

const levelColors = {
  INFO: 'text-[#3C98C7]',
  WARN: 'text-[#D1A102]',
  ERROR: 'text-[#FF4400]',
}

const INITIAL_COUNT = 1247
const BATCH_INTERVAL = 500 // ms
const LOGS_PER_BATCH = 3   // 3 logs every 500ms = ~6/sec, readable pace

export default function RuntimeLogs({ paused: sandboxPaused, killed, logHighlight, onClearHighlight }) {
  const [logs, setLogs] = useState(() => generateInitialLogs(INITIAL_COUNT))
  const [autoScroll, setAutoScroll] = useState(true)
  const [scrollDisabled, setScrollDisabled] = useState(false) // true when auto-scroll lost by scrolling up
  const [hoverPaused, setHoverPaused] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [levelFilters, setLevelFilters] = useState({ INFO: false, WARN: false, ERROR: false })
  const filterRef = useRef(null)
  const scrollRef = useRef(null)
  const rngRef = useRef(seededRandom(9999))
  const indexRef = useRef(INITIAL_COUNT)
  const [stats, setStats] = useState({ total: INITIAL_COUNT, errors: 20, warnings: 4 })

  const hasActiveFilter = levelFilters.INFO || levelFilters.WARN || levelFilters.ERROR
  const activeFilterLabel = [
    levelFilters.INFO && 'Info',
    levelFilters.WARN && 'Warning',
    levelFilters.ERROR && 'Error',
  ].filter(Boolean).join(', ')

  // Close dropdown on outside click
  useEffect(() => {
    if (!filterOpen) return
    const handleClick = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setFilterOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [filterOpen])

  // Auto-scroll effect — only scroll when autoScroll is on and sandbox is running
  useEffect(() => {
    if (!autoScroll || sandboxPaused || !scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [logs, autoScroll, sandboxPaused])

  // Streaming logs — pauses on hover or search focus
  const effectivelyPaused = sandboxPaused || hoverPaused || searchFocused
  useEffect(() => {
    if (effectivelyPaused) return
    const interval = setInterval(() => {
      const rng = rngRef.current
      const newLogs = []
      let newErrors = 0
      let newWarnings = 0
      for (let i = 0; i < LOGS_PER_BATCH; i++) {
        const log = generateLog(indexRef.current++, rng)
        newLogs.push(log)
        if (log.level === 'ERROR') newErrors++
        if (log.level === 'WARN') newWarnings++
      }
      setLogs(prev => {
        const combined = [...prev, ...newLogs]
        return combined.length > 5000 ? combined.slice(-5000) : combined
      })
      setStats(prev => ({
        total: prev.total + LOGS_PER_BATCH,
        errors: prev.errors + newErrors,
        warnings: prev.warnings + newWarnings,
      }))
    }, BATCH_INTERVAL)
    return () => clearInterval(interval)
  }, [effectivelyPaused])

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    const atBottom = scrollHeight - scrollTop - clientHeight < 40
    if (!atBottom && autoScroll) {
      setAutoScroll(false)
      setScrollDisabled(true)
    }
  }, [autoScroll])

  const toggleAutoScroll = () => {
    const next = !autoScroll
    setAutoScroll(next)
    setScrollDisabled(false)
    if (next && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }

  const filteredLogs = useMemo(() => {
    let result = logs
    if (hasActiveFilter) {
      result = result.filter(log => levelFilters[log.level])
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(log =>
        log.message.toLowerCase().includes(q) ||
        log.level.toLowerCase().includes(q) ||
        log.time.includes(q)
      )
    }
    return result
  }, [logs, searchQuery, levelFilters, hasActiveFilter])

  // Check if a log time falls within highlight range
  const isHighlighted = useCallback((logTime) => {
    if (!logHighlight) return false
    // Compare HH:MM portion
    const t = logTime.slice(0, 5) // "HH:MM"
    return t >= logHighlight.fromLabel && t <= logHighlight.toLabel
  }, [logHighlight])

  // Find first highlighted row index for scrolling
  useEffect(() => {
    if (!logHighlight || !scrollRef.current) return
    const idx = filteredLogs.findIndex(log => isHighlighted(log.time))
    if (idx >= 0) {
      const rowHeight = 32
      scrollRef.current.scrollTop = Math.max(0, idx * rowHeight - 32)
      setAutoScroll(false)
      setScrollDisabled(false)
    }
  }, [logHighlight, filteredLogs, isHighlighted])

  return (
    <div className="outline outline-1 outline-[#D6D6D6] bg-white relative flex flex-col h-full">
      {/* Title */}
      <div className="px-4 pt-5 pb-3 shrink-0">
        <h2 className="text-lg font-bold uppercase text-[#0A0A0A] m-0">Runtime Logs</h2>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 pb-3 shrink-0">
        <div className="flex items-center gap-5">
          <div className="relative flex-1 min-w-0">
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#707070]">
              <Search size={16} />
            </div>
            <input
              type="text"
              placeholder="Search logs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className="h-9 w-[680px] border border-[#D6D6D6] pl-8 pr-3 text-sm font-sans text-[#0A0A0A] placeholder:text-[#707070] outline-none focus:border-[#999]"
            />
          </div>
          <button
            onClick={killed ? undefined : toggleAutoScroll}
            className={`flex items-center gap-2 shrink-0 ${killed ? 'cursor-default' : ''}`}
          >
            <div className={`w-8 h-4 relative border border-[#D6D6D6] transition-colors ${killed ? 'bg-[#D6D6D6]' : autoScroll ? 'bg-[#E56F00]' : 'bg-[#D6D6D6]'}`}>
              <div className={`absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-[#FAFAFA] transition-all ${killed || !autoScroll ? 'left-0.5' : 'right-0.5'}`} />
            </div>
            <span className={`text-xs ${killed ? 'text-[#D6D6D6]' : 'text-[#707070]'}`}>Auto-scroll</span>
          </button>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setFilterOpen(f => !f)}
              className={`h-9 flex items-center gap-1 px-4 border text-sm font-medium font-sans ${hasActiveFilter ? 'border-[#E56F00] text-[#E56F00]' : 'border-[#D6D6D6] text-[#0A0A0A] hover:bg-[#F5F5F5]'}`}
            >
              <Filter size={16} />
              {hasActiveFilter ? activeFilterLabel : 'Filter'}
            </button>
            {filterOpen && (
              <div className="absolute right-0 top-full mt-1 w-[255px] flex flex-col items-start justify-center py-4 px-6 gap-2.5 bg-[#FAFAFA] outline outline-1 outline-[#D6D6D6] z-20" style={{ filter: 'drop-shadow(0px 2px 3px #00000026)' }}>
                <span className="text-xs uppercase text-[#707070] leading-[17px]">Only show</span>
                {[
                  { key: 'INFO', label: 'Info' },
                  { key: 'WARN', label: 'Warning' },
                  { key: 'ERROR', label: 'Error' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setLevelFilters(prev => {
                      const next = { ...prev, [key]: !prev[key] }
                      // Don't allow all 3 selected — that's the same as no filter
                      if (next.INFO && next.WARN && next.ERROR) return prev
                      return next
                    })}
                    className="flex items-center gap-2 h-[17px]"
                  >
                    <div className={`w-4 h-4 border shrink-0 flex items-center justify-center ${levelFilters[key] ? 'bg-[#E56F00] border-[#E56F00]' : 'border-[#D6D6D6]'}`}>
                      {levelFilters[key] && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      )}
                    </div>
                    <span className="text-xs text-[#0A0A0A] leading-[17px]">{label}</span>
                  </button>
                ))}
                <button
                  onClick={() => setLevelFilters({ INFO: false, WARN: false, ERROR: false })}
                  disabled={!hasActiveFilter}
                  className={`h-9 self-stretch flex items-center justify-center border border-[#D6D6D6] text-sm font-sans ${hasActiveFilter ? 'text-[#0A0A0A] hover:bg-[#F0F0F0] cursor-pointer' : 'text-[#D6D6D6] cursor-default'}`}
                >
                  Clear
                </button>
              </div>
            )}
          </div>
          <button className="h-9 flex items-center gap-1 px-4 border border-[#D6D6D6] text-sm font-medium text-[#0A0A0A] hover:bg-[#F5F5F5] font-sans">
            <Download size={16} />
            Export logs
          </button>
        </div>
      </div>

      {/* Log rows + footer in gray background */}
      <div className="flex-1 min-h-0 flex flex-col bg-white border border-[#D6D6D6] mx-4 mb-4 relative">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          onMouseEnter={() => setHoverPaused(true)}
          onMouseLeave={() => setHoverPaused(false)}
          className={`flex-1 overflow-x-hidden px-5 min-h-0 overflow-y-scroll ${autoScroll ? 'scrollbar-hidden' : ''}`}
        >
          {filteredLogs.map((log, i) => {
            const hl = isHighlighted(log.time)
            // Check if this is the first highlighted row
            const isFirstHl = hl && (i === 0 || !isHighlighted(filteredLogs[i - 1]?.time))
            return (
              <div key={i} className="relative">
                {/* Highlight banner on first highlighted row */}
                {isFirstHl && logHighlight && (
                  <div className="absolute -top-[18px] left--5 z-10 h-[18px] flex items-center gap-0.5 px-1 bg-[#0A0A0A] text-white text-xs uppercase leading-[17px] whitespace-nowrap" style={{ left: -20 }}>
                    {logHighlight.type === 'PAUSED' ? (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                        <rect x="6" y="4" width="4" height="16" />
                        <rect x="14" y="4" width="4" height="16" />
                      </svg>
                    ) : (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                    )}
                    {logHighlight.label}
                  </div>
                )}
                <div className={`flex items-center h-8 -mx-5 px-5 transition-colors duration-150 ease-in-out ${hl ? 'bg-[#0A0A0A12] border-x border-[#0A0A0A]' : 'hover:bg-[#F0F0F0]'}`}>
                  <div className="w-[144px] shrink-0">
                    <span className="font-mono text-[13px] text-[#707070] leading-5">{log.time}</span>
                  </div>
                  <div className="w-[90px] shrink-0">
                    <span className={`font-mono text-[13px] font-medium uppercase leading-5 ${levelColors[log.level]}`}>
                      {log.level}
                    </span>
                  </div>
                  <div className="flex-1">
                    <span className={`font-mono text-[13px] leading-5 ${log.level === 'INFO' ? 'text-[#333]' : levelColors[log.level]}`}>
                      {log.message}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Resume auto-scroll button */}
        {scrollDisabled && (
          <button
            onClick={() => {
              setAutoScroll(true)
              setScrollDisabled(false)
              if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
            }}
            className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 h-9 flex items-center gap-1 pl-[14.64px] pr-[16.64px] bg-[#0A0A0A] text-white text-sm font-medium cursor-pointer hover:bg-[#333]"
          >
            <div className="size-4 overflow-clip relative shrink-0">
              <svg viewBox="0 0 9.33 9.33" width="9.33" height="9.33" style={{ width: '58.33%', height: '58.33%', left: '20.83%', top: '20.83%', overflow: 'visible', position: 'absolute' }}>
                <path d="M9.333 4.667L4.667 9.333L0 4.667M4.667 8.556V0" fill="none" stroke="#FFFFFF" strokeWidth="1.778" strokeLinecap="square" vectorEffect="non-scaling-stroke" />
              </svg>
            </div>
            Resume auto-scroll
          </button>
        )}

        {/* Clear selection button */}
        {logHighlight && (
          <button
            onClick={() => {
              onClearHighlight()
              setAutoScroll(true)
              setScrollDisabled(false)
              if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
            }}
            className="absolute right-4 top-3 z-20 h-9 flex items-center gap-1 px-4 bg-[#FAFAFA] border border-[#D6D6D6] text-sm font-medium text-[#0A0A0A] hover:bg-[#F0F0F0]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
            </svg>
            Clear selection
          </button>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-5 h-12 bg-[#FAFAFA] border-t border-[#D6D6D6] shrink-0">
          <span className="font-mono text-[13px] text-[#707070] leading-5">
            {stats.total.toLocaleString()} lines [500/sec] · <span className="font-bold">{stats.errors}</span> errors · <span className="font-bold">{stats.warnings}</span> warnings in total
          </span>
          {autoScroll && (
            <div className={`flex items-center gap-2 transition-opacity ${hoverPaused || sandboxPaused ? 'opacity-100' : 'opacity-60'}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" overflow="visible">
                <path d="M7 17.5L2 20M6.5 11L1 9M9.5 7L7 2M14.5 6L16 1M18.5 10L23 7.5" stroke={hoverPaused || sandboxPaused ? '#E56F00' : '#707070'} strokeWidth="2" />
                <g transform="translate(8 12.4) rotate(-33.67)">
                  <path d="M0 10L4.307 0L8.832 10L4.307 7.044L0 10Z" fill="none" stroke={hoverPaused || sandboxPaused ? '#E56F00' : '#707070'} strokeWidth="1.5" strokeLinejoin="bevel" />
                </g>
              </svg>
              <span className={`font-mono text-[13px] leading-5 ${hoverPaused || sandboxPaused ? 'text-[#E56F00]' : 'text-[#707070]'}`}>
                {sandboxPaused ? 'sandbox paused' : hoverPaused ? 'paused' : 'pause on hover'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
