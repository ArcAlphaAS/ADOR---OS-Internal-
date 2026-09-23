const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export function HomeIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size ?? 20} height={props.size ?? 20} {...base} className={props.className} style={props.style}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1v-9" />
    </svg>
  )
}

export function LayersIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size ?? 20} height={props.size ?? 20} {...base} className={props.className} style={props.style}>
      <path d="M12 3 3 8l9 5 9-5-9-5Z" />
      <path d="M3 13l9 5 9-5" />
      <path d="M3 17.5l9 5 9-5" />
    </svg>
  )
}

export function TargetIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size ?? 20} height={props.size ?? 20} {...base} className={props.className} style={props.style}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="0.6" fill="currentColor" />
    </svg>
  )
}

export function CalendarIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size ?? 20} height={props.size ?? 20} {...base} className={props.className} style={props.style}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3v4M16 3v4" />
    </svg>
  )
}

export function BriefcaseIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size ?? 20} height={props.size ?? 20} {...base} className={props.className} style={props.style}>
      <rect x="3" y="7.5" width="18" height="12" rx="2.2" />
      <path d="M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5" />
      <path d="M3 12.5h18" />
    </svg>
  )
}

export function BookIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size ?? 20} height={props.size ?? 20} {...base} className={props.className} style={props.style}>
      <path d="M4 4.8A2.3 2.3 0 0 1 6.3 3H12v18H6.3A2.3 2.3 0 0 0 4 23.3V4.8Z" transform="translate(0 -0.5)" />
      <path d="M20 4.8A2.3 2.3 0 0 0 17.7 3H12v18h5.7a2.3 2.3 0 0 1 2.3 2.3V4.8Z" transform="translate(0 -0.5)" />
    </svg>
  )
}

// Flat, line-style folder-with-documents — same visual idea as a reference
// image the user shared (a glossy 3D folder with pages peeking out), redrawn
// in ADOR's own thin-stroke icon language instead of copying the glossy
// macOS-style rendering, which would clash with every other icon in the app.
export function FolderIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size ?? 20} height={props.size ?? 20} {...base} className={props.className} style={props.style}>
      <path d="M9 4h3l1.6 2.2H18a1 1 0 0 1 1 1V9" />
      <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7H12l1.8 2.2H19a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5H5.5A1.5 1.5 0 0 1 4 17.7V8.5Z" />
    </svg>
  )
}

export function UsersIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size ?? 20} height={props.size ?? 20} {...base} className={props.className} style={props.style}>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M2.8 20c.6-3.4 3.2-5.5 6.2-5.5s5.6 2.1 6.2 5.5" />
      <path d="M15.8 5.6a3.2 3.2 0 0 1 0 6.2" />
      <path d="M16.2 14.7c2.5.4 4.5 2.3 5 5.3" />
    </svg>
  )
}

export function MessageIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size ?? 20} height={props.size ?? 20} {...base} className={props.className} style={props.style}>
      <path d="M4 5.5h16v11.5H9.5L5 21v-4H4V5.5Z" />
    </svg>
  )
}

export function GlobeIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size ?? 20} height={props.size ?? 20} {...base} className={props.className} style={props.style}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17" />
      <path d="M12 3.5c2.4 2.3 3.7 5.3 3.7 8.5s-1.3 6.2-3.7 8.5c-2.4-2.3-3.7-5.3-3.7-8.5S9.6 5.8 12 3.5Z" />
    </svg>
  )
}

export function ContactsIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size ?? 20} height={props.size ?? 20} {...base} className={props.className} style={props.style}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <circle cx="12" cy="10" r="2.4" />
      <path d="M8.3 16.5c.6-1.7 2-2.6 3.7-2.6s3.1.9 3.7 2.6" />
      <path d="M5 8h-1.5M5 12h-1.5M5 16h-1.5" />
    </svg>
  )
}

