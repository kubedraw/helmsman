package handler

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/google/uuid"
	"github.com/kubedraw/helmsman/backend/storage/repository"
	"github.com/kubedraw/helmsman/backend/shared/errors"
)

type ProjectHandler struct {
	repo repository.ProjectRepository
}

func NewProjectHandler(repo repository.ProjectRepository) *ProjectHandler {
	return &ProjectHandler{repo: repo}
}

type CreateProjectRequest struct {
	Name        string          `json:"name"`
	Description string          `json:"description"`
	Topology    json.RawMessage `json:"topology,omitempty"`
}

func (h *ProjectHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req CreateProjectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		slog.Error("Failed to decode request body", "error", err)
		writeError(w, errors.NewBadRequest("invalid request body"))
		return
	}

	if req.Name == "" {
		writeError(w, errors.NewBadRequest("name is required"))
		return
	}

	project := &repository.Project{
		ID:          uuid.New().String(),
		Name:        req.Name,
		Description: req.Description,
		UserID:      uuid.New().String(),
		Topology:    req.Topology,
		Status:      "draft",
	}

	if err := h.repo.Create(project); err != nil {
		slog.Error("Failed to create project", "error", err)
		writeError(w, errors.NewInternal(err))
		return
	}

	writeJSON(w, http.StatusCreated, project)
}

func (h *ProjectHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		userID = "all"
	}

	projects, err := h.repo.List(userID)
	if err != nil {
		slog.Error("Failed to list projects", "error", err)
		writeError(w, errors.NewInternal(err))
		return
	}

	writeJSON(w, http.StatusOK, projects)
}

func (h *ProjectHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		writeError(w, errors.NewBadRequest("id is required"))
		return
	}

	project, err := h.repo.GetByID(id)
	if err != nil {
		slog.Error("Failed to get project", "error", err)
		writeError(w, errors.NewInternal(err))
		return
	}

	if project == nil {
		writeError(w, errors.NewNotFound("project", id))
		return
	}

	writeJSON(w, http.StatusOK, project)
}

func (h *ProjectHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		writeError(w, errors.NewBadRequest("id is required"))
		return
	}

	existing, err := h.repo.GetByID(id)
	if err != nil {
		slog.Error("Failed to get project", "error", err)
		writeError(w, errors.NewInternal(err))
		return
	}
	if existing == nil {
		writeError(w, errors.NewNotFound("project", id))
		return
	}

	var req CreateProjectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		slog.Error("Failed to decode request body", "error", err)
		writeError(w, errors.NewBadRequest("invalid request body"))
		return
	}

	if req.Name != "" {
		existing.Name = req.Name
	}
	if req.Description != "" {
		existing.Description = req.Description
	}
	if req.Topology != nil {
		existing.Topology = req.Topology
	}

	if err := h.repo.Update(existing); err != nil {
		slog.Error("Failed to update project", "error", err)
		writeError(w, errors.NewInternal(err))
		return
	}

	writeJSON(w, http.StatusOK, existing)
}

func (h *ProjectHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		writeError(w, errors.NewBadRequest("id is required"))
		return
	}

	if err := h.repo.Delete(id); err != nil {
		slog.Error("Failed to delete project", "error", err)
		writeError(w, errors.NewInternal(err))
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
