package handler

import (
	"encoding/json"
	"net/http"

	"github.com/kubedraw/helmsman/backend/shared/errors"
)

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, err error) {
	status := http.StatusInternalServerError
	message := err.Error()

	if appErr, ok := err.(*errors.AppError); ok {
		status = appErr.Code
		message = appErr.Message
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}
