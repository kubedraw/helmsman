package handler

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/kubedraw/helmsman/backend/auth/repository"
	"github.com/kubedraw/helmsman/backend/shared/config"
	"github.com/kubedraw/helmsman/backend/shared/errors"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	repo repository.UserRepository
	cfg  *config.Config
}

func NewAuthHandler(repo repository.UserRepository, cfg *config.Config) *AuthHandler {
	return &AuthHandler{repo: repo, cfg: cfg}
}

type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Token string `json:"token"`
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, errors.NewBadRequest("invalid request body"))
		return
	}

	if req.Email == "" || req.Password == "" {
		writeError(w, errors.NewBadRequest("email and password are required"))
		return
	}

	// Проверка, что пользователь не существует
	existing, err := h.repo.GetByEmail(req.Email)
	if err != nil {
		slog.Error("Failed to check user", "error", err)
		writeError(w, errors.NewInternal(err))
		return
	}
	if existing != nil {
		writeError(w, errors.NewConflict("user already exists"))
		return
	}

	// Хеширование пароля
	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		slog.Error("Failed to hash password", "error", err)
		writeError(w, errors.NewInternal(err))
		return
	}

	user := &repository.User{
		ID:       uuid.New().String(),
		Email:    req.Email,
		Password: string(hashed),
		Role:     "viewer",
	}

	if err := h.repo.Create(user); err != nil {
		slog.Error("Failed to create user", "error", err)
		writeError(w, errors.NewInternal(err))
		return
	}

	writeJSON(w, http.StatusCreated, map[string]string{
		"id":    user.ID,
		"email": user.Email,
		"role":  user.Role,
	})
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, errors.NewBadRequest("invalid request body"))
		return
	}

	if req.Email == "" || req.Password == "" {
		writeError(w, errors.NewBadRequest("email and password are required"))
		return
	}

	user, err := h.repo.GetByEmail(req.Email)
	if err != nil {
		slog.Error("Failed to get user", "error", err)
		writeError(w, errors.NewInternal(err))
		return
	}
	if user == nil {
		writeError(w, errors.NewUnauthorized("invalid credentials"))
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		writeError(w, errors.NewUnauthorized("invalid credentials"))
		return
	}

	// Создаём JWT
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": user.ID,
		"email":   user.Email,
		"role":    user.Role,
		"exp":     time.Now().Add(h.cfg.JWTExpiry).Unix(),
	})

	tokenString, err := token.SignedString([]byte(h.cfg.JWTSecret))
	if err != nil {
		slog.Error("Failed to sign token", "error", err)
		writeError(w, errors.NewInternal(err))
		return
	}

	writeJSON(w, http.StatusOK, LoginResponse{Token: tokenString})
}
