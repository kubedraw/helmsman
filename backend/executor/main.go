package main

import (
	"log/slog"
	"net/http"

	"github.com/kubedraw/helmsman/backend/shared/config"
	"github.com/kubedraw/helmsman/backend/shared/logger"
	"github.com/kubedraw/helmsman/backend/shared/middleware"
	"github.com/kubedraw/helmsman/backend/executor/handler"
)

func main() {
	cfg := config.Load()
	log := logger.New(cfg.Env)

	log.Info("Starting executor service",
		slog.String("app", cfg.AppName),
		slog.String("version", cfg.AppVersion),
		slog.String("env", cfg.Env),
	)

	executorHandler := handler.NewExecutorHandler()

	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok","service":"executor"}`))
	})

	mux.HandleFunc("POST /apply", executorHandler.Apply)

	handler := middleware.RequestIDMiddleware()(mux)
	handler = middleware.LoggerMiddleware(log)(handler)
	handler = middleware.CORSMiddleware()(handler)

	addr := ":8084"
	log.Info("Server starting", "address", addr)

	if err := http.ListenAndServe(addr, handler); err != nil {
		log.Error("Server failed", "error", err)
	}
}
