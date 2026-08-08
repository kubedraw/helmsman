"use client"

import { useEffect, useRef } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Terminal, X, FileCode2, ListChecks, Download, Copy } from "lucide-react"
import type { CommandStep } from "@/lib/cluster"
import { cn } from "@/lib/utils"

export interface LogLine {
  id: string
  text: string
  tone: "default" | "success" | "warning" | "error" | "muted" | "cmd"
}

interface ApplyConsoleProps {
  open: boolean
  onClose: () => void
  logs: LogLine[]
  steps: CommandStep[]
  yaml: string
  running: boolean
}

const TONE_CLASS: Record<LogLine["tone"], string> = {
  default: "text-foreground",
  success: "text-[var(--success)]",
  warning: "text-[var(--warning)]",
  error: "text-destructive",
  muted: "text-muted-foreground",
  cmd: "text-[var(--info)]",
}

export function ApplyConsole({ open, onClose, logs, steps, yaml, running }: ApplyConsoleProps) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [logs])

  if (!open) return null

  const copy = (text: string) => navigator.clipboard?.writeText(text)
  const download = (name: string, text: string) => {
    const blob = new Blob([text], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
  }

  const allCommands = steps
    .map((s) => `# ${s.title}  (host: ${s.host})\n${s.commands.join("\n")}`)
    .join("\n\n")

  return (
    <div className="flex h-[300px] shrink-0 flex-col border-t border-border bg-[oklch(0.14_0.012_255)]">
      <Tabs defaultValue="output" className="flex h-full flex-col gap-0">
        <div className="flex items-center justify-between border-b border-border px-3">
          <TabsList className="h-11 bg-transparent p-0">
            <TabsTrigger value="output" className="gap-1.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none">
              <Terminal className="size-3.5" />
              Output
              {running && <span className="ml-1 size-1.5 animate-pulse rounded-full bg-[var(--warning)]" />}
            </TabsTrigger>
            <TabsTrigger value="commands" className="gap-1.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none">
              <ListChecks className="size-3.5" />
              Commands
            </TabsTrigger>
            <TabsTrigger value="yaml" className="gap-1.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none">
              <FileCode2 className="size-3.5" />
              kubeadm-config
            </TabsTrigger>
          </TabsList>
          <Button variant="ghost" size="icon" onClick={onClose} className="size-7">
            <X className="size-4" />
          </Button>
        </div>

        <TabsContent value="output" className="m-0 min-h-0 flex-1">
          <ScrollArea className="h-full">
            <div className="p-3 font-mono text-xs leading-relaxed">
              {logs.length === 0 ? (
                <p className="text-muted-foreground">Waiting for apply…</p>
              ) : (
                logs.map((l) => (
                  <div key={l.id} className={cn("whitespace-pre-wrap", TONE_CLASS[l.tone])}>
                    {l.tone === "cmd" ? <span className="text-muted-foreground">$ </span> : null}
                    {l.text}
                  </div>
                ))
              )}
              <div ref={endRef} />
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="commands" className="m-0 min-h-0 flex-1">
          <div className="flex items-center justify-end gap-2 border-b border-border px-3 py-1.5">
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => copy(allCommands)}>
              <Copy className="size-3.5" /> Copy all
            </Button>
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => download("provision.sh", allCommands)}>
              <Download className="size-3.5" /> provision.sh
            </Button>
          </div>
          <ScrollArea className="h-[calc(100%-37px)]">
            <div className="flex flex-col gap-3 p-3">
              {steps.length === 0 ? (
                <p className="font-mono text-xs text-muted-foreground">Add nodes to generate commands.</p>
              ) : (
                steps.map((s, i) => (
                  <div key={s.id} className="rounded-lg border border-border bg-card/50">
                    <div className="flex items-center gap-2 border-b border-border/60 px-3 py-1.5">
                      <span className="font-mono text-[10px] text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                      <span className="text-xs font-medium">{s.title}</span>
                      <span className="ml-auto font-mono text-[10px] text-muted-foreground">{s.host}</span>
                    </div>
                    <pre className="overflow-x-auto p-3 font-mono text-[11px] leading-relaxed text-[var(--info)]">
                      {s.commands.join("\n")}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="yaml" className="m-0 min-h-0 flex-1">
          <div className="flex items-center justify-end gap-2 border-b border-border px-3 py-1.5">
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => copy(yaml)}>
              <Copy className="size-3.5" /> Copy
            </Button>
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => download("kubeadm-config.yaml", yaml)}>
              <Download className="size-3.5" /> Download
            </Button>
          </div>
          <ScrollArea className="h-[calc(100%-37px)]">
            <pre className="p-3 font-mono text-[11px] leading-relaxed text-foreground">{yaml}</pre>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}
