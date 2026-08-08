"use client"

import { memo } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { CATALOG_BY_KIND, ACCENT_VAR } from "@/lib/catalog"
import type { K8sNodeData } from "@/lib/cluster"
import { Loader2, CheckCircle2, AlertCircle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

const STATUS_META = {
  idle: { label: "Idle", color: "var(--muted-foreground)", Icon: null },
  queued: { label: "Queued", color: "var(--info)", Icon: Clock },
  provisioning: { label: "Provisioning", color: "var(--warning)", Icon: Loader2 },
  ready: { label: "Ready", color: "var(--success)", Icon: CheckCircle2 },
  error: { label: "Error", color: "var(--destructive)", Icon: AlertCircle },
} as const

function K8sNodeInner({ data, selected }: NodeProps & { data: K8sNodeData }) {
  const spec = CATALOG_BY_KIND[data.kind]
  const accent = ACCENT_VAR[spec.accent]
  const Icon = spec.icon
  const status = STATUS_META[data.status]
  const primaryField = spec.fields[0]
  const subtitle = String(data.config[primaryField?.key] ?? spec.short)

  return (
    <div
      className={cn(
        "group relative w-[224px] rounded-xl border bg-card/95 backdrop-blur-sm transition-all",
        selected ? "border-primary shadow-[0_0_0_1px_var(--primary),0_12px_40px_oklch(0_0_0/0.5)]" : "border-border",
      )}
      style={data.status === "provisioning" ? { boxShadow: `0 0 0 1px ${accent}, 0 0 24px ${accent}40` } : undefined}
    >
      <Handle type="target" position={Position.Left} className="!-left-1.5" />
      <Handle type="source" position={Position.Right} className="!-right-1.5" />

      {/* accent rail */}
      <div className="absolute left-0 top-3 h-[calc(100%-1.5rem)] w-1 rounded-full" style={{ background: accent }} />

      <div className="flex items-start gap-3 p-3 pl-4">
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-lg border"
          style={{ background: `${accent}1a`, borderColor: `${accent}40`, color: accent }}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold text-foreground">{data.label}</p>
          </div>
          <p className="truncate font-mono text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border/60 px-4 py-2">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{spec.short}</span>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium" style={{ color: status.color }}>
          {status.Icon && (
            <status.Icon className={cn("size-3", data.status === "provisioning" && "animate-spin")} />
          )}
          {!status.Icon && <span className="size-1.5 rounded-full" style={{ background: status.color }} />}
          {status.label}
        </span>
      </div>
    </div>
  )
}

export const K8sNode = memo(K8sNodeInner)
