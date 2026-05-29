import { useState, useEffect, useRef } from 'react'

const periodTabs = ['LAST 24H', '1H', '6H', '7D', '14D']

function seededRng(seed) {
  let s = seed
  return () => { s = (s * 16807 + 7) % 2147483647; return s / 2147483647 }
}

function formatTime(hours, minutes) {
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

// Generate deterministic segment data for hover tooltips
// Raw small segments, then merge consecutive RUNNING (up to 6)
function generateSegments(seed) {
  const rng = seededRng(seed)
  const types = ['RUNNING', 'RUNNING', 'RUNNING', 'RUNNING', 'PAUSED', 'PAUSED', 'RUNNING', 'RUNNING', 'RUNNING', 'RUNNING', 'RUNNING', 'RUNNING', 'RUNNING', 'RUNNING', 'RUNNING', 'RUNNING', 'RUNNING', 'PAUSED', 'PAUSED', 'RUNNING']
  const triggers = ['via API', 'via user']
  const rawCount = types.length
  const startMin = 14 * 60 + 10 // 14:10
  const endMin = 20 * 60        // 20:00
  const spanMin = endMin - startMin
  const slotLen = spanMin / rawCount

  // Build raw segments — mark first RUNNING after PAUSED as RESUMED
  const raw = types.map((type, i) => {
    const resolvedType = type === 'RUNNING' && i > 0 && types[i - 1] === 'PAUSED' ? 'RESUMED' : type
    return {
      type: resolvedType,
      trigger: resolvedType === 'PAUSED' ? triggers[Math.floor(rng() * triggers.length)] : null,
      fromSlot: i,
      toSlot: i + 1,
      cpu: resolvedType === 'PAUSED' ? 0 : Math.floor(rng() * 40 + 10),
      memory: resolvedType === 'PAUSED' ? 0 : +(rng() * 4 + 3).toFixed(1),
      disk: resolvedType === 'PAUSED' ? 0 : Math.floor(rng() * 20 + 20),
    }
  })

  // Merge consecutive RUNNING segments (up to 6)
  const merged = []
  let i = 0
  while (i < raw.length) {
    if (raw[i].type === 'PAUSED') {
      // Merge consecutive PAUSED slots
      let pauseStart = i
      while (i < raw.length && raw[i].type === 'PAUSED') {
        i++
      }
      const group = raw.slice(pauseStart, i)
      merged.push({
        type: 'PAUSED',
        trigger: group[0].trigger,
        fromSlot: group[0].fromSlot,
        toSlot: group[group.length - 1].toSlot,
        cpu: 0,
        memory: 0,
        disk: 0,
      })
    } else if (raw[i].type === 'RESUMED') {
      merged.push(raw[i])
      i++
    } else {
      // Collect consecutive RUNNING (not RESUMED), merge up to 6
      let runStart = i
      while (i < raw.length && raw[i].type === 'RUNNING' && (i - runStart) < 6) {
        i++
      }
      const group = raw.slice(runStart, i)
      const avgCpu = Math.round(group.reduce((s, g) => s + g.cpu, 0) / group.length)
      const avgMem = +(group.reduce((s, g) => s + g.memory, 0) / group.length).toFixed(1)
      const avgDisk = Math.round(group.reduce((s, g) => s + g.disk, 0) / group.length)
      merged.push({
        type: 'RUNNING',
        trigger: null,
        fromSlot: group[0].fromSlot,
        toSlot: group[group.length - 1].toSlot,
        cpu: avgCpu,
        memory: avgMem,
        disk: avgDisk,
      })
    }
  }

  // Convert slot ranges to time labels and sizes
  return merged.map(seg => {
    const from = startMin + Math.floor(seg.fromSlot * slotLen)
    const to = startMin + Math.floor(seg.toSlot * slotLen)
    const durMin = to - from
    const s = Math.floor(seededRng(seed + seg.fromSlot)() * 59)
    return {
      ...seg,
      size: seg.toSlot - seg.fromSlot, // how many raw slots this spans
      duration: durMin >= 60 ? `${Math.floor(durMin / 60)} h ${durMin % 60} m ${s} s` : `${durMin} m ${s} s`,
      fromLabel: `${String(Math.floor(from / 60)).padStart(2, '0')}:${String(from % 60).padStart(2, '0')}`,
      toLabel: `${String(Math.floor(to / 60)).padStart(2, '0')}:${String(to % 60).padStart(2, '0')}`,
    }
  })
}

const segments = generateSegments(4242)
const totalSlots = segments.reduce((s, seg) => s + seg.size, 0)

export default function LifecycleTimeline({ paused, killed, onSegmentClick }) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const imgRef = useRef(null)
  const rngRef = useRef(seededRng(9999))
  const [imgLoaded, setImgLoaded] = useState(false)
  const [tick, setTick] = useState(0)
  const [hoveredSegment, setHoveredSegment] = useState(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, segIdx: -1 })
  const [startHovered, setStartHovered] = useState(false)
  const baseDataRef = useRef(null)
  const canvasMetaRef = useRef(null)
  const [canvasWidth, setCanvasWidth] = useState(0)
  const pauseFadeRef = useRef(0) // current wipe cursor in columns
  const shiftRef = useRef(0) // accumulated permanent shift in columns from past pauses
  const wasPausedRef = useRef(false) // track pause→resume transitions
  const resumeSegmentsRef = useRef([]) // [{startCol, widthCols, startTick}] — gap segments to fill after resume
  const killProgressRef = useRef(0) // how many columns of kill dots have appeared

  const nowLabel = killed ? '20:30' : '20:00'

  // Tick counter for resume dot growth animation
  useEffect(() => {
    if (paused) return
    const interval = setInterval(() => setTick(t => t + 1), 2000)
    return () => clearInterval(interval)
  }, [paused])

  // Track container size for responsive canvas
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const dpr = window.devicePixelRatio || 1
        setCanvasWidth(Math.round(entry.contentRect.width * dpr))
      }
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [])

  // Initialize canvas: sample image at native res, render as perfect-square dots
  useEffect(() => {
    if (!imgLoaded || !canvasWidth) return
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img) return

    const dpr = window.devicePixelRatio || 1
    const w = canvasWidth
    const h = Math.round(42 * dpr)
    canvas.width = w
    canvas.height = h

    // 1. Sample the source image at its natural size to find dot positions
    const tmpCanvas = document.createElement('canvas')
    const imgW = img.naturalWidth
    const imgH = img.naturalHeight
    tmpCanvas.width = imgW
    tmpCanvas.height = imgH
    const tmpCtx = tmpCanvas.getContext('2d')
    tmpCtx.drawImage(img, 0, 0)
    const srcData = tmpCtx.getImageData(0, 0, imgW, imgH)
    const srcDotSize = 6

    // Build a normalized grid of dot colors from the source image
    const cols = Math.floor(imgW / srcDotSize)
    const rows = Math.floor(imgH / srcDotSize)
    const dotMap = [] // [{col, row, r, g, b}]
    const dotGridSrc = {}
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const sx = col * srcDotSize
        const sy = row * srcDotSize
        const i = (sy * imgW + sx) * 4
        const r = srcData.data[i], g = srcData.data[i + 1], b = srcData.data[i + 2], a = srcData.data[i + 3]
        if (a > 20 && !(r > 240 && g > 240 && b > 240)) {
          dotGridSrc[`${col},${row}`] = true
          dotMap.push({ col, row, r, g, b })
        }
      }
    }

    // Thin out dense areas
    const thinRng = seededRng(777)
    const removedSet = new Set()
    for (const dot of dotMap) {
      let neighbors = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue
          if (dotGridSrc[`${dot.col + dx},${dot.row + dy}`]) neighbors++
        }
      }
      const removeChance = neighbors >= 6 ? 0.35 : neighbors >= 4 ? 0.2 : neighbors >= 2 ? 0.1 : 0
      if (thinRng() < removeChance) {
        removedSet.add(`${dot.col},${dot.row}`)
        dotGridSrc[`${dot.col},${dot.row}`] = false
      }
    }
    const finalDots = dotMap.filter(d => !removedSet.has(`${d.col},${d.row}`))

    // 2. Render perfect-square dots onto output canvas
    const dotSize = Math.max(2, Math.round(h / rows))
    const ctx = canvas.getContext('2d')
    const outData = ctx.createImageData(w, h)
    // Fill white
    for (let i = 0; i < outData.data.length; i += 4) {
      outData.data[i] = 255; outData.data[i + 1] = 255; outData.data[i + 2] = 255; outData.data[i + 3] = 255
    }
    // Map grid positions to output canvas
    const xStep = w / cols
    const yStep = h / rows
    const outDotCenters = []
    for (const dot of finalDots) {
      const px0 = Math.round(dot.col * xStep)
      const py0 = Math.round(dot.row * yStep)
      outDotCenters.push({ x: px0, y: py0 })
      for (let py = py0; py < py0 + dotSize && py < h; py++) {
        for (let px = px0; px < px0 + dotSize && px < w; px++) {
          const i = (py * w + px) * 4
          outData.data[i] = dot.r; outData.data[i + 1] = dot.g; outData.data[i + 2] = dot.b; outData.data[i + 3] = 255
        }
      }
    }

    ctx.putImageData(outData, 0, 0)
    baseDataRef.current = ctx.getImageData(0, 0, w, h)
    canvasMetaRef.current = { w, h, dotSize, dotCenters: outDotCenters }
  }, [imgLoaded, canvasWidth])

  // Twinkle + progress + pause fade + shift
  useEffect(() => {
    if (!baseDataRef.current || !canvasMetaRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const { w, h, dotSize, dotCenters } = canvasMetaRef.current
    const maxCol = Math.floor(w / dotSize)

    // Wipe cursor: 0 = no wipe, caps at ~12% of width
    const maxWipe = Math.floor(maxCol * 0.12)
    let wipeCursor = pauseFadeRef.current

    // On resume: bake the current wipe into a permanent shift, record segment to fill
    if (wasPausedRef.current && !paused && wipeCursor > 0) {
      const gapWidthCols = wipeCursor
      const patternEndCol = maxCol - shiftRef.current
      resumeSegmentsRef.current.push({
        startCol: patternEndCol - gapWidthCols, // left edge of gap (in shifted canvas space)
        widthCols: gapWidthCols,
        startTick: tick,
      })
      shiftRef.current += gapWidthCols
      wipeCursor = 0
      pauseFadeRef.current = 0
    }
    wasPausedRef.current = paused

    const interval = setInterval(() => {
      // Move wipe cursor when paused
      const speed = 2
      if (paused) {
        wipeCursor = Math.min(wipeCursor + speed, maxWipe)
      }
      pauseFadeRef.current = wipeCursor

      const totalShiftCols = shiftRef.current
      const totalShiftPx = totalShiftCols * dotSize

      // Build shifted image: shift base data left by totalShiftPx
      const progressData = new ImageData(w, h)
      const baseData = baseDataRef.current.data
      // Fill white first
      for (let i = 0; i < progressData.data.length; i += 4) {
        progressData.data[i] = 255; progressData.data[i + 1] = 255; progressData.data[i + 2] = 255; progressData.data[i + 3] = 255
      }
      // Copy base data shifted left
      if (totalShiftPx < w) {
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w - totalShiftPx; x++) {
            const srcI = (y * w + x + totalShiftPx) * 4
            const dstI = (y * w + x) * 4
            progressData.data[dstI] = baseData[srcI]
            progressData.data[dstI + 1] = baseData[srcI + 1]
            progressData.data[dstI + 2] = baseData[srcI + 2]
            progressData.data[dstI + 3] = baseData[srcI + 3]
          }
        }
      }

      // After each resume, grow new dots from the right edge of the canvas
      for (const seg of resumeSegmentsRef.current) {
        const ticksSinceResume = tick - seg.startTick
        if (ticksSinceResume <= 0) continue
        // Grow from right edge leftward, filling the gap area
        const growCols = Math.min(Math.ceil(ticksSinceResume * (seg.widthCols / 3)), seg.widthCols)
        const growWidth = growCols * dotSize
        const fillStartX = w - growWidth // start from right edge
        const segRng = seededRng(5555 + seg.startTick)
        for (let t = 0; t < ticksSinceResume && t < 20; t++) {
          const numDots = 3 + Math.floor(segRng() * 5)
          for (let d = 0; d < numDots; d++) {
            const xBase = fillStartX + Math.floor(segRng() * growWidth)
            const ySlot = Math.floor(segRng() * (h / dotSize)) * dotSize
            const isGreen = segRng() > 0.4
            const color = isGreen ? [1, 223, 34] : [0, 85, 255]
            if (xBase >= 0 && xBase < w) {
              for (let py = ySlot; py < ySlot + dotSize && py < h; py++) {
                for (let px = xBase; px < xBase + dotSize && px < w; px++) {
                  const i = (py * w + px) * 4
                  progressData.data[i] = color[0]; progressData.data[i + 1] = color[1]; progressData.data[i + 2] = color[2]; progressData.data[i + 3] = 255
                }
              }
            }
          }
        }
      }

      // Erase columns for active wipe (current pause)
      if (wipeCursor > 0) {
        const wipeRightEdge = w - totalShiftPx // where pattern currently ends
        const wipeStartX = wipeRightEdge - wipeCursor * dotSize
        for (let py = 0; py < h; py++) {
          for (let px = Math.max(0, wipeStartX); px < Math.min(w, wipeRightEdge); px++) {
            const i = (py * w + px) * 4
            progressData.data[i] = 255; progressData.data[i + 1] = 255; progressData.data[i + 2] = 255; progressData.data[i + 3] = 255
          }
        }
      }

      // Killed state: paint orange/red dots growing gradually from the right edge
      if (killed) {
        const killMaxCols = Math.floor(maxCol * 0.06)
        killProgressRef.current = Math.min(killProgressRef.current + 1, killMaxCols)
        const visibleCols = killProgressRef.current
        const killRng = seededRng(3333)
        const killStartX = w - killMaxCols * dotSize
        for (let col = 0; col < killMaxCols; col++) {
          for (let row = 0; row < Math.floor(h / dotSize); row++) {
            const skip = killRng() < 0.5
            const isOrange = killRng() > 0.3
            // Only render columns that have appeared (grow from right)
            const colFromRight = killMaxCols - 1 - col
            if (colFromRight >= visibleCols || skip) continue
            const px0 = killStartX + col * dotSize
            const py0 = row * dotSize
            const color = isOrange ? [255, 68, 0] : [204, 34, 0]
            for (let py = py0; py < py0 + dotSize && py < h; py++) {
              for (let px = px0; px < px0 + dotSize && px < w; px++) {
                const i = (py * w + px) * 4
                progressData.data[i] = color[0]; progressData.data[i + 1] = color[1]; progressData.data[i + 2] = color[2]; progressData.data[i + 3] = 255
              }
            }
          }
        }
      } else {
        killProgressRef.current = 0
      }

      // Twinkle: erase random dot clusters (only on visible shifted dots)
      if (!paused) {
        const blinkCount = 15 + Math.floor(rngRef.current() * 15)
        for (let j = 0; j < blinkCount; j++) {
          const dot = dotCenters[Math.floor(rngRef.current() * dotCenters.length)]
          if (dot) {
            const shiftedX = dot.x - totalShiftPx
            if (shiftedX >= 0 && shiftedX < w) {
              for (let py = dot.y; py < dot.y + dotSize && py < h; py++) {
                for (let px = shiftedX; px < shiftedX + dotSize && px < w; px++) {
                  const i = (py * w + px) * 4
                  progressData.data[i] = 255; progressData.data[i + 1] = 255; progressData.data[i + 2] = 255; progressData.data[i + 3] = 255
                }
              }
            }
          }
        }
      }

      ctx.putImageData(progressData, 0, 0)
    }, 400)

    return () => clearInterval(interval)
  }, [imgLoaded, canvasWidth, tick, paused, killed])

  return (
    <div className="px-6 py-6 relative" style={{ height: 190, zIndex: hoveredSegment !== null ? 20 : 'auto' }}>
      <div className="flex flex-col gap-4">
        <span className="text-[#0A0A0A] text-sm uppercase">
          Lifecycle Timeline
        </span>

        <div className="flex items-center justify-between">
          {/* Legend */}
          <div className="flex items-center gap-6">
            <div className="h-[18px] flex items-center gap-1.5 pr-1">
              <div className="w-3.5 h-3.5 relative border border-[#D6D6D6] bg-[#FAFAFA]">
                <div className="absolute left-px top-px w-1.5 h-1.5 bg-[#01DF22]" />
                <div className="absolute left-[7px] top-px w-1.5 h-1.5 bg-[#0055FF]" />
                <div className="absolute left-px top-[7px] w-1.5 h-1.5 bg-black" />
                <div className="absolute left-[7px] top-[7px] w-1.5 h-1.5 bg-white" />
              </div>
              <span className="text-xs text-[#707070] uppercase">Running</span>
            </div>
            <div className="h-[18px] flex items-center gap-1.5 pr-1">
              <div className="w-3.5 h-3.5 border border-[#D6D6D6] bg-[#FAFAFA]" />
              <span className="text-xs text-[#707070] uppercase">Paused</span>
            </div>
            <div className="h-[18px] flex items-center gap-1.5 pr-1">
              <div className="w-3.5 h-3.5 bg-[#FF4400]" />
              <span className="text-xs text-[#707070] uppercase">Killed</span>
            </div>
          </div>

        </div>

        {/* Dot matrix texture from design */}
        <div
          ref={containerRef}
          className="w-full relative"
          style={{ height: 42 }}
          onMouseMove={(e) => {
            const rect = containerRef.current.getBoundingClientRect()
            const x = e.clientX - rect.left
            const pct = x / rect.width

            const slot = pct * totalSlots
            let cumSlots = 0
            for (let i = 0; i < segments.length; i++) {
              cumSlots += segments[i].size
              if (slot < cumSlots) {
                setHoveredSegment(i)
                setTooltipPos({ x, segIdx: i })
                break
              }
            }
          }}
          onMouseLeave={() => setHoveredSegment(null)}
          onClick={() => {
            if (hoveredSegment !== null && onSegmentClick) {
              const seg = segments[hoveredSegment]
              onSegmentClick({
                type: seg.type,
                fromLabel: seg.fromLabel,
                toLabel: seg.toLabel,
                label: `${seg.type === 'PAUSED' ? 'Paused' : seg.type === 'RESUMED' ? 'Resumed' : 'Running'} sandbox (${seg.fromLabel} - ${seg.toLabel})`,
              })
            }
          }}
        >
          <img
            ref={imgRef}
            src="/timeline-texture.png"
            alt=""
            onLoad={() => setImgLoaded(true)}
            className="hidden"
          />
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            style={{ imageRendering: 'pixelated' }}
          />
          {/* Segment hover highlights */}
          {(() => {
            let cumSlots = 0
            return segments.map((seg, i) => {
              const leftPct = (cumSlots / totalSlots) * 100
              const widthPct = (seg.size / totalSlots) * 100
              cumSlots += seg.size
              return (
                <div
                  key={i}
                  className="absolute top-0 h-full pointer-events-none transition-opacity duration-200"
                  style={{
                    left: `${leftPct}%`,
                    width: `${widthPct}%`,
                    opacity: hoveredSegment === i ? 1 : 0,
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.15), rgba(0,0,0,0.05))',
                    border: hoveredSegment === i ? '1px solid #0A0A0A' : '1px solid transparent',
                  }}
                />
              )
            })
          })()}
          {/* Tooltip */}
          {hoveredSegment !== null && (() => {
            const seg = segments[hoveredSegment]
            let cumBefore = 0
            for (let i = 0; i < hoveredSegment; i++) cumBefore += segments[i].size
            const segCenterPct = ((cumBefore + seg.size / 2) / totalSlots) * 100
            const tooltipWidth = 357
            const containerWidth = containerRef.current?.getBoundingClientRect().width || 1000
            let leftPx = (segCenterPct / 100) * containerWidth - tooltipWidth / 2
            leftPx = Math.max(0, Math.min(leftPx, containerWidth - tooltipWidth))
            return (
              <div
                className="absolute z-30 bg-white border border-[#D6D6D6] pointer-events-none transition-all duration-200"
                style={{
                  width: tooltipWidth,
                  top: -210 - 16,
                  left: leftPx,
                  filter: 'drop-shadow(0px 2px 3px #00000026)',
                }}
              >
                {/* Header */}
                <div className="flex items-start gap-2.5 px-6 pt-3.5 pb-3">
                  {seg.type === 'PAUSED' ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="2.5" className="shrink-0 mt-0.5">
                      <rect x="6" y="4" width="4" height="16" />
                      <rect x="14" y="4" width="4" height="16" />
                    </svg>
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00A670" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  )}
                  <div className="flex flex-col gap-2">
                    <span className="text-sm leading-[17px]">
                      <span className="font-bold text-[#0A0A0A]">
                        <span className="uppercase">{seg.type === 'PAUSED' ? 'Paused' : seg.type === 'RESUMED' ? 'Resumed' : 'Running'}</span>
                        {` (${seg.duration})`}
                      </span>
                      {seg.trigger && <span className="text-[#707070]"> {seg.trigger}</span>}
                    </span>
                    <span className="font-mono text-sm text-[#707070] leading-5">
                      {seg.fromLabel} – {seg.toLabel}
                    </span>
                  </div>
                </div>
                {/* Metrics */}
                <div className="bg-[#FAFAFA] border-t border-[#D6D6D6] px-6 py-3 flex flex-col gap-2">
                  {[
                    { label: 'CPU', value: seg.cpu ? `${seg.cpu}%` : '0' },
                    { label: 'MEMORY', value: seg.memory ? `${seg.memory} GB` : '0' },
                    { label: 'DISK', value: seg.disk ? `${seg.disk}%` : '0' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-sm uppercase text-[#0A0A0A]">{label}</span>
                      <span className="text-sm text-[#707070]">{value}</span>
                    </div>
                  ))}
                </div>
                {/* Footer */}
                <div className="flex items-center gap-2 px-6 pt-0 pb-3 bg-[#FAFAFA] -mt-1">
                  <div className="opacity-60 relative shrink-0 w-3.5 h-3.5">
                    <svg viewBox="0 0 8.83 10" width="8.83" height="10" style={{ overflow: 'visible', rotate: '-33.67deg', position: 'absolute', left: '2px', top: '5px', transformOrigin: '0% 0%' }}>
                      <path d="M0 10C0 10 4.307 0 4.307 0C4.307 0 8.832 10 8.832 10C8.832 10 4.307 7.044 4.307 7.044C4.307 7.044 0 10 0 10Z" fill="none" stroke="#707070" strokeWidth="1.5" strokeLinejoin="bevel" vectorEffect="non-scaling-stroke" />
                    </svg>
                  </div>
                  <span className="font-mono text-xs text-[#707070] leading-5">click to highlight in logs</span>
                </div>
              </div>
            )
          })()}
        </div>

        {/* Timestamps: start + now */}
        <div className="flex items-center justify-between">
          <div
            className="relative flex items-center gap-1 group"
            onMouseEnter={() => setStartHovered(true)}
            onMouseLeave={() => setStartHovered(false)}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M9.654 8.167C9.574 8.167 9.524 8.253 9.564 8.322L10.397 9.765C10.443 9.845 10.370 9.940 10.281 9.916L7.754 9.239C7.644 9.210 7.530 9.275 7.501 9.386L6.824 11.912C6.800 12.001 6.680 12.017 6.634 11.937L5.801 10.494C5.761 10.425 5.662 10.425 5.622 10.494L4.789 11.937C4.743 12.017 4.623 12.001 4.599 11.912L3.922 9.386C3.893 9.275 3.779 9.210 3.669 9.239L1.143 9.916C1.054 9.940 0.980 9.845 1.026 9.765L1.859 8.322C1.899 8.253 1.849 8.167 1.770 8.167H0.104C0.011 8.167 -0.035 8.055 0.031 7.990L1.880 6.141C1.961 6.060 1.961 5.929 1.880 5.848L0.031 3.998C-0.035 3.933 0.011 3.822 0.104 3.822H1.769C1.849 3.822 1.899 3.736 1.859 3.667L1.026 2.224C0.980 2.144 1.054 2.049 1.143 2.072L3.669 2.749C3.779 2.779 3.893 2.714 3.922 2.603L4.599 0.077C4.623 -0.012 4.743 -0.028 4.789 0.052L5.622 1.495C5.662 1.564 5.761 1.564 5.801 1.495L6.634 0.052C6.680 -0.028 6.800 -0.012 6.824 0.077L7.501 2.603C7.530 2.714 7.644 2.779 7.754 2.749L10.281 2.072C10.370 2.049 10.443 2.144 10.397 2.224L9.564 3.667C9.524 3.736 9.574 3.822 9.654 3.822H11.320C11.412 3.822 11.458 3.933 11.393 3.998L9.543 5.848C9.462 5.929 9.462 6.060 9.543 6.141L11.393 7.990C11.458 8.055 11.412 8.167 11.320 8.167H9.654ZM9.018 4.201C9.093 4.126 9.020 4.001 8.918 4.028L6.668 4.631C6.558 4.660 6.444 4.595 6.415 4.485L5.812 2.234C5.784 2.131 5.639 2.131 5.612 2.234L5.009 4.485C4.979 4.595 4.866 4.660 4.755 4.631L2.505 4.028C2.403 4.001 2.331 4.126 2.406 4.201L4.052 5.848C4.133 5.929 4.133 6.060 4.052 6.141L2.405 7.788C2.330 7.863 2.403 7.988 2.505 7.961L4.755 7.358C4.866 7.328 4.979 7.394 5.009 7.504L5.612 9.755C5.639 9.857 5.784 9.857 5.812 9.755L6.415 7.504C6.444 7.394 6.558 7.328 6.668 7.358L8.918 7.961C9.020 7.988 9.093 7.863 9.018 7.788L7.371 6.141C7.290 6.060 7.290 5.929 7.371 5.848L9.018 4.201Z" fill="#00A670" />
            </svg>
            <span className="text-xs font-bold text-[#0A0A0A]">14:10</span>
            {startHovered && (
              <div
                className="absolute z-30 border border-[#D6D6D6] bg-white px-2 py-1 pointer-events-none whitespace-nowrap"
                style={{ bottom: '100%', left: 0, marginBottom: 6, filter: 'drop-shadow(0px 2px 3px #00000026)' }}
              >
                <span className="font-mono text-xs text-[#707070]">Sandbox created at <span className="text-[#0A0A0A]">14:10</span> (CET)</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {killed ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FF4400" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M15 9l-6 6M9 9l6 6" />
                </svg>
                <span className="text-xs font-bold text-[#FF4400]">{nowLabel}</span>
              </>
            ) : (
              <>
                <div className="w-4 h-4 relative flex items-center justify-center">
                  <div className={`absolute inset-0 rounded-full ${paused ? 'bg-[#E56F004D]' : 'bg-[#00A6704D]'}`} style={paused ? { animation: 'dot-breathe 3s ease-in-out infinite' } : {}} />
                  <div className={`w-[5px] h-[5px] rounded-full relative ${paused ? 'bg-[#E56F00]' : 'bg-[#00A670]'}`} />
                </div>
                <span className="text-xs"><span className="font-bold text-[#333333]">{nowLabel}</span> <span className="text-[#707070]">(now)</span></span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
