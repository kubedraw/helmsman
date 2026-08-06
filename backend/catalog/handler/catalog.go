package handler

import (
	"net/http"

	"github.com/kubedraw/helmsman/backend/catalog/model"
)

type CatalogHandler struct{}

func NewCatalogHandler() *CatalogHandler {
	return &CatalogHandler{}
}

func (h *CatalogHandler) GetCatalog(w http.ResponseWriter, r *http.Request) {
	catalog := model.Catalog{
		KubernetesVersions: []model.KubernetesVersion{
			{Version: "v1.28.0", Stable: true},
			{Version: "v1.29.0", Stable: true},
			{Version: "v1.30.0", Stable: true},
			{Version: "v1.31.0", Stable: false},
		},
		CNIs: []model.CNI{
			{Name: "Calico", Description: "CNI with network policy", Versions: []string{"v3.26", "v3.27"}},
			{Name: "Flannel", Description: "Simple overlay network", Versions: []string{"v0.22", "v0.23"}},
			{Name: "Cilium", Description: "CNI with eBPF and security", Versions: []string{"v1.14", "v1.15"}},
		},
		HelmCharts: []model.HelmChart{
			{Name: "nginx-ingress", Description: "NGINX Ingress Controller", Versions: []string{"v4.9", "v4.10"}},
			{Name: "cert-manager", Description: "Certificate management", Versions: []string{"v1.13", "v1.14"}},
		},
	}

	writeJSON(w, http.StatusOK, catalog)
}
