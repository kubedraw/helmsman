"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type NodeTypes,
  type ReactFlowInstance,
  MarkerType,
} from "@xyflow/react"

import { K8sNode } from "@/components/k8s-node"
import { Palette } from "@/components/palette"
import { Inspector } from "@/components/inspector"
import { Topbar } from "@/components/topbar"
import { ApplyConsole, type LogLine } from "@/components/apply-console"
import { CATALOG_BY_KIND, ACCENT_VAR, type ComponentSpec, type NodeKind } from "@/lib/catalog"
import {
  validateTopology,
  generateCommands,
  generateClusterYaml,
  type FlowNode,
  type K8sNodeData,
} from "@/lib/cluster"
import { generateFromTopology, toBackendTopology, validateTopologyRemote } from "@/lib/api"

const nodeTypes: NodeTypes = { k8s: K8sNode }

let idCounter = 1
const nextId = () => `n${idCounter++}`

function buildNode(spec: ComponentSpec, position: { x: number; y: number }): FlowNode {
  const config: Record<string, string | number> = {}
  for (const f of spec.fields) config[f.key] = f.default
  return {
    id: nextId(),
    type: "k8s",
    position,
    data: { kind: spec.kind, label: spec.label, config, status: "idle" },
  }
}

const initialNodes: FlowNode[] = [
  buildNode(CATALOG_BY_KIND["load-balancer"], { x: 80, y: 220 }),
  buildNode(CATALOG_BY_KIND["control-plane"], { x: 380, y: 120 }),
  buildNode(CATALOG_BY_KIND["worker"], { x: 720, y: 40 }),
  buildNode(CATALOG_BY_KIND["worker"], { x: 720, y: 220 }),
  buildNode(CATALOG_BY_KIND["cni"], { x: 380, y: 340 }),
]
// give the two workers distinct hostnames
initialNodes[2].data.config.hostname = "worker-01"
initialNodes[3].data.config.hostname = "worker-02"
initialNodes[3].data.config.ip = "10.0.0.21"

const edgeStyle = (color: string) => ({
  style: { stroke: color },
  markerEnd: { type: MarkerType.ArrowClosed, color },
})

const initialEdges: Edge[] = [
  { id: "e1", source: initialNodes[0].id, target: initialNodes[1].id, ...edgeStyle("var(--info)") },
  { id: "e2", source: initialNodes[1].id, target: initialNodes[2].id, ...edgeStyle("var(--border)") },
  { id: "e3", source: initialNodes[1].id, target: initialNodes[3].id, ...edgeStyle("var(--border)") },
  { id: "e4", source: initialNodes[4].id, target: initialNodes[1].id, ...edgeStyle("var(--primary)") },
]

