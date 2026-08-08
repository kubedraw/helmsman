"use client"

import { CATALOG_BY_KIND, ACCENT_VAR, withAlpha } from "@/lib/catalog"
import type { FlowNode } from "@/lib/cluster"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Trash2, SlidersHorizontal, MousePointerClick } from "lucide-react"

interface InspectorProps {
  node: FlowNode | null
  onChange: (nodeId: string, key: string, value: string | number) => void
  onRename: (nodeId: string, label: string) => void
  onDelete: (nodeId: string) => void
}

export function Inspector({ node, onChange, onRename, onDelete }: InspectorProps) {
  return (
    <aside className="flex h-full w-[300px] shrink-0 flex-col border-l border-border bg-sidebar">
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-3.5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <SlidersHorizontal className="size-4" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">Inspector</p>
          <p className="text-xs text-muted-foreground">Configure selected node</p>
        </div>
      </div>

      {!node ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground">
            <MousePointerClick className="size-5" />
          </div>
          <p className="text-sm text-muted-foreground text-balance">
            Select a node on the canvas to edit its configuration.
          </p>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <InspectorBody node={node} onChange={onChange} onRename={onRename} onDelete={onDelete} />
        </ScrollArea>
      )}
    </aside>
  )
}

function InspectorBody({ node, onChange, onRename, onDelete }: { node: FlowNode } & Omit<InspectorProps, "node">) {
  const spec = CATALOG_BY_KIND[node.data.kind]
  const accent = ACCENT_VAR[spec.accent]
  const Icon = spec.icon

  return (
    <div className="flex flex-col gap-5 p-4">
      <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-lg border"
          style={{ background: withAlpha(accent, 10), borderColor: withAlpha(accent, 25), color: accent }}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold">{spec.label}</p>
          <p className="text-xs leading-relaxed text-muted-foreground text-pretty">{spec.description}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="node-label" className="text-xs text-muted-foreground">
          Display Name
        </Label>
        <Input
          id="node-label"
          value={node.data.label}
          onChange={(e) => onRename(node.id, e.target.value)}
          className="h-9"
        />
      </div>

      <div className="flex flex-col gap-3.5">
        {spec.fields.map((field) => {
          const value = node.data.config[field.key] ?? field.default
          return (
            <div key={field.key} className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">{field.label}</Label>
              {field.type === "select" ? (
                <Select value={String(value)} onValueChange={(v) => onChange(node.id, field.key, String(v ?? ""))}>
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options?.map((opt) => (
                      <SelectItem key={opt} value={opt} className="font-mono text-xs">
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type={field.type}
                  value={String(value)}
                  onChange={(e) =>
                    onChange(node.id, field.key, field.type === "number" ? Number(e.target.value) : e.target.value)
                  }
                  className="h-9 font-mono text-xs"
                />
              )}
              {field.hint && <p className="text-[11px] text-muted-foreground">{field.hint}</p>}
            </div>
          )
        })}
      </div>

      <Button
        variant="outline"
        onClick={() => onDelete(node.id)}
        className="mt-1 w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="size-4" />
        Remove Node
      </Button>
    </div>
  )
}
