import {
  Server,
  Cpu,
  Database,
  Network,
  HardDrive,
  Boxes,
  Shield,
  Globe,
  Workflow,
  Container,
  Radio,
  GaugeCircle,
  type LucideIcon,
} from "lucide-react"

export type NodeKind =
  | "control-plane"
  | "worker"
  | "etcd"
  | "load-balancer"
  | "cni"
  | "storage"
  | "ingress"
  | "registry"
  | "dns"
  | "monitoring"

export type NodeCategory = "compute" | "networking" | "storage" | "platform"

export interface ConfigField {
  key: string
  label: string
  type: "text" | "number" | "select"
  default: string | number
  options?: string[]
  hint?: string
}

export interface ComponentSpec {
  kind: NodeKind
  label: string
  short: string
  category: NodeCategory
  icon: LucideIcon
  /** oklch hue token name used for accent */
  accent: "primary" | "success" | "warning" | "info" | "destructive"
  description: string
  fields: ConfigField[]
}

export const CATEGORY_LABELS: Record<NodeCategory, string> = {
  compute: "Compute",
  networking: "Networking",
  storage: "Storage",
  platform: "Platform",
}

export const COMPONENT_CATALOG: ComponentSpec[] = [
  {
    kind: "control-plane",
    label: "Control Plane",
    short: "kube-apiserver",
    category: "compute",
    icon: Cpu,
    accent: "primary",
    description:
      "Runs kube-apiserver, controller-manager and scheduler. Bootstrapped with kubeadm init.",
    fields: [
      { key: "hostname", label: "Hostname", type: "text", default: "cp-01" },
      { key: "ip", label: "Advertise Address", type: "text", default: "10.0.0.10" },
      {
        key: "k8sVersion",
        label: "Kubernetes Version",
        type: "select",
        default: "1.31.0",
        options: ["1.31.0", "1.30.4", "1.29.8", "1.28.13"],
      },
      { key: "podCidr", label: "Pod Network CIDR", type: "text", default: "10.244.0.0/16" },
      { key: "svcCidr", label: "Service CIDR", type: "text", default: "10.96.0.0/12" },
      {
        key: "cri",
        label: "Container Runtime",
        type: "select",
        default: "containerd",
        options: ["containerd", "cri-o"],
      },
    ],
  },
  {
    kind: "worker",
    label: "Worker Node",
    short: "kubelet + kube-proxy",
    category: "compute",
    icon: Server,
    accent: "info",
    description: "Runs workloads via kubelet. Joins the cluster with kubeadm join.",
    fields: [
      { key: "hostname", label: "Hostname", type: "text", default: "worker-01" },
      { key: "ip", label: "Node IP", type: "text", default: "10.0.0.20" },
      { key: "cpu", label: "vCPU", type: "number", default: 4 },
      { key: "memory", label: "Memory (GB)", type: "number", default: 16 },
      {
        key: "role",
        label: "Workload Label",
        type: "select",
        default: "general",
        options: ["general", "gpu", "memory-optimized", "spot"],
      },
    ],
  },
  {
    kind: "etcd",
    label: "etcd Member",
    short: "key-value store",
    category: "compute",
    icon: Database,
    accent: "warning",
    description: "Distributed key-value store holding all cluster state. Use odd quorum counts.",
    fields: [
      { key: "hostname", label: "Hostname", type: "text", default: "etcd-01" },
      { key: "ip", label: "Peer Address", type: "text", default: "10.0.0.30" },
      {
        key: "mode",
        label: "Topology",
        type: "select",
        default: "stacked",
        options: ["stacked", "external"],
      },
      { key: "dataDir", label: "Data Dir", type: "text", default: "/var/lib/etcd" },
    ],
  },
  {
    kind: "load-balancer",
    label: "Load Balancer",
    short: "API VIP / HAProxy",
    category: "networking",
    icon: Network,
    accent: "info",
    description: "Fronts the control plane endpoint for HA. Required for multi control-plane.",
    fields: [
      { key: "hostname", label: "Hostname", type: "text", default: "lb-01" },
      { key: "vip", label: "Virtual IP", type: "text", default: "10.0.0.5" },
      { key: "port", label: "Port", type: "number", default: 6443 },
      {
        key: "engine",
        label: "Engine",
        type: "select",
        default: "haproxy",
        options: ["haproxy", "nginx", "keepalived"],
      },
    ],
  },
  {
    kind: "cni",
    label: "CNI Plugin",
    short: "pod networking",
    category: "networking",
    icon: Workflow,
    accent: "primary",
    description: "Container Network Interface providing pod-to-pod connectivity and policy.",
    fields: [
      {
        key: "provider",
        label: "Provider",
        type: "select",
        default: "calico",
        options: ["calico", "cilium", "flannel", "weave"],
      },
      { key: "podCidr", label: "Pod CIDR", type: "text", default: "10.244.0.0/16" },
      {
        key: "encapsulation",
        label: "Encapsulation",
        type: "select",
        default: "vxlan",
        options: ["vxlan", "ipip", "none"],
      },
    ],
  },
  {
    kind: "ingress",
    label: "Ingress Controller",
    short: "L7 routing",
    category: "networking",
    icon: Globe,
    accent: "success",
    description: "Routes external HTTP/S traffic to services inside the cluster.",
    fields: [
      {
        key: "provider",
        label: "Provider",
        type: "select",
        default: "ingress-nginx",
        options: ["ingress-nginx", "traefik", "haproxy", "contour"],
      },
      { key: "replicas", label: "Replicas", type: "number", default: 2 },
      {
        key: "tls",
        label: "TLS",
        type: "select",
        default: "cert-manager",
        options: ["cert-manager", "manual", "none"],
      },
    ],
  },
  {
    kind: "storage",
    label: "Storage Class",
    short: "persistent volumes",
    category: "storage",
    icon: HardDrive,
    accent: "warning",
    description: "Backing storage for persistent volume claims across the cluster.",
    fields: [
      {
        key: "provisioner",
        label: "Provisioner",
        type: "select",
        default: "longhorn",
        options: ["longhorn", "rook-ceph", "local-path", "nfs"],
      },
      { key: "capacity", label: "Capacity (GB)", type: "number", default: 500 },
      {
        key: "reclaim",
        label: "Reclaim Policy",
        type: "select",
        default: "Retain",
        options: ["Retain", "Delete"],
      },
    ],
  },
  {
    kind: "registry",
    label: "Image Registry",
    short: "OCI artifacts",
    category: "platform",
    icon: Container,
    accent: "info",
    description: "Private container registry mirrored for cluster image pulls.",
    fields: [
      { key: "host", label: "Registry Host", type: "text", default: "registry.local" },
      { key: "port", label: "Port", type: "number", default: 5000 },
      {
        key: "backend",
        label: "Backend",
        type: "select",
        default: "harbor",
        options: ["harbor", "distribution", "zot"],
      },
    ],
  },
  {
    kind: "dns",
    label: "Cluster DNS",
    short: "CoreDNS",
    category: "platform",
    icon: Radio,
    accent: "primary",
    description: "Service discovery for the cluster. CoreDNS ships with kubeadm by default.",
    fields: [
      { key: "domain", label: "Cluster Domain", type: "text", default: "cluster.local" },
      { key: "replicas", label: "Replicas", type: "number", default: 2 },
    ],
  },
  {
    kind: "monitoring",
    label: "Observability",
    short: "Prometheus stack",
    category: "platform",
    icon: GaugeCircle,
    accent: "success",
    description: "Metrics, dashboards and alerting for the cluster control loop.",
    fields: [
      {
        key: "stack",
        label: "Stack",
        type: "select",
        default: "kube-prometheus",
        options: ["kube-prometheus", "grafana-loki", "victoria-metrics"],
      },
      { key: "retention", label: "Retention (days)", type: "number", default: 15 },
    ],
  },
]

export const CATALOG_BY_KIND: Record<NodeKind, ComponentSpec> = COMPONENT_CATALOG.reduce(
  (acc, spec) => {
    acc[spec.kind] = spec
    return acc
  },
  {} as Record<NodeKind, ComponentSpec>,
)

export const ACCENT_VAR: Record<ComponentSpec["accent"], string> = {
  primary: "var(--primary)",
  success: "var(--success)",
  warning: "var(--warning)",
  info: "var(--info)",
  destructive: "var(--destructive)",
}

/** Tint a CSS color token (oklch / var) — hex alpha suffixes do not work with var()/oklch. */
export function withAlpha(color: string, percent: number): string {
  return `color-mix(in oklch, ${color} ${percent}%, transparent)`
}

export const PLATFORM_ICONS = { Boxes, Shield }