export function SparkleIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size ?? 20} height={props.size ?? 20} {...base} className={props.className} style={props.style}>
      <path d="M12 3.5c.6 3.4 1.6 5 5.5 5.5-3.9.5-4.9 2.1-5.5 5.5-.6-3.4-1.6-5-5.5-5.5 3.9-.5 4.9-2.1 5.5-5.5Z" />
      <path d="M18.5 15.5c.3 1.7.8 2.5 2.5 2.8-1.7.3-2.2 1.1-2.5 2.8-.3-1.7-.8-2.5-2.5-2.8 1.7-.3 2.2-1.1 2.5-2.8Z" />
    </svg>
  )
}

export function BellIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size ?? 20} height={props.size ?? 20} {...base} className={props.className} style={props.style}>
      <path d="M6 10.5a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 14.5 6 10.5Z" />
      <path d="M10.3 19a1.8 1.8 0 0 0 3.4 0" />
    </svg>
  )
}

export function ChevronDownIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size ?? 16} height={props.size ?? 16} {...base} className={props.className} style={props.style}>
      <path d="M5.5 8.5 12 15l6.5-6.5" />
    </svg>
  )
}

export function SearchIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size ?? 16} height={props.size ?? 16} {...base} className={props.className} style={props.style}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M20 20l-4.5-4.5" />
    </svg>
  )
}

export function CheckCircleIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size ?? 20} height={props.size ?? 20} {...base} className={props.className} style={props.style}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 12.3l2.4 2.4 4.6-5.2" />
    </svg>
  )
}

export function CloseIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size ?? 16} height={props.size ?? 16} {...base} className={props.className} style={props.style}>
      <path d="M5 5l14 14M19 5 5 19" />
    </svg>
  )
}

export function KanbanIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size ?? 18} height={props.size ?? 18} {...base} className={props.className} style={props.style}>
      <rect x="3.5" y="4" width="5" height="16" rx="1.5" />
      <rect x="9.5" y="4" width="5" height="10" rx="1.5" />
      <rect x="15.5" y="4" width="5" height="13" rx="1.5" />
    </svg>
  )
}

export function TimelineIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size ?? 18} height={props.size ?? 18} {...base} className={props.className} style={props.style}>
      <rect x="3" y="4.5" width="9" height="4" rx="2" />
      <rect x="7.5" y="10.5" width="13.5" height="4" rx="2" />
      <rect x="3" y="16.5" width="7" height="4" rx="2" />
    </svg>
  )
}

export function ListViewIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size ?? 18} height={props.size ?? 18} {...base} className={props.className} style={props.style}>
      <path d="M4 6.5h16M4 12h16M4 17.5h16" />
    </svg>
  )
}

export function EditIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size ?? 16} height={props.size ?? 16} {...base} className={props.className} style={props.style}>
      <path d="M4 20h4L18.5 9.5a2 2 0 0 0-4-4L4 16v4Z" />
      <path d="M14 6l4 4" />
    </svg>
  )
}

export function UploadIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size ?? 18} height={props.size ?? 18} {...base} className={props.className} style={props.style}>
      <path d="M12 15V4M8 8l4-4 4 4" />
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </svg>
  )
}

export function FileIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size ?? 18} height={props.size ?? 18} {...base} className={props.className} style={props.style}>
      <path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v4h4" />
    </svg>
  )
}

export function DownloadIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size ?? 16} height={props.size ?? 16} {...base} className={props.className} style={props.style}>
      <path d="M12 4v11M8 11l4 4 4-4" />
      <path d="M4 19h16" />
    </svg>
  )
}

export function ArrowRightIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size ?? 16} height={props.size ?? 16} {...base} className={props.className} style={props.style}>
      <path d="M4 12h16M13 5l7 7-7 7" />
    </svg>
  )
}

export function ArrowLeftIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size ?? 16} height={props.size ?? 16} {...base} className={props.className} style={props.style}>
      <path d="M20 12H4M11 5l-7 7 7 7" />
    </svg>
  )
}

export function WalletIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size ?? 20} height={props.size ?? 20} {...base} className={props.className} style={props.style}>
      <path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h12a2.5 2.5 0 0 1 2.5 2.5v9A2.5 2.5 0 0 1 18 19H6a2.5 2.5 0 0 1-2.5-2.5v-9Z" />
      <path d="M14.5 12.5h4.5v3h-4.5a1.5 1.5 0 0 1 0-3Z" />
    </svg>
  )
}

