import type { Edge, Node } from "@xyflow/react"
import type { NodeKind } from "./catalog"

export interface K8sNodeData extends Record<string, unknown> {
  kind: NodeKind
  label: string
  config: Record<string, string | number>
  status: "idle" | "queued" | "provisioning" | "ready" | "error"
}

export type FlowNode = Node<K8sNodeData>

export interface ValidationIssue {
  level: "error" | "warning"
  message: string
}

export function validateTopology(nodes: FlowNode[], edges: Edge[]): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const byKind = (k: NodeKind) => nodes.filter((n) => n.data.kind === k)

  const controlPlanes = byKind("control-plane")
  const workers = byKind("worker")
  const etcds = byKind("etcd")
  const lbs = byKind("load-balancer")
  const cnis = byKind("cni")

  if (controlPlanes.length === 0) {
    issues.push({ level: "error", message: "At least one Control Plane node is required." })
  }
  if (workers.length === 0) {
    issues.push({ level: "warning", message: "No Worker nodes — workloads will only run on the control plane." })
  }
  if (cnis.length === 0) {
    issues.push({ level: "warning", message: "No CNI plugin — pods will stay in NotReady without pod networking." })
  }
  if (controlPlanes.length > 1 && lbs.length === 0) {
    issues.push({ level: "error", message: "Multiple control planes require a Load Balancer for the API endpoint." })
  }
  if (etcds.length > 0 && etcds.length % 2 === 0) {
    issues.push({ level: "warning", message: `etcd has ${etcds.length} members — use an odd count to preserve quorum.` })
  }

  // connectivity: workers should connect to a control plane (directly or via LB)
  const connected = new Set<string>()
  for (const e of edges) {
    connected.add(e.source)
    connected.add(e.target)
  }
  for (const w of workers) {
    if (!connected.has(w.id)) {
      issues.push({ level: "warning", message: `Worker "${w.data.config.hostname ?? w.id}" is not connected to the cluster.` })
    }
  }

  return issues
}

export interface CommandStep {
  id: string
  nodeId: string
  title: string
  host: string
  commands: string[]
}

