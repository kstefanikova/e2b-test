import { useState, useCallback } from 'react'
import { Octagon, Pause, Play, LinkIcon, Copy } from './Icons'

function Check({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

const SANDBOX_ID = 'amn_fin2ncRn83d7b5'

export default function Header({ paused, killed, onTogglePause, onKill, onRestore }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(SANDBOX_ID)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [])

  return (
    <div className="flex items-center justify-between px-6 h-[93px] shrink-0">
      <div className="flex items-center gap-2.5">
        <span className="text-xl text-black tracking-tight">
          <span className="font-bold">SANDBOX / </span>{SANDBOX_ID}
        </span>
        <button onClick={handleCopy} className={`${copied ? 'text-[#00A670]' : 'text-[#707070] hover:text-[#333]'} transition-colors`}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
        {killed ? (
          <>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#FF440029] text-[#FF4400] text-xs uppercase font-normal">
              <span className="w-[5px] h-[5px] rounded-full bg-[#FF4400]" />
              killed
            </span>
            <span className="inline-flex items-center px-1 py-0.5 bg-[#EBEBEB] text-[#333] text-xs uppercase">Archive</span>
          </>
        ) : paused ? (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#E56F0029] text-[#E56F00] text-xs uppercase font-normal">
            <span className="w-[5px] h-[5px] rounded-full bg-[#E56F00]" />
            paused
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#00A67029] text-[#00A670] text-xs uppercase font-normal">
            <span className="w-[5px] h-[5px] rounded-full bg-[#00A670]" />
            running
          </span>
        )}
      </div>
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2">
          {killed ? (
            <button onClick={onRestore} className="h-9 flex items-center gap-1 px-4 border border-[#D6D6D6] text-sm font-medium text-[#0A0A0A] hover:bg-[#F5F5F5]">
              Restore sandbox
            </button>
          ) : (
            <button onClick={onKill} className="h-9 flex items-center gap-1 px-4 border border-[#D6D6D6] text-sm font-medium text-[#0A0A0A] hover:bg-[#F5F5F5]">
              <Octagon size={16} />
              Kill sandbox
            </button>
          )}
          <button
            onClick={killed ? undefined : onTogglePause}
            className={`h-9 flex items-center gap-1 px-4 border text-sm font-medium ${killed ? 'border-[#D6D6D6] text-[#D6D6D6] cursor-default' : paused ? 'border-[#E56F00] text-[#E56F00] hover:bg-[#E56F0010]' : 'border-[#D6D6D6] text-[#0A0A0A] hover:bg-[#F5F5F5]'}`}
          >
            {paused ? <Play size={16} /> : <Pause size={16} />}
            {paused ? 'Resume' : 'Pause'}
          </button>
        </div>
        <button className="size-9 flex items-center justify-center bg-[#0A0A0A] text-white hover:bg-[#333]">
          <LinkIcon size={16} />
        </button>
      </div>
    </div>
  )
}
