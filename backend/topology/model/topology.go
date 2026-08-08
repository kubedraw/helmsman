package model

type Node struct {
	ID         string            `json:"id"`
	Type       string            `json:"type"` // control-plane, worker, etcd, cni, ...
	Name       string            `json:"name"`
	IP         string            `json:"ip"`
	Labels     map[string]string `json:"labels,omitempty"`
	Properties map[string]string `json:"properties,omitempty"`
}

// Prop returns a node property or a default value.
func (n Node) Prop(key, fallback string) string {
	if n.Properties == nil {
		return fallback
	}
	if v, ok := n.Properties[key]; ok && v != "" {
		return v
	}
	return fallback
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

// FindFirst returns the first node of the given type, or nil.
func (t *Topology) FindFirst(nodeType string) *Node {
	for i := range t.Nodes {
		if t.Nodes[i].Type == nodeType {
			return &t.Nodes[i]
		}
	}
	return nil
}
