import { useState, useEffect } from 'react'

function MemoryIcon() {
  return (
    <div className="size-8 overflow-clip relative shrink-0">
      <svg viewBox="0 0 26.67 18.67" preserveAspectRatio="none" width="26.67" height="18.67" overflow="visible" style={{ width: '83.33%', height: '58.33%', left: '8.33%', top: '20.83%', position: 'absolute' }}>
        <path d="M5.333 18.667V14.667M10.667 18.667V14.667M16 18.667V14.667M21.333 18.667V14.667M8 8V5.333M18.667 8V5.333M13.333 8V5.333M0 13.333H26.667M0 2.667C0 1.959 0.281 1.281 0.781 0.781C1.281 0.281 1.959 0 2.667 0H24C24.707 0 25.386 0.281 25.886 0.781C26.386 1.281 26.667 1.959 26.667 2.667V4.133C26.114 4.296 25.63 4.633 25.285 5.094C24.94 5.555 24.754 6.116 24.754 6.691C24.754 7.267 24.94 7.827 25.285 8.289C25.63 8.75 26.114 9.087 26.667 9.249V16C26.667 16.707 26.386 17.385 25.886 17.886C25.386 18.386 24.707 18.667 24 18.667H2.667C1.959 18.667 1.281 18.386 0.781 17.886C0.281 17.385 0 16.707 0 16V9.2C0.552 9.037 1.037 8.7 1.382 8.239C1.727 7.778 1.913 7.218 1.913 6.642C1.913 6.066 1.727 5.506 1.382 5.045C1.037 4.584 0.552 4.247 0 4.084V2.667Z" fill="none" stroke="#333" strokeWidth="2.667" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  )
}

function RamIcon() {
  return (
    <div className="size-8 overflow-clip relative shrink-0">
      <svg viewBox="0 0 24 24.01" width="24" height="24.01" overflow="visible" style={{ width: '75%', height: '75%', left: '9.375%', top: '12.5%', position: 'absolute' }}>
        <path d="M12 2.668V0M17.333 2.672V0.005M6.667 2.672V0M12 24.005V21.338M17.333 24.005V21.339M6.667 24.004V21.338M21.333 17.339H24M21.333 6.671H24M21.333 12.005H24M0 12.005H2.667M0 17.339H2.667M0 6.671H2.667M16.002 12.005C16.002 14.215 14.21 16.007 12 16.007C9.79 16.007 7.998 14.215 7.998 12.005C7.998 9.795 9.79 8.004 12 8.004C14.21 8.004 16.002 9.795 16.002 12.005ZM2.667 2.672H21.333V21.338H2.667V2.672Z" fill="none" stroke="#333" strokeWidth="2.667" strokeLinecap="square" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  )
}

function DiskIcon() {
  return (
    <div className="size-8 overflow-clip relative shrink-0">
      <svg viewBox="0 0 18.67 18.67" width="18.67" height="18.67" overflow="visible" style={{ width: '58.33%', height: '58.33%', left: '20.83%', top: '20.83%', position: 'absolute' }}>
        <path d="M0 6.667V18.667H18.667V4.667L15.333 0H0V6.667Z" fill="none" stroke="#333" strokeWidth="2.667" strokeLinecap="square" vectorEffect="non-scaling-stroke" />
      </svg>
      <svg viewBox="0 0 5.33 8" preserveAspectRatio="none" width="5.33" height="8" overflow="visible" style={{ width: '16.67%', height: '25%', left: '62.5%', top: '25%', rotate: '90deg', position: 'absolute', transformOrigin: '0% 0%' }}>
        <path d="M0 2.857V8H5.333V2.857V0H0V2.857Z" fill="none" stroke="#333" strokeWidth="2.667" strokeLinecap="square" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  )
}

function TemplateIcon() {
  return (
    <div className="size-8 overflow-clip relative shrink-0">
      <svg viewBox="0 0 8 8" width="8" height="8" overflow="visible" style={{ width: '25%', height: '25%', left: '16.67%', top: '16.67%', position: 'absolute', overflow: 'visible' }}>
        <rect x="0" y="0" width="8" height="8" fill="none" stroke="#333" strokeWidth="2.667" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <svg viewBox="0 0 8 8" width="8" height="8" overflow="visible" style={{ width: '25%', height: '25%', left: '16.67%', top: '58.33%', position: 'absolute', overflow: 'visible' }}>
        <rect x="0" y="0" width="8" height="8" fill="none" stroke="#333" strokeWidth="2.667" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <svg viewBox="0 0 8 8" width="8" height="8" overflow="visible" style={{ width: '25%', height: '25%', left: '58.33%', top: '16.67%', position: 'absolute', overflow: 'visible' }}>
        <rect x="0" y="0" width="8" height="8" fill="none" stroke="#333" strokeWidth="2.667" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <svg viewBox="0 0 8 8" width="8" height="8" overflow="visible" style={{ width: '25%', height: '25%', left: '58.33%', top: '58.33%', position: 'absolute', overflow: 'visible' }}>
        <circle cx="4" cy="4" r="4" fill="none" stroke="#333" strokeWidth="2.667" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  )
}

const metadata = [
  { icon: MemoryIcon, label: 'CPU', value: '2 vCPU' },
  { icon: RamIcon, label: 'MEMORY', value: '512 MB' },
  { icon: DiskIcon, label: 'DISK', value: '5 GB' },
  { icon: TemplateIcon, label: 'TEMPLATE', value: 'python-data-science v1.5', wide: true },
]

export default function MetadataBar({ paused, killed }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const startElapsed = 26 * 3600 + 15 * 60 + 33
    setElapsed(startElapsed)
  }, [])

  useEffect(() => {
    if (paused || killed) return
    const interval = setInterval(() => {
      setElapsed(prev => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [paused, killed])

  const h = Math.floor(elapsed / 3600)
  const m = Math.floor((elapsed % 3600) / 60)
  const s = elapsed % 60

  return (
    <div className="flex items-center justify-between px-6 h-[88px]">
      <div className="flex items-center gap-16">
        {metadata.map((item) => (
          <div key={item.label} className="flex items-center gap-5">
            <item.icon />
            <div className={`text-sm leading-[18px] ${item.wide ? 'whitespace-pre' : 'w-20 whitespace-pre-wrap'}`}>
              <span className="text-[#707070] uppercase">{item.label}</span>
              {'\n'}
              <span className="font-bold text-[#0A0A0A]">{item.value}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-end gap-8 text-sm leading-[18px]">
        <span className="text-[#707070]">{'>_Started: '}<span className="text-[#0A0A0A]">14:10</span> [CET]</span>
        <span className="text-[#707070] whitespace-pre">{killed ? 'Lasted: ' : 'Runtime: '}<span className="font-bold text-[#0A0A0A]">{`${h} h  ${String(m).padStart(2, '0')} m  ${String(s).padStart(2, '0')} s`}</span></span>
      </div>
    </div>
  )
}
