function SidebarIcon({ children, active }) {
  return (
    <div className={`w-10 h-10 flex items-center justify-center ${active ? 'bg-[#F5F5F5]' : ''}`}>
      {children}
    </div>
  )
}

function EnterIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M12.75 5.75L17 10L12.75 14.25" stroke="#707070" strokeWidth="2" strokeLinecap="square" />
      <line x1="21" y1="5" x2="21" y2="19" stroke="#707070" strokeWidth="2" strokeLinecap="square" />
      <line x1="3" y1="12" x2="16" y2="12" stroke="#707070" strokeWidth="2" strokeLinecap="square" />
    </svg>
  )
}

function CubeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 18.5V10M10 10L2.5 5.78M10 10L17.5 5.78M10 1L2 5.5V14.5L10 19L18 14.5V5.5L10 1Z" stroke="#E56F00" strokeWidth="2" strokeLinecap="square" />
    </svg>
  )
}

function GridIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="2" width="6" height="6" stroke="#0A0A0A" strokeWidth="2" strokeLinecap="round" />
      <rect x="2" y="12" width="6" height="6" stroke="#0A0A0A" strokeWidth="2" strokeLinecap="round" />
      <rect x="12" y="2" width="6" height="6" stroke="#0A0A0A" strokeWidth="2" strokeLinecap="round" />
      <circle cx="15" cy="15" r="3" stroke="#0A0A0A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function GearIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M7.3 3.7L4.375 3.025L3.025 4.375L3.7 7.3L1 9.1V10.9L3.7 12.7L3.025 15.625L4.375 16.975L7.3 16.3L9.1 19H10.9L12.7 16.3L15.625 16.975L16.975 15.625L16.3 12.7L19 10.9V9.1L16.3 7.3L16.975 4.375L15.625 3.025L12.7 3.7L10.9 1H9.1L7.3 3.7Z" stroke="#0A0A0A" strokeWidth="2" />
      <circle cx="10" cy="10" r="3" stroke="#0A0A0A" strokeWidth="2" />
    </svg>
  )
}

function KeyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M13.5 12C16.538 12 19 9.538 19 6.5C19 3.462 16.538 1 13.5 1C10.462 1 8 3.462 8 6.5C8 6.961 8.057 7.409 8.164 7.836L2 14V18H6L8 16V13.5H10.5L12.164 11.836C12.591 11.943 13.039 12 13.5 12Z" stroke="#0A0A0A" strokeWidth="2" strokeLinecap="square" />
      <circle cx="15" cy="5" r="0.5" stroke="#0A0A0A" strokeWidth="2" strokeLinecap="square" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 22 19" fill="none">
      <path d="M14 0C15.933 0 17.5 1.567 17.5 3.5C17.5 5.433 15.933 7 14 7M19.5 17H22C22 14.062 19.932 11.547 17 10.509M8 7C6.067 7 4.5 5.433 4.5 3.5C4.5 1.567 6.067 0 8 0C9.933 0 11.5 1.567 11.5 3.5C11.5 5.433 9.933 7 8 7ZM0 17C0 13.134 3.582 10 8 10C12.418 10 16 13.134 16 17H0Z" stroke="#0A0A0A" strokeWidth="2" strokeLinecap="square" />
    </svg>
  )
}

function BarChartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 16" fill="none">
      <path d="M1 14V16M7 10V16M13 6V16M19 2V16" stroke="#0A0A0A" strokeWidth="2" strokeLinecap="square" />
    </svg>
  )
}

function GaugeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 17" fill="none">
      <path d="M10 10L7 7M3.291 17C0.125 13.466 0.24 8.032 3.636 4.636C7.151 1.121 12.849 1.121 16.364 4.636C19.76 8.032 19.875 13.466 16.708 17" stroke="#0A0A0A" strokeWidth="2" strokeLinecap="square" />
    </svg>
  )
}

function TerminalIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 16" fill="none">
      <path d="M1 7V15H19V7M1 7V1H19V7M1 7H19" stroke="#0A0A0A" strokeWidth="2" strokeLinecap="square" />
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 18 19" fill="none">
      <path d="M11.26 18.32V14.86C11.38 13.77 11.07 12.68 10.39 11.83C12.99 11.83 15.59 10.09 15.59 7.06C15.66 5.98 15.36 4.92 14.72 4.03C14.97 3.04 14.97 2 14.72 1C14.72 1 13.86 1 12.13 2.3C11.84 1.87 9.48 1.87 7.2 2.3C5.47 1 4.6 1 4.6 1C4.34 2 4.34 3.04 4.6 4.03C3.97 4.91 3.66 5.98 3.73 7.06C3.73 10.09 6.33 11.83 8.93 11.83C8.59 12.25 8.34 12.74 8.19 13.26C8.05 13.78 8 14.32 8.06 14.86V18.32M8.06 14.86C4.16 16.59 3.73 13.13 2 13.13" stroke="#0A0A0A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function DocsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="6" y="1" width="12" height="15" rx="1" stroke="#0A0A0A" strokeWidth="2" strokeLinecap="square" />
      <path d="M2 5V19H14" stroke="#0A0A0A" strokeWidth="2" strokeLinecap="square" />
      <path d="M9 6H15M9 10H15" stroke="#0A0A0A" strokeWidth="2" strokeLinecap="square" />
    </svg>
  )
}

export default function Sidebar() {
  return (
    <aside className="w-[52px] h-full border-r border-[#D6D6D6] grid grid-cols-1 grid-rows-[auto_auto] shrink-0" style={{ gap: 0 }}>
      {/* Top: main nav */}
      <div className="flex flex-col items-center gap-px">
        {/* Enter + avatar */}
        <div className="self-stretch flex flex-col items-start p-1.5 overflow-clip shadow-[#D6D6D6_0px_0px_0px_1px]">
          <SidebarIcon><EnterIcon /></SidebarIcon>
          <SidebarIcon>
            <div className="w-7 h-7 border border-[#C2C2C2] bg-[#FAFAFA] flex items-center justify-center text-sm text-[#707070] font-sans">M</div>
          </SidebarIcon>
        </div>
        {/* Sandbox + dashboard */}
        <div className="self-stretch flex flex-col items-start p-1.5 overflow-clip shadow-[#D6D6D6_0px_0px_0px_1px]">
          <SidebarIcon active><CubeIcon /></SidebarIcon>
          <SidebarIcon><GridIcon /></SidebarIcon>
        </div>
        {/* Settings + keys + users */}
        <div className="self-stretch flex flex-col items-start p-1.5 overflow-clip shadow-[#D6D6D6_0px_0px_0px_1px]">
          <SidebarIcon><GearIcon /></SidebarIcon>
          <SidebarIcon><KeyIcon /></SidebarIcon>
          <SidebarIcon><UsersIcon /></SidebarIcon>
        </div>
        {/* Analytics + monitoring + terminal */}
        <div className="self-stretch flex flex-col items-start p-1.5 overflow-clip shadow-[#D6D6D6_0px_0px_0px_1px]">
          <SidebarIcon><BarChartIcon /></SidebarIcon>
          <SidebarIcon><GaugeIcon /></SidebarIcon>
          <SidebarIcon><TerminalIcon /></SidebarIcon>
        </div>
      </div>
      {/* Bottom: external + dots */}
      <div className="flex flex-col items-center justify-end gap-px">
        <div className="self-stretch flex flex-col items-center justify-center p-1.5 overflow-clip shadow-[#D6D6D6_0px_0px_0px_1px]">
          <SidebarIcon><GitHubIcon /></SidebarIcon>
          <SidebarIcon><DocsIcon /></SidebarIcon>
        </div>
        <div className="self-stretch flex flex-col items-center justify-center p-1.5 overflow-clip shadow-[#D6D6D6_0px_0px_0px_1px]">
          <SidebarIcon>
            <svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill="#333" /></svg>
          </SidebarIcon>
          <SidebarIcon>
            <svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill="#333" /></svg>
          </SidebarIcon>
        </div>
      </div>
    </aside>
  )
}
