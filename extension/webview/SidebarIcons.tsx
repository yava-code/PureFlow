import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>{children}</svg>;
}

export function WorkspaceIcon(props: IconProps) {
  return <Icon {...props}><path d="M4 5h6l2 2h8v12H4z" /><path d="M4 9h16" /></Icon>;
}

export function MentorIcon(props: IconProps) {
  return <Icon {...props}><path d="M9 18h6M10 21h4" /><path d="M8 14c-1.2-1-2-2.6-2-4.5a6 6 0 0 1 12 0c0 1.9-.8 3.5-2 4.5-.8.7-1 1.2-1 2H9c0-.8-.2-1.3-1-2Z" /></Icon>;
}

export function FocusIcon(props: IconProps) {
  return <Icon {...props}><circle cx="12" cy="12" r="8" /><path d="m8.5 12 2.2 2.2 4.8-5" /></Icon>;
}

export function MonadIcon(props: IconProps) {
  return <Icon {...props}><path d="m12 3 7 4-7 4-7-4zM5 12l7 4 7-4M5 17l7 4 7-4" /></Icon>;
}

export function TerminalIcon(props: IconProps) {
  return <Icon {...props}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="m7 9 3 3-3 3M13 16h4" /></Icon>;
}

export function TestIcon(props: IconProps) {
  return <Icon {...props}><path d="M9 3v6l-4 8a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-4-8V3" /><path d="M8 13h8M8 3h8" /></Icon>;
}

export function BranchIcon(props: IconProps) {
  return <Icon {...props}><circle cx="6" cy="5" r="2" /><circle cx="18" cy="7" r="2" /><circle cx="6" cy="19" r="2" /><path d="M6 7v10M8 8c5 0 3-1 8-1" /></Icon>;
}

export function ExternalIcon(props: IconProps) {
  return <Icon {...props}><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 13v6H5V6h6" /></Icon>;
}

export function RefreshIcon(props: IconProps) {
  return <Icon {...props}><path d="M20 7v5h-5M4 17v-5h5" /><path d="M18.2 9A7 7 0 0 0 6 6.5L4 9M5.8 15A7 7 0 0 0 18 17.5l2-2.5" /></Icon>;
}

export function SearchIcon(props: IconProps) {
  return <Icon {...props}><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></Icon>;
}

export function BookIcon(props: IconProps) {
  return <Icon {...props}><path d="M4 5c3-1 5-.5 8 1v14c-3-1.5-5-2-8-1zM20 5c-3-1-5-.5-8 1v14c3-1.5 5-2 8-1z" /></Icon>;
}

export function ChevronIcon(props: IconProps) {
  return <Icon {...props}><path d="m8 10 4 4 4-4" /></Icon>;
}

export function CopyIcon(props: IconProps) {
  return <Icon {...props}><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M16 8V5H5v11h3" /></Icon>;
}

export function SparkIcon(props: IconProps) {
  return <Icon {...props}><path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5zM18 16l.7 2.3L21 19l-2.3.7L18 22l-.7-2.3L15 19l2.3-.7z" /></Icon>;
}
