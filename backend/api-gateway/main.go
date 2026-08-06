package main

import (
	"log/slog"
	"net/http"
	"net/http/httputil"
	"net/url"

	"github.com/kubedraw/helmsman/backend/shared/config"
	"github.com/kubedraw/helmsman/backend/shared/logger"
	"github.com/kubedraw/helmsman/backend/shared/middleware"
)

func main() {
	cfg := config.Load()
	log := logger.New(cfg.Env)

	log.Info("Starting API Gateway",
		slog.String("app", cfg.AppName),
		slog.String("version", cfg.AppVersion),
		slog.String("env", cfg.Env),
	)

	authURL, _ := url.Parse("http://localhost:8081")
	authProxy := httputil.NewSingleHostReverseProxy(authURL)

	storageURL, _ := url.Parse("http://localhost:8080")
	storageProxy := httputil.NewSingleHostReverseProxy(storageURL)

	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok","service":"api-gateway"}`))
	})

	mux.HandleFunc("/auth/", func(w http.ResponseWriter, r *http.Request) {
		log.Info("Proxying auth request", "method", r.Method, "path", r.URL.Path)
		authProxy.ServeHTTP(w, r)
	})

	authMiddleware := middleware.AuthMiddleware(cfg.JWTSecret)
	mux.Handle("/projects/", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Info("Proxying storage request", "method", r.Method, "path", r.URL.Path)
		storageProxy.ServeHTTP(w, r)
	})))

	mux.Handle("/projects", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Info("Proxying storage request", "method", r.Method, "path", r.URL.Path)
		storageProxy.ServeHTTP(w, r)
	})))

	handler := middleware.RequestIDMiddleware()(mux)
	handler = middleware.LoggerMiddleware(log)(handler)
	handler = middleware.CORSMiddleware()(handler)

	addr := ":8000"
	log.Info("Gateway starting", "address", addr)

	if err := http.ListenAndServe(addr, handler); err != nil {
		log.Error("Gateway failed", "error", err)
	}
}
