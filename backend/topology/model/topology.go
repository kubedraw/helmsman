package model

type Node struct {
	ID     string            `json:"id"`
	Type   string            `json:"type"`   // control-plane, worker, etcd, cni
	Name   string            `json:"name"`
	IP     string            `json:"ip"`
	Labels map[string]string `json:"labels,omitempty"`
}

type Edge struct {
	ID     string `json:"id"`
	Source string `json:"source"`
	Target string `json:"target"`
}

type Topology struct {
	Nodes []Node `json:"nodes"`
	Edges []Edge `json:"edges"`
}