export function generateCommands(nodes: FlowNode[], _edges: Edge[]): CommandStep[] {
  const steps: CommandStep[] = []
  const controlPlanes = nodes.filter((n) => n.data.kind === "control-plane")
  const workers = nodes.filter((n) => n.data.kind === "worker")
  const lb = nodes.find((n) => n.data.kind === "load-balancer")
  const cni = nodes.find((n) => n.data.kind === "cni")

  const primary = controlPlanes[0]
  const cfg = (n: FlowNode, k: string, d = "") => String(n?.data.config[k] ?? d)

  // common prep applies to every compute host
  const computeHosts = [...controlPlanes, ...workers]
  for (const n of computeHosts) {
    const host = cfg(n, "hostname", n.id)
    steps.push({
      id: `${n.id}-prep`,
      nodeId: n.id,
      title: `Prepare host · ${host}`,
      host,
      commands: [
        "swapoff -a && sed -i '/ swap / s/^/#/' /etc/fstab",
        "modprobe overlay && modprobe br_netfilter",
        "sysctl --system",
        `apt-get update && apt-get install -y containerd kubelet kubeadm kubectl`,
        "systemctl enable --now containerd kubelet",
      ],
    })
  }

  if (primary) {
    const host = cfg(primary, "hostname", "cp-01")
    const version = cfg(primary, "k8sVersion", "1.31.0")
    const podCidr = cni ? cfg(cni, "podCidr", "10.244.0.0/16") : cfg(primary, "podCidr", "10.244.0.0/16")
    const svcCidr = cfg(primary, "svcCidr", "10.96.0.0/12")
    const advertise = cfg(primary, "ip", "10.0.0.10")
    const controlEndpoint = lb ? `${cfg(lb, "vip", "10.0.0.5")}:${cfg(lb, "port", "6443")}` : `${advertise}:6443`

    const initCmd = [
      "kubeadm init",
      `--kubernetes-version=${version}`,
      `--apiserver-advertise-address=${advertise}`,
      `--pod-network-cidr=${podCidr}`,
      `--service-cidr=${svcCidr}`,
      `--control-plane-endpoint=${controlEndpoint}`,
      controlPlanes.length > 1 ? "--upload-certs" : "",
    ]
      .filter(Boolean)
      .join(" \\\n    ")

    steps.push({
      id: `${primary.id}-init`,
      nodeId: primary.id,
      title: `Init control plane · ${host}`,
      host,
      commands: [
        initCmd,
        "mkdir -p $HOME/.kube",
        "cp -i /etc/kubernetes/admin.conf $HOME/.kube/config",
        "chown $(id -u):$(id -g) $HOME/.kube/config",
      ],
    })

    if (cni) {
      const provider = cfg(cni, "provider", "calico")
      const manifests: Record<string, string> = {
        calico: "kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.28.0/manifests/calico.yaml",
        cilium: "cilium install --version 1.16.0",
        flannel: "kubectl apply -f https://github.com/flannel-io/flannel/releases/latest/download/kube-flannel.yml",
        weave: "kubectl apply -f https://github.com/weaveworks/weave/releases/download/latest/weave-daemonset-k8s.yaml",
      }
      steps.push({
        id: `${cni.id}-apply`,
        nodeId: cni.id,
        title: `Install CNI · ${provider}`,
        host,
        commands: [manifests[provider] ?? manifests.calico],
      })
    }

    // join secondary control planes
    for (const cp of controlPlanes.slice(1)) {
      const cpHost = cfg(cp, "hostname", "cp-n")
      steps.push({
        id: `${cp.id}-join`,
        nodeId: cp.id,
        title: `Join control plane · ${cpHost}`,
        host: cpHost,
        commands: [
          `kubeadm join ${controlEndpoint} \\\n    --token <bootstrap-token> \\\n    --discovery-token-ca-cert-hash sha256:<hash> \\\n    --control-plane --certificate-key <cert-key>`,
        ],
      })
    }

    // join workers
    for (const w of workers) {
      const wHost = cfg(w, "hostname", "worker-n")
      steps.push({
        id: `${w.id}-join`,
        nodeId: w.id,
        title: `Join worker · ${wHost}`,
        host: wHost,
        commands: [
          `kubeadm join ${controlEndpoint} \\\n    --token <bootstrap-token> \\\n    --discovery-token-ca-cert-hash sha256:<hash>`,
        ],
      })
    }
  }

  // platform add-ons
  for (const n of nodes) {
    if (n.data.kind === "ingress") {
      const provider = cfg(n, "provider", "ingress-nginx")
      steps.push({
        id: `${n.id}-addon`,
        nodeId: n.id,
        title: `Add-on · ${provider}`,
        host: primary ? cfg(primary, "hostname", "cp-01") : "cp-01",
        commands: [`helm upgrade --install ${provider} ${provider}/${provider} --namespace ingress --create-namespace`],
      })
    }
    if (n.data.kind === "storage") {
      const provisioner = cfg(n, "provisioner", "longhorn")
      steps.push({
        id: `${n.id}-addon`,
        nodeId: n.id,
        title: `Storage · ${provisioner}`,
        host: primary ? cfg(primary, "hostname", "cp-01") : "cp-01",
        commands: [`helm upgrade --install ${provisioner} ${provisioner}/${provisioner} --namespace storage --create-namespace`],
      })
    }
    if (n.data.kind === "monitoring") {
      const stack = cfg(n, "stack", "kube-prometheus")
      steps.push({
        id: `${n.id}-addon`,
        nodeId: n.id,
        title: `Observability · ${stack}`,
        host: primary ? cfg(primary, "hostname", "cp-01") : "cp-01",
        commands: [`helm upgrade --install monitoring prometheus-community/${stack}-stack --namespace monitoring --create-namespace`],
      })
    }
  }

  return steps
}

export function generateClusterYaml(nodes: FlowNode[]): string {
  const cp = nodes.find((n) => n.data.kind === "control-plane")
  const cni = nodes.find((n) => n.data.kind === "cni")
  const lb = nodes.find((n) => n.data.kind === "load-balancer")
  if (!cp) return "# Add a Control Plane node to generate kubeadm-config.yaml"
  const c = (k: string, d = "") => String(cp.data.config[k] ?? d)
  const podCidr = cni ? String(cni.data.config.podCidr ?? "10.244.0.0/16") : c("podCidr", "10.244.0.0/16")
  const endpoint = lb ? `${lb.data.config.vip}:${lb.data.config.port}` : `${c("ip")}:6443`
  return `apiVersion: kubeadm.k8s.io/v1beta4
kind: ClusterConfiguration
kubernetesVersion: v${c("k8sVersion", "1.31.0")}
controlPlaneEndpoint: "${endpoint}"
networking:
  podSubnet: "${podCidr}"
  serviceSubnet: "${c("svcCidr", "10.96.0.0/12")}"
  dnsDomain: "cluster.local"
---
apiVersion: kubeadm.k8s.io/v1beta4
kind: InitConfiguration
localAPIEndpoint:
  advertiseAddress: "${c("ip", "10.0.0.10")}"
  bindPort: 6443
nodeRegistration:
  criSocket: "unix:///run/${c("cri", "containerd")}/${c("cri", "containerd")}.sock"
`
}