function DesignerInner() {
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [consoleOpen, setConsoleOpen] = useState(false)
  const [logs, setLogs] = useState<LogLine[]>([])
  const wrapperRef = useRef<HTMLDivElement>(null)
  const rfRef = useRef<ReactFlowInstance<FlowNode, Edge> | null>(null)

  const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedId) ?? null, [nodes, selectedId])
  const issues = useMemo(() => validateTopology(nodes, edges), [nodes, edges])
  const steps = useMemo(() => generateCommands(nodes, edges), [nodes, edges])
  const yaml = useMemo(() => generateClusterYaml(nodes), [nodes])

  const onConnect = useCallback(
    (conn: Connection) => {
      const src = nodes.find((n) => n.id === conn.source)
      const color = src ? ACCENT_VAR[CATALOG_BY_KIND[src.data.kind].accent] : "var(--primary)"
      setEdges((eds) => addEdge({ ...conn, ...edgeStyle(color) }, eds))
    },
    [nodes, setEdges],
  )

  const addSpec = useCallback(
    (spec: ComponentSpec, position?: { x: number; y: number }) => {
      const pos = position ?? {
        x: 360 + Math.random() * 200,
        y: 120 + Math.random() * 200,
      }
      const node = buildNode(spec, pos)
      setNodes((nds) => [...nds, node])
      setSelectedId(node.id)
    },
    [setNodes],
  )

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const kind = event.dataTransfer.getData("application/k8s-kind") as NodeKind
      if (!kind || !rfRef.current) return
      const position = rfRef.current.screenToFlowPosition({ x: event.clientX, y: event.clientY })
      addSpec(CATALOG_BY_KIND[kind], position)
    },
    [addSpec],
  )

  const onConfigChange = useCallback(
    (nodeId: string, key: string, value: string | number) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, config: { ...n.data.config, [key]: value } } } : n)),
      )
    },
    [setNodes],
  )

  const onRename = useCallback(
    (nodeId: string, label: string) => {
      setNodes((nds) => nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, label } } : n)))
    },
    [setNodes],
  )

  const onDelete = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId))
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId))
      setSelectedId((cur) => (cur === nodeId ? null : cur))
    },
    [setNodes, setEdges],
  )

  const setStatus = useCallback(
    (nodeId: string, status: K8sNodeData["status"]) => {
      setNodes((nds) => nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, status } } : n)))
    },
    [setNodes],
  )

  const setAllStatus = useCallback(
    (status: K8sNodeData["status"]) => {
      setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, status } })))
    },
    [setNodes],
  )

  const animateEdges = useCallback(
    (on: boolean) => {
      setEdges((eds) => eds.map((e) => ({ ...e, className: on ? "edge-animated" : undefined })))
    },
    [setEdges],
  )

  const pushLog = (text: string, tone: LogLine["tone"] = "default") =>
    setLogs((l) => [...l, { id: `${Date.now()}-${Math.random()}`, text, tone }])

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

  const onApply = useCallback(async () => {
    setConsoleOpen(true)
    setRunning(true)
    setLogs([])
    animateEdges(true)

    const computedSteps = generateCommands(nodes, edges)
    const topology = toBackendTopology(nodes, edges)

    pushLog("helmsman apply — sending topology properties to backend", "muted")
    pushLog(`${nodes.length} nodes · ${edges.length} links · ${computedSteps.length} local steps`, "muted")
    pushLog("")

    setAllStatus("queued")
    await sleep(200)

    try {
      pushLog("▶ POST /api/validate", "warning")
      const validation = await validateTopologyRemote(topology)
      if (!validation.valid) {
        for (const err of validation.errors) {
          pushLog(`✗ ${err.field}: ${err.message}`, "error")
        }
        setAllStatus("error")
        animateEdges(false)
        setRunning(false)
        return
      }
      pushLog("✓ topology valid", "success")
      pushLog("")

      pushLog("▶ POST /api/generate — forwarding node properties", "warning")
      for (const n of topology.nodes) {
        const props = Object.entries(n.properties ?? {})
          .map(([k, v]) => `${k}=${v}`)
          .join(" ")
        pushLog(`  ${n.type}/${n.name}: ${props || "(no props)"}`, "muted")
      }

      const generated = await generateFromTopology(topology)
      pushLog("✓ provisioner returned kubeadm config", "success")
      pushLog("")
      for (const line of generated.kubeadm_config.split("\n")) {
        pushLog(line, "cmd")
      }
      pushLog("")
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      pushLog(`✗ backend unreachable or failed: ${message}`, "error")
      pushLog("Falling back to local command simulation…", "muted")
      pushLog("")
    }

    for (const step of computedSteps) {
      setStatus(step.nodeId, "provisioning")
      pushLog(`▶ ${step.title}`, "warning")
      for (const cmd of step.commands) {
        pushLog(cmd.replace(/\n/g, " "), "cmd")
        await sleep(180 + Math.random() * 180)
      }
      setStatus(step.nodeId, "ready")
      pushLog(`✓ ${step.title} — done`, "success")
      pushLog("")
    }

    animateEdges(false)
    pushLog("Cluster bootstrap plan complete.", "success")
    setRunning(false)
  }, [nodes, edges, animateEdges, setAllStatus, setStatus])

  const onClear = useCallback(() => {
    setNodes([])
    setEdges([])
    setSelectedId(null)
  }, [setNodes, setEdges])

  const onLoadTemplate = useCallback(() => {
    idCounter = 1
    const lb = buildNode(CATALOG_BY_KIND["load-balancer"], { x: 60, y: 240 })
    const cp1 = buildNode(CATALOG_BY_KIND["control-plane"], { x: 340, y: 80 })
    const cp2 = buildNode(CATALOG_BY_KIND["control-plane"], { x: 340, y: 360 })
    cp2.data.config.hostname = "cp-02"
    cp2.data.config.ip = "10.0.0.11"
    const etcd = buildNode(CATALOG_BY_KIND["etcd"], { x: 340, y: 220 })
    const cni = buildNode(CATALOG_BY_KIND["cni"], { x: 620, y: 360 })
    const w1 = buildNode(CATALOG_BY_KIND["worker"], { x: 660, y: 40 })
    const w2 = buildNode(CATALOG_BY_KIND["worker"], { x: 660, y: 180 })
    w2.data.config.hostname = "worker-02"
    w2.data.config.ip = "10.0.0.21"
    const ing = buildNode(CATALOG_BY_KIND["ingress"], { x: 940, y: 60 })
    const mon = buildNode(CATALOG_BY_KIND["monitoring"], { x: 940, y: 220 })

    const tNodes = [lb, cp1, cp2, etcd, cni, w1, w2, ing, mon]
    const mk = (s: string, t: string, c: string) => ({ id: `${s}-${t}`, source: s, target: t, ...edgeStyle(c) })
    const tEdges: Edge[] = [
      mk(lb.id, cp1.id, "var(--info)"),
      mk(lb.id, cp2.id, "var(--info)"),
      mk(etcd.id, cp1.id, "var(--warning)"),
      mk(cni.id, cp1.id, "var(--primary)"),
      mk(cp1.id, w1.id, "var(--border)"),
      mk(cp1.id, w2.id, "var(--border)"),
      mk(w1.id, ing.id, "var(--success)"),
      mk(cp1.id, mon.id, "var(--success)"),
    ]
    setNodes(tNodes)
    setEdges(tEdges)
    setSelectedId(null)
    setTimeout(() => rfRef.current?.fitView({ padding: 0.2, duration: 600 }), 50)
  }, [setNodes, setEdges])

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
      <Topbar
        nodeCount={nodes.length}
        edgeCount={edges.length}
        issues={issues}
        running={running}
        onApply={onApply}
        onClear={onClear}
        onLoadTemplate={onLoadTemplate}
      />
      <div className="flex min-h-0 flex-1">
        <Palette onAdd={(spec) => addSpec(spec)} />

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="relative min-h-0 flex-1" ref={wrapperRef}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onInit={(inst) => (rfRef.current = inst)}
              onDrop={onDrop}
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = "move"
              }}
              onNodeClick={(_, node) => setSelectedId(node.id)}
              onPaneClick={() => setSelectedId(null)}
              fitView
              fitViewOptions={{ padding: 0.25 }}
              proOptions={{ hideAttribution: true }}
              defaultEdgeOptions={{ type: "smoothstep" }}
            >
              <Background variant={BackgroundVariant.Dots} gap={22} size={1.5} color="var(--border)" />
              <Controls className="!bottom-4 !left-4" showInteractive={false} />
              <MiniMap
                pannable
                zoomable
                className="!bottom-4 !right-4"
                maskColor="oklch(0.14 0.012 255 / 0.7)"
                nodeColor={(n) => {
                  const data = n.data as K8sNodeData
                  return ACCENT_VAR[CATALOG_BY_KIND[data.kind].accent]
                }}
              />
            </ReactFlow>
          </div>

          <ApplyConsole
            open={consoleOpen}
            onClose={() => setConsoleOpen(false)}
            logs={logs}
            steps={steps}
            yaml={yaml}
            running={running}
          />
        </div>

        <Inspector node={selectedNode} onChange={onConfigChange} onRename={onRename} onDelete={onDelete} />
      </div>
    </div>
  )
}

export function Designer() {
  return (
    <ReactFlowProvider>
      <DesignerInner />
    </ReactFlowProvider>
  )
}
