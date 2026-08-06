package handler

import (
	"encoding/json"
	"net/http"

	"github.com/kubedraw/helmsman/backend/topology/model"
	"github.com/kubedraw/helmsman/backend/topology/validator"
	"github.com/kubedraw/helmsman/backend/shared/errors"
)

type TopologyHandler struct{}

func NewTopologyHandler() *TopologyHandler {
	return &TopologyHandler{}
}

// ValidateRequest — структура запроса на валидацию
type ValidateRequest struct {
	Topology model.Topology `json:"topology"`
}

// Validate — POST /validate
func (h *TopologyHandler) Validate(w http.ResponseWriter, r *http.Request) {
	var req ValidateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, errors.NewBadRequest("invalid request body"))
		return
	}

	result := validator.Validate(&req.Topology)
	writeJSON(w, http.StatusOK, result)
}

// Analyze — POST /analyze (пока заглушка, дальше добавим топологическую сортировку)
func (h *TopologyHandler) Analyze(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{
		"message": "analyze endpoint (coming soon)",
	})
}
