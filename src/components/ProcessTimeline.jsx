import { useRef, useEffect, useCallback } from 'react'

const ROWS = 14
const CELL = 3

// Actual design colors from Paper
const GREEN = [1, 223, 34]     // #01DF22 — "aqua" named dots (bright green)
const BLUE  = [0, 85, 255]     // #0055FF — blue dots
const WHITE = [255, 255, 255]  // empty / paused

function seededRng(seed) {
  let s = seed
  return () => { s = (s * 16807 + 7) % 2147483647; return s / 2147483647 }
}

function fillColumn(grid, blinkPhase, blinkSpeed, col, rng) {
  for (let row = 0; row < ROWS; row++) {
    const idx = col * ROWS + row
    const r = rng()
    if (r < 0.42) {
      grid[idx] = 0 // aqua
    } else if (r < 0.75) {
      grid[idx] = 1 // blue
    }
    if (grid[idx] !== 2 && rng() < 0.20) {
      blinkPhase[idx] = rng() * Math.PI * 2
      blinkSpeed[idx] = 0.6 + rng() * 1.0
    }
  }
}

export default function ProcessTimeline() {
  const canvasRef = useRef(null)
  const stateRef = useRef(null)

  const init = useCallback((visibleCols) => {
    const rng = seededRng(42)

    const grid = new Uint8Array(visibleCols * ROWS).fill(2)
    const blinkPhase = new Float32Array(visibleCols * ROWS)
    const blinkSpeed = new Float32Array(visibleCols * ROWS)

    // Pre-fill the right ~75% (the "past" area already generated)
    const emptyLeft = Math.floor(visibleCols * 0.25)

    // Decide pause gaps within the filled zone
    const pausedCols = new Set()
    let pauseCount = 3 + Math.floor(rng() * 3)
    for (let p = 0; p < pauseCount; p++) {
      const start = emptyLeft + Math.floor(rng() * (visibleCols - emptyLeft) * 0.9)
      const w = 4 + Math.floor(rng() * 5)
      for (let c = start; c < start + w && c < visibleCols; c++) {
        pausedCols.add(c)
      }
    }

    // Fill from right side (column visibleCols-1 down to emptyLeft)
    for (let col = visibleCols - 1; col >= emptyLeft; col--) {
      if (pausedCols.has(col)) continue
      fillColumn(grid, blinkPhase, blinkSpeed, col, rng)
    }

    // Frontier zone: make leftmost filled columns sparser
    for (let col = emptyLeft; col < emptyLeft + 12 && col < visibleCols; col++) {
      if (pausedCols.has(col)) continue
      const sparsity = 1 - (col - emptyLeft) / 12
      for (let row = 0; row < ROWS; row++) {
        const idx = col * ROWS + row
        if (rng() < sparsity * 0.6) {
          grid[idx] = 2
        }
      }
    }

    return {
      grid,
      blinkPhase,
      blinkSpeed,
      rng,
      visibleCols,
      cursor: emptyLeft,     // frontier column, advancing leftward
      fillAccum: 0,
      paused: false,
      pauseTimer: 0,
      nextPauseAt: emptyLeft - 15 - Math.floor(rng() * 30),
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const container = canvas.parentElement
    const width = container.clientWidth
    const visibleCols = Math.ceil(width / CELL)

    canvas.width = visibleCols * CELL
    canvas.height = ROWS * CELL

    const ctx = canvas.getContext('2d')
    stateRef.current = init(visibleCols)

    let lastTime = null
    let rafId
    const PALETTE = [GREEN, BLUE, WHITE]

    const loop = (now) => {
      if (lastTime == null) lastTime = now
      const dt = (now - lastTime) / 1000
      lastTime = now

      const s = stateRef.current

      if (s.paused) {
        s.pauseTimer -= dt
        if (s.pauseTimer <= 0) {
          s.paused = false
          s.nextPauseAt = s.cursor - 15 - Math.floor(s.rng() * 40)
        }
      } else {
        // Fill ~1.5 cols/sec, growing leftward
        s.fillAccum += 1.5 * dt

        while (s.fillAccum >= 1 && s.cursor > 0) {
          s.fillAccum -= 1

          if (s.cursor <= s.nextPauseAt) {
            s.paused = true
            s.pauseTimer = 1.5 + s.rng() * 2
            const gapWidth = 3 + Math.floor(s.rng() * 4)
            s.cursor = Math.max(0, s.cursor - gapWidth)
            break
          }

          s.cursor--
          fillColumn(s.grid, s.blinkPhase, s.blinkSpeed, s.cursor, s.rng)

          // Sparse frontier: punch holes in the freshly filled edge
          if (s.cursor < s.visibleCols - 2) {
            for (let row = 0; row < ROWS; row++) {
              const nextIdx = (s.cursor + 1) * ROWS + row
              if (s.grid[nextIdx] !== 2 && s.rng() < 0.15) {
                s.grid[nextIdx] = 2
              }
            }
          }
        }

        // When fully filled, reset
        if (s.cursor <= 0) {
          const newState = init(s.visibleCols)
          Object.assign(s, newState)
        }
      }

      // Render
      const imgData = ctx.createImageData(s.visibleCols * CELL, ROWS * CELL)
      const data = imgData.data
      const timeSec = now / 1000

      // White background
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; data[i + 3] = 255
      }

      for (let col = 0; col < s.visibleCols; col++) {
        for (let row = 0; row < ROWS; row++) {
          const idx = col * ROWS + row
          const colorIdx = s.grid[idx]
          if (colorIdx === 2) continue

          let [r, g, b] = PALETTE[colorIdx]

          if (s.blinkSpeed[idx] > 0) {
            const blink = 0.85 + 0.15 * Math.sin(timeSec * s.blinkSpeed[idx] + s.blinkPhase[idx])
            r = Math.round(r * blink)
            g = Math.round(g * blink)
            b = Math.round(b * blink)
          }

          for (let dy = 0; dy < CELL; dy++) {
            for (let dx = 0; dx < CELL; dx++) {
              const px = col * CELL + dx
              const py = row * CELL + dy
              const pi = (py * s.visibleCols * CELL + px) * 4
              data[pi] = r
              data[pi + 1] = g
              data[pi + 2] = b
            }
          }
        }
      }

      ctx.putImageData(imgData, 0, 0)
      rafId = requestAnimationFrame(loop)
    }

    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  }, [init])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-[42px]"
      style={{ imageRendering: 'pixelated' }}
    />
  )
}