export function PlusIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size ?? 20} height={props.size ?? 20} {...base} className={props.className} style={props.style}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function NoteIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size ?? 20} height={props.size ?? 20} {...base} className={props.className} style={props.style}>
      <path d="M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M15 3v5h5" />
      <path d="M8 12.5h8M8 16.5h5" />
    </svg>
  )
}

export function FlagIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size ?? 16} height={props.size ?? 16} {...base} className={props.className} style={props.style}>
      <path d="M6 3v18" />
      <path d="M6 4.5h11l-2.8 3.5 2.8 3.5H6Z" />
    </svg>
  )
}

export function ChevronRightIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size ?? 16} height={props.size ?? 16} {...base} className={props.className} style={props.style}>
      <path d="M9 5.5 15.5 12 9 18.5" />
    </svg>
  )
}

export function PlayIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size ?? 16} height={props.size ?? 16} fill="currentColor" stroke="none" className={props.className} style={props.style}>
      <path d="M7.5 5.2c0-.9 1-1.5 1.8-1L18 10.1c.8.5.8 1.7 0 2.2l-8.7 5.9c-.8.5-1.8-.1-1.8-1V5.2Z" />
    </svg>
  )
}

export function GiftIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size ?? 20} height={props.size ?? 20} {...base} className={props.className} style={props.style}>
      <rect x="3.5" y="10" width="17" height="10.5" rx="1.8" />
      <path d="M3.5 14.5h17" />
      <path d="M12 10v10.5" />
      <path d="M12 10c-1.6 0-3-1.05-3-3.1S9.9 4 11.3 4c1.4 0 1.9 1.6 0.7 3.2C10.8 8.8 9.4 10 8 10" />
      <path d="M12 10c1.6 0 3-1.05 3-3.1S14.1 4 12.7 4c-1.4 0-1.9 1.6-0.7 3.2C13.2 8.8 14.6 10 16 10" />
    </svg>
  )
}

export function MailIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size ?? 20} height={props.size ?? 20} {...base} className={props.className} style={props.style}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3.5 6.5 12 13l8.5-6.5" />
    </svg>
  )
}

export function PinIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size ?? 20} height={props.size ?? 20} {...base} className={props.className} style={props.style}>
      <path d="M12 21.5S4.5 14.6 4.5 9.7a7.5 7.5 0 1 1 15 0c0 4.9-7.5 11.8-7.5 11.8Z" />
      <circle cx="12" cy="9.5" r="2.6" />
    </svg>
  )
}

export function ClockIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size ?? 20} height={props.size ?? 20} {...base} className={props.className} style={props.style}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  )
}

export function MoreIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size ?? 20} height={props.size ?? 20} fill="currentColor" className={props.className} style={props.style}>
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </svg>
  )
}

export function FilterIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size ?? 20} height={props.size ?? 20} {...base} className={props.className} style={props.style}>
      <path d="M4 6h16" />
      <path d="M7.5 12h9" />
      <path d="M10.5 18h3" />
    </svg>
  )
}

export function GridIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size ?? 20} height={props.size ?? 20} {...base} className={props.className} style={props.style}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.4" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.4" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.4" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.4" />
    </svg>
  )
}

export function TrendUpIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size ?? 20} height={props.size ?? 20} {...base} className={props.className} style={props.style}>
      <path d="M3.5 17 10 10.5l4 4 6.5-6.5" />
      <path d="M15 8h5.5v5.5" />
    </svg>
  )
}

export function AlertIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size ?? 20} height={props.size ?? 20} {...base} className={props.className} style={props.style}>
      <path d="M12 3.5 21.5 20h-19L12 3.5Z" />
      <path d="M12 9.5v4.5" />
      <circle cx="12" cy="16.8" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function PhoneIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size ?? 20} height={props.size ?? 20} {...base} className={props.className} style={props.style}>
      <path d="M5 4h3.5l1.8 4.5-2.3 1.4a11 11 0 0 0 6.1 6.1l1.4-2.3L20 15.5V19a1.5 1.5 0 0 1-1.6 1.5A16.5 16.5 0 0 1 3.5 5.6 1.5 1.5 0 0 1 5 4Z" />
    </svg>
  )
}

