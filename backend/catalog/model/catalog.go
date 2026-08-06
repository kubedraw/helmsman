package model

type KubernetesVersion struct {
	Version string `json:"version"`
	Stable  bool   `json:"stable"`
}

type CNI struct {
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Versions    []string `json:"versions"`
}

type HelmChart struct {
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Versions    []string `json:"versions"`
}

type Catalog struct {
	KubernetesVersions []KubernetesVersion `json:"kubernetes_versions"`
	CNIs               []CNI               `json:"cnis"`
	HelmCharts         []HelmChart         `json:"helm_charts"`
}
