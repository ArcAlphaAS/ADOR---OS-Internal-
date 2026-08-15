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