export function VideoIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size ?? 20} height={props.size ?? 20} {...base} className={props.className} style={props.style}>
      <rect x="3" y="6.5" width="12.5" height="11" rx="2" />
      <path d="m15.5 10.5 5-3v9l-5-3" />
    </svg>
  )
}

export function LockIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size ?? 20} height={props.size ?? 20} {...base} className={props.className} style={props.style}>
      <rect x="5" y="10.5" width="14" height="10" rx="2" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </svg>
  )
}

export function InfoIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size ?? 20} height={props.size ?? 20} {...base} className={props.className} style={props.style}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5" />
      <circle cx="12" cy="7.8" r="0.6" fill="currentColor" />
    </svg>
  )
}

export function PaperclipIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size ?? 20} height={props.size ?? 20} {...base} className={props.className} style={props.style}>
      <path d="m20 11.5-7.8 7.8a5 5 0 0 1-7.1-7.1l8.2-8.2a3.3 3.3 0 0 1 4.7 4.7l-8.2 8.2a1.7 1.7 0 0 1-2.4-2.4l7.5-7.5" />
    </svg>
  )
}

export function ImageIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size ?? 20} height={props.size ?? 20} {...base} className={props.className} style={props.style}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="m20.5 16-4.5-4.5L6 19.5" />
    </svg>
  )
}

export function SmileIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size ?? 20} height={props.size ?? 20} {...base} className={props.className} style={props.style}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 14c.9 1.3 2.1 2 3.5 2s2.6-.7 3.5-2" />
      <circle cx="9.2" cy="9.8" r="0.6" fill="currentColor" />
      <circle cx="14.8" cy="9.8" r="0.6" fill="currentColor" />
    </svg>
  )
}

export function MicIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size ?? 20} height={props.size ?? 20} {...base} className={props.className} style={props.style}>
      <rect x="9" y="3.5" width="6" height="11" rx="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" />
      <path d="M12 18v2.5" />
    </svg>
  )
}

export function BookmarkIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size ?? 20} height={props.size ?? 20} {...base} className={props.className} style={props.style}>
      <path d="M6.5 4h11v16.5L12 16.5l-5.5 4V4Z" fill={props.filled ? 'currentColor' : 'none'} />
    </svg>
  )
}

export function AtIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size ?? 20} height={props.size ?? 20} {...base} className={props.className} style={props.style}>
      <circle cx="12" cy="12" r="3.6" />
      <path d="M15.6 12v1.4a2.6 2.6 0 0 0 5.2 0V12a8.8 8.8 0 1 0-3.5 7" />
    </svg>
  )
}

export function InboxIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size ?? 20} height={props.size ?? 20} {...base} className={props.className} style={props.style}>
      <path d="M4 13.5 6.5 5h11l2.5 8.5V19H4v-5.5Z" />
      <path d="M4 13.5h4.5l1 2h5l1-2H20" />
    </svg>
  )
}

export function PauseIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size ?? 20} height={props.size ?? 20} {...base} className={props.className} style={props.style}>
      <path d="M9 6v12M15 6v12" />
    </svg>
  )
}

// Responder citando (WhatsApp-style curved arrow back).
export function ReplyIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size ?? 16} height={props.size ?? 16} {...base} className={props.className} style={props.style}>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </svg>
  )
}

// Reenviar (arrow out, mirror of Reply).
export function ForwardIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size ?? 16} height={props.size ?? 16} {...base} className={props.className} style={props.style}>
      <path d="m15 14 5-5-5-5" />
      <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
    </svg>
  )
}

// Encuesta (horizontal result bars).
export function PollIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size ?? 16} height={props.size ?? 16} {...base} className={props.className} style={props.style}>
      <path d="M4 6h11M4 12h16M4 18h7" />
    </svg>
  )
}
