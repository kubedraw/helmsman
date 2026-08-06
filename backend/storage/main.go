package main

import (
	"database/sql"
	"fmt"
	"log/slog"
	"net/http"
	"os"

	"github.com/kubedraw/helmsman/backend/shared/config"
	"github.com/kubedraw/helmsman/backend/shared/logger"
	"github.com/kubedraw/helmsman/backend/shared/middleware"
	"github.com/kubedraw/helmsman/backend/storage/handler"
	"github.com/kubedraw/helmsman/backend/storage/repository"

	_ "github.com/lib/pq"
)

func main() {
	cfg := config.Load()
	log := logger.New(cfg.Env)
	log.Info("Starting storage service",
		slog.String("app", cfg.AppName),
		slog.String("version", cfg.AppVersion),
		slog.String("env", cfg.Env),
	)

	connStr := fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=disable",
		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName,
	)

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Error("Failed to connect to database", slog.Any("error", err))
		os.Exit(1)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Error("Database ping failed", slog.Any("error", err))
		os.Exit(1)
	}
	log.Info("Connected to PostgreSQL")

	projectRepo := repository.NewProjectRepository(db)
	projectHandler := handler.NewProjectHandler(projectRepo)

	mux := http.NewServeMux()

	// Health
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})

	// Проекты
	mux.HandleFunc("POST /projects", projectHandler.Create)
	mux.HandleFunc("GET /projects", projectHandler.List)
	mux.HandleFunc("GET /projects/{id}", projectHandler.GetByID)
	mux.HandleFunc("PUT /projects/{id}", projectHandler.Update)
	mux.HandleFunc("DELETE /projects/{id}", projectHandler.Delete)

	// Middleware
	handler := middleware.RequestIDMiddleware()(mux)
	handler = middleware.LoggerMiddleware(log)(handler)
	handler = middleware.CORSMiddleware()(handler)

	addr := fmt.Sprintf(":%d", cfg.Port)
	log.Info("Server starting", slog.String("address", addr))

	if err := http.ListenAndServe(addr, handler); err != nil {
		log.Error("Server failed", slog.Any("error", err))
		os.Exit(1)
	}
}
