package handler

import (
	"encoding/json"
	"net/http"

	"github.com/kubedraw/helmsman/backend/executor/ssh"
	"github.com/kubedraw/helmsman/backend/shared/errors"
)

type ExecutorHandler struct{}

func NewExecutorHandler() *ExecutorHandler {
	return &ExecutorHandler{}
}

type ApplyRequest struct {
	Host    string `json:"host"`
	Port    int    `json:"port"`
	User    string `json:"user"`
	Key     string `json:"key"`
	Command string `json:"command"`
}

func (h *ExecutorHandler) Apply(w http.ResponseWriter, r *http.Request) {
	var req ApplyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, errors.NewBadRequest("invalid request body"))
		return
	}

	if req.Host == "" || req.User == "" || req.Key == "" || req.Command == "" {
		writeError(w, errors.NewBadRequest("host, user, key and command are required"))
		return
	}

	if req.Port == 0 {
		req.Port = 22
	}

	client := ssh.NewClient(req.Host, req.Port, req.User, req.Key)
	stdout, stderr, err := client.Execute(req.Command)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]interface{}{
			"error":  err.Error(),
			"stdout": stdout,
			"stderr": stderr,
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"stdout": stdout,
		"stderr": stderr,
	})
}
