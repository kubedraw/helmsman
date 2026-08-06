package main

import (
	"log/slog"
	"net/http"

	"github.com/kubedraw/helmsman/backend/shared/config"
	"github.com/kubedraw/helmsman/backend/shared/logger"
	"github.com/kubedraw/helmsman/backend/shared/middleware"
	"github.com/kubedraw/helmsman/backend/provisioner/handler"
)

func main() {
	cfg := config.Load()
	log := logger.New(cfg.Env)

	log.Info("Starting provisioner service",
		slog.String("app", cfg.AppName),
		slog.String("version", cfg.AppVersion),
		slog.String("env", cfg.Env),
	)

	provisionerHandler := handler.NewProvisionerHandler()

	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok","service":"provisioner"}`))
	})

	mux.HandleFunc("POST /generate", provisionerHandler.Generate)

	handler := middleware.RequestIDMiddleware()(mux)
	handler = middleware.LoggerMiddleware(log)(handler)
	handler = middleware.CORSMiddleware()(handler)

	addr := ":8083"
	log.Info("Server starting", "address", addr)

	if err := http.ListenAndServe(addr, handler); err != nil {
		log.Error("Server failed", "error", err)
	}
}
