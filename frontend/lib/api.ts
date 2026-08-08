import type { Edge } from "@xyflow/react"
import type { FlowNode } from "@/lib/cluster"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "/api"

export interface BackendNode {
  id: string
  type: string
  name: string
  ip: string
  labels?: Record<string, string>
  properties?: Record<string, string>
}

export interface BackendEdge {
  id: string
  source: string
  target: string
}

export interface BackendTopology {
  nodes: BackendNode[]
  edges: BackendEdge[]
}

export interface ValidateResponse {
  valid: boolean
  errors: { field: string; message: string }[]
}

export interface GenerateResponse {
  kubeadm_config: string
  provision_script: string
  join_script: string
}

/** Map React Flow designer state → backend topology DTO (with node properties). */
export function toBackendTopology(nodes: FlowNode[], edges: Edge[]): BackendTopology {
  return {
    nodes: nodes.map((n) => {
      const properties: Record<string, string> = {}
      for (const [k, v] of Object.entries(n.data.config ?? {})) {
        properties[k] = String(v)
      }
      const ip = properties.ip || properties.vip || ""
      const name = properties.hostname || n.data.label || n.id
      return {
        id: n.id,
        type: n.data.kind,
        name,
        ip,
        properties,
      }
    }),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
    })),
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(text || `${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<T>
}

export function validateTopologyRemote(topology: BackendTopology) {
  return api<ValidateResponse>("/validate", {
    method: "POST",
    body: JSON.stringify({ topology }),
  })
}

export function generateFromTopology(topology: BackendTopology, kubernetesVersion?: string) {
  const cp = topology.nodes.find((n) => n.type === "control-plane")
  const version =
    kubernetesVersion ||
    (cp?.properties?.k8sVersion ? `v${cp.properties.k8sVersion.replace(/^v/, "")}` : undefined)

  return api<GenerateResponse>("/generate", {
    method: "POST",
    body: JSON.stringify({
      topology,
      kubernetes_version: version,
    }),
  })
}

export function fetchCatalog() {
  return api<{
    kubernetes_versions: { version: string; stable: boolean }[]
    cnis: { name: string; description: string; versions: string[] }[]
    helm_charts: { name: string; description: string; versions: string[] }[]
  }>("/catalog")
}
