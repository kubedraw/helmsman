package generator

import (
	"bytes"
	"fmt"
	"text/template"

	"github.com/kubedraw/helmsman/backend/topology/model"
)

const kubeadmTemplate = `apiVersion: kubeadm.k8s.io/v1beta3
kind: InitConfiguration
localAPIEndpoint:
  advertiseAddress: {{.ControlPlaneIP}}
  bindPort: 6443
---
apiVersion: kubeadm.k8s.io/v1beta3
kind: ClusterConfiguration
kubernetesVersion: {{.KubernetesVersion}}
controlPlaneEndpoint: "{{.ControlPlaneIP}}:6443"
networking:
  serviceSubnet: "10.96.0.0/12"
  podSubnet: "10.244.0.0/16"
`

type KubeadmConfig struct {
	ControlPlaneIP     string
	KubernetesVersion  string
}

func GenerateKubeadmConfig(topology *model.Topology, version string) (string, error) {
	var cpIP string
	for _, node := range topology.Nodes {
		if node.Type == "control-plane" {
			cpIP = node.IP
			break
		}
	}
	if cpIP == "" {
		return "", fmt.Errorf("no control-plane node found")
	}

	data := KubeadmConfig{
		ControlPlaneIP:    cpIP,
		KubernetesVersion: version,
	}

	tmpl, err := template.New("kubeadm").Parse(kubeadmTemplate)
	if err != nil {
		return "", err
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		return "", err
	}

	return buf.String(), nil
}
