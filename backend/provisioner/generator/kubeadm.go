package generator

import (
	"bytes"
	"fmt"
	"strings"
	"text/template"

	"github.com/kubedraw/helmsman/backend/topology/model"
)

const kubeadmTemplate = `apiVersion: kubeadm.k8s.io/v1beta3
kind: InitConfiguration
localAPIEndpoint:
  advertiseAddress: {{.ControlPlaneIP}}
  bindPort: 6443
nodeRegistration:
  criSocket: "unix:///run/{{.CRI}}/{{.CRI}}.sock"
---
apiVersion: kubeadm.k8s.io/v1beta3
kind: ClusterConfiguration
kubernetesVersion: {{.KubernetesVersion}}
controlPlaneEndpoint: "{{.ControlPlaneEndpoint}}"
networking:
  serviceSubnet: "{{.ServiceSubnet}}"
  podSubnet: "{{.PodSubnet}}"
  dnsDomain: "cluster.local"
`

type KubeadmConfig struct {
	ControlPlaneIP       string
	ControlPlaneEndpoint string
	KubernetesVersion    string
	PodSubnet            string
	ServiceSubnet        string
	CRI                  string
}

func GenerateKubeadmConfig(topology *model.Topology, version string) (string, error) {
	cp := topology.FindFirst("control-plane")
	if cp == nil {
		return "", fmt.Errorf("no control-plane node found")
	}

	cpIP := cp.IP
	if cpIP == "" {
		cpIP = cp.Prop("ip", "")
	}
	if cpIP == "" {
		return "", fmt.Errorf("control-plane node has no IP")
	}

	podSubnet := "10.244.0.0/16"
	svcSubnet := cp.Prop("svcCidr", "10.96.0.0/12")
	cri := cp.Prop("cri", "containerd")

	if cni := topology.FindFirst("cni"); cni != nil {
		podSubnet = cni.Prop("podCidr", podSubnet)
	} else if v := cp.Prop("podCidr", ""); v != "" {
		podSubnet = v
	}

	endpoint := fmt.Sprintf("%s:6443", cpIP)
	if lb := topology.FindFirst("load-balancer"); lb != nil {
		vip := lb.IP
		if vip == "" {
			vip = lb.Prop("vip", "")
		}
		port := lb.Prop("port", "6443")
		if vip != "" {
			endpoint = fmt.Sprintf("%s:%s", vip, port)
		}
	}

	k8sVersion := version
	if k8sVersion == "" {
		k8sVersion = cp.Prop("k8sVersion", "v1.28.0")
	}
	if !strings.HasPrefix(k8sVersion, "v") {
		k8sVersion = "v" + k8sVersion
	}

	data := KubeadmConfig{
		ControlPlaneIP:       cpIP,
		ControlPlaneEndpoint: endpoint,
		KubernetesVersion:    k8sVersion,
		PodSubnet:            podSubnet,
		ServiceSubnet:        svcSubnet,
		CRI:                  cri,
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
