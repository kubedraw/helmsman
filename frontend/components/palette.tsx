"use client"

import { COMPONENT_CATALOG, CATEGORY_LABELS, ACCENT_VAR, type NodeCategory, type ComponentSpec } from "@/lib/catalog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Boxes } from "lucide-react"

const CATEGORY_ORDER: NodeCategory[] = ["compute", "networking", "storage", "platform"]

export function Palette({ onAdd }: { onAdd: (spec: ComponentSpec) => void }) {
  return (
    <aside className="flex h-full w-[264px] shrink-0 flex-col border-r border-border bg-sidebar">
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-3.5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Boxes className="size-4" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">Component Library</p>
          <p className="text-xs text-muted-foreground">Drag or click to place</p>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-5 p-3">
          {CATEGORY_ORDER.map((cat) => (
            <div key={cat}>
              <p className="mb-2 px-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {CATEGORY_LABELS[cat]}
              </p>
              <div className="flex flex-col gap-1.5">
                {COMPONENT_CATALOG.filter((s) => s.category === cat).map((spec) => {
                  const accent = ACCENT_VAR[spec.accent]
                  const Icon = spec.icon
                  return (
                    <button
                      key={spec.kind}
                      onClick={() => onAdd(spec)}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/k8s-kind", spec.kind)
                        e.dataTransfer.effectAllowed = "move"
                      }}
                      className="group flex w-full items-center gap-2.5 rounded-lg border border-transparent bg-card/40 px-2.5 py-2 text-left transition-all hover:border-border hover:bg-card"
                    >
                      <div
                        className="flex size-8 shrink-0 items-center justify-center rounded-md border transition-transform group-hover:scale-105"
                        style={{ background: `${accent}1a`, borderColor: `${accent}40`, color: accent }}
                      >
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium leading-tight">{spec.label}</p>
                        <p className="truncate font-mono text-[10px] text-muted-foreground">{spec.short}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </aside>
  )
}
