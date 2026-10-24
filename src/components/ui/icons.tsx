/**
 * @fileoverview Inline stroke icons for client components.
 *
 * @project Skyline Luxury Residences
 * @type {FrontendEngineeringTask}
 * @framework Next.js (App Router) + TypeScript
 *
 * @description
 * A small icon set with the same 24px grid as lucide, kept local so client
 * bundles do not ship the icon library.
 *
 * @scope
 * - Shared client-side iconography.
 *
 * Do not refactor unrelated routes or APIs.
 *
 * @module ui/icons
 */
import type { ReactNode, SVGProps } from "react";

type IconProps = Omit<SVGProps<SVGSVGElement>, "children"> & { size?: number };

function Icon({ size = 24, children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export function ArrowDown(props: IconProps) {
  return <Icon {...props}><path d="M12 5v14" /><path d="m19 12-7 7-7-7" /></Icon>;
}

export function ArrowLeft(props: IconProps) {
  return <Icon {...props}><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></Icon>;
}

export function ArrowRight(props: IconProps) {
  return <Icon {...props}><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></Icon>;
}

export function ArrowUpRight(props: IconProps) {
  return <Icon {...props}><path d="M7 7h10v10" /><path d="M7 17 17 7" /></Icon>;
}

export function ChevronsDown(props: IconProps) {
  return <Icon {...props}><path d="m7 6 5 5 5-5" /><path d="m7 13 5 5 5-5" /></Icon>;
}

export function BedDouble(props: IconProps) {
  return <Icon {...props}><path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8" /><path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" /><path d="M2 17h20" /></Icon>;
}

export function MapPin(props: IconProps) {
  return <Icon {...props}><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" /><circle cx="12" cy="10" r="3" /></Icon>;
}

export function Ruler(props: IconProps) {
  return <Icon {...props}><path d="M21.3 8.7 8.7 21.3a1 1 0 0 1-1.4 0L2.7 16.7a1 1 0 0 1 0-1.4L15.3 2.7a1 1 0 0 1 1.4 0l4.6 4.6a1 1 0 0 1 0 1.4Z" /><path d="m7.5 10.5 2-2" /><path d="m10.5 13.5 2-2" /><path d="m13.5 16.5 2-2" /><path d="m16.5 19.5 2-2" /></Icon>;
}

export function Expand(props: IconProps) {
  return <Icon {...props}><path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" /><path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" /></Icon>;
}

export function RotateCcw(props: IconProps) {
  return <Icon {...props}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></Icon>;
}

export function SlidersHorizontal(props: IconProps) {
  return (
    <Icon {...props}>
      <line x1="21" x2="14" y1="4" y2="4" /><line x1="10" x2="3" y1="4" y2="4" />
      <line x1="21" x2="12" y1="12" y2="12" /><line x1="8" x2="3" y1="12" y2="12" />
      <line x1="21" x2="16" y1="20" y2="20" /><line x1="12" x2="3" y1="20" y2="20" />
      <line x1="14" x2="14" y1="2" y2="6" /><line x1="8" x2="8" y1="10" y2="14" /><line x1="16" x2="16" y1="18" y2="22" />
    </Icon>
  );
}

export function CheckCircle(props: IconProps) {
  return <Icon {...props}><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></Icon>;
}

export function LoaderCircle(props: IconProps) {
  return <Icon {...props}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></Icon>;
}

export function Send(props: IconProps) {
  return <Icon {...props}><path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" /><path d="m21.854 2.147-10.94 10.939" /></Icon>;
}

export function RefreshCw(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" />
    </Icon>
  );
}
