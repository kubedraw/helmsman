"use client"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { ValidationIssue } from "@/lib/cluster"
import {
  Hexagon,
  Play,
  Loader2,
  Trash2,
  LayoutTemplate,
  AlertTriangle,
  CircleCheck,
  CircleAlert,
} from "lucide-react"

interface TopbarProps {
  nodeCount: number
  edgeCount: number
  issues: ValidationIssue[]
  running: boolean
  onApply: () => void
  onClear: () => void
  onLoadTemplate: () => void
}

export function Topbar({ nodeCount, edgeCount, issues, running, onApply, onClear, onLoadTemplate }: TopbarProps) {
  const errors = issues.filter((i) => i.level === "error")
  const warnings = issues.filter((i) => i.level === "warning")
  const canApply = nodeCount > 0 && errors.length === 0 && !running

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-sidebar px-4">
      <div className="flex items-center gap-2.5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Hexagon className="size-4.5" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold">Helmsman</p>
          <p className="font-mono text-[10px] text-muted-foreground">kubeadm cluster designer</p>
        </div>
      </div>

      <div className="mx-1 h-7 w-px bg-border" />

      <div className="flex items-center gap-1.5">
        <Stat label="nodes" value={nodeCount} />
        <Stat label="links" value={edgeCount} />
      </div>

      {/* validation summary */}
      <div className="flex items-center gap-2">
        {errors.length > 0 ? (
          <ValidationPill tone="error" icon={CircleAlert} count={errors.length} issues={errors} label="error" />
        ) : null}
        {warnings.length > 0 ? (
          <ValidationPill tone="warning" icon={AlertTriangle} count={warnings.length} issues={warnings} label="warning" />
        ) : null}
        {errors.length === 0 && warnings.length === 0 && nodeCount > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--success)]/30 bg-[var(--success)]/10 px-2.5 py-1 text-xs font-medium text-[var(--success)]">
            <CircleCheck className="size-3.5" />
            Valid topology
          </span>
        ) : null}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onLoadTemplate} className="gap-1.5">
          <LayoutTemplate className="size-4" />
          HA Template
        </Button>
        <Button variant="ghost" size="sm" onClick={onClear} className="gap-1.5 text-muted-foreground">
          <Trash2 className="size-4" />
          Clear
        </Button>
        <Button onClick={onApply} disabled={!canApply} size="sm" className="gap-1.5 font-medium">
          {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
          {running ? "Provisioning…" : "Apply Infrastructure"}
        </Button>
      </div>
    </header>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline gap-1.5 rounded-md bg-card px-2.5 py-1">
      <span className="font-mono text-sm font-semibold tabular-nums">{value}</span>
      <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
    </div>
  )
}

function ValidationPill({
  tone,
  icon: Icon,
  count,
  issues,
  label,
}: {
  tone: "error" | "warning"
  icon: typeof AlertTriangle
  count: number
  issues: ValidationIssue[]
  label: string
}) {
  const color = tone === "error" ? "var(--destructive)" : "var(--warning)"
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className="inline-flex cursor-default items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium"
            style={{ borderColor: `${color}4d`, background: `${color}1a`, color }}
          >
            <Icon className="size-3.5" />
            {count} {label}
            {count > 1 ? "s" : ""}
          </span>
        }
      />
      <TooltipContent className="max-w-xs">
        <ul className="flex list-disc flex-col gap-1 pl-3 text-xs">
          {issues.map((i, idx) => (
            <li key={idx}>{i.message}</li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  )
}
