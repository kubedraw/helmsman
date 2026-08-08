package handler

import (
	"encoding/json"
	"net/http"

	"github.com/kubedraw/helmsman/backend/provisioner/generator"
	"github.com/kubedraw/helmsman/backend/shared/errors"
	"github.com/kubedraw/helmsman/backend/topology/model"
)

type ProvisionerHandler struct{}

func NewProvisionerHandler() *ProvisionerHandler {
	return &ProvisionerHandler{}
}

type GenerateRequest struct {
	Topology           model.Topology `json:"topology"`
	KubernetesVersion  string         `json:"kubernetes_version"`
}

type GenerateResponse struct {
	KubeadmConfig string `json:"kubeadm_config"`
	ProvisionScript string `json:"provision_script"`
	JoinScript     string `json:"join_script"`
}

func (h *ProvisionerHandler) Generate(w http.ResponseWriter, r *http.Request) {
	var req GenerateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, errors.NewBadRequest("invalid request body"))
		return
	}

	kubeadmConfig, err := generator.GenerateKubeadmConfig(&req.Topology, req.KubernetesVersion)
	if err != nil {
		writeError(w, errors.NewBadRequest(err.Error()))
		return
	}

	resp := GenerateResponse{
		KubeadmConfig:  kubeadmConfig,
		ProvisionScript: generator.GenerateProvisionScript(),
		JoinScript:     generator.GenerateJoinScript(),
	}

	writeJSON(w, http.StatusOK, resp)
}
