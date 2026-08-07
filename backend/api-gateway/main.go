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

	authURL, _ := url.Parse("http://helmsman-auth:8081")
	authProxy := httputil.NewSingleHostReverseProxy(authURL)

	storageURL, _ := url.Parse("http://helmsman-storage:8080")
	storageProxy := httputil.NewSingleHostReverseProxy(storageURL)

	topologyURL, _ := url.Parse("http://helmsman-topology:8082")
	topologyProxy := httputil.NewSingleHostReverseProxy(topologyURL)

	provisionerURL, _ := url.Parse("http://helmsman-provisioner:8083")
	provisionerProxy := httputil.NewSingleHostReverseProxy(provisionerURL)

	executorURL, _ := url.Parse("http://helmsman-executor:8084")
	executorProxy := httputil.NewSingleHostReverseProxy(executorURL)

	catalogURL, _ := url.Parse("http://helmsman-catalog:8085")
	catalogProxy := httputil.NewSingleHostReverseProxy(catalogURL)

	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok","service":"api-gateway"}`))
	})

	// Auth (без JWT)
	mux.HandleFunc("/auth/", func(w http.ResponseWriter, r *http.Request) {
		log.Info("Proxying auth request", "method", r.Method, "path", r.URL.Path)
		authProxy.ServeHTTP(w, r)
	})

	authMiddleware := middleware.AuthMiddleware(cfg.JWTSecret)

	mux.Handle("/projects", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Info("Proxying storage request", "method", r.Method, "path", r.URL.Path)
		storageProxy.ServeHTTP(w, r)
	})))
	mux.Handle("/projects/", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Info("Proxying storage request", "method", r.Method, "path", r.URL.Path)
		storageProxy.ServeHTTP(w, r)
	})))

	mux.Handle("/validate", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Info("Proxying topology request", "method", r.Method, "path", r.URL.Path)
		topologyProxy.ServeHTTP(w, r)
	})))
	mux.Handle("/analyze", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Info("Proxying topology request", "method", r.Method, "path", r.URL.Path)
		topologyProxy.ServeHTTP(w, r)
	})))

	mux.Handle("/generate", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Info("Proxying provisioner request", "method", r.Method, "path", r.URL.Path)
		provisionerProxy.ServeHTTP(w, r)
	})))

	mux.Handle("/apply", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Info("Proxying executor request", "method", r.Method, "path", r.URL.Path)
		executorProxy.ServeHTTP(w, r)
	})))

	// Catalog — открытый (без JWT)
	mux.HandleFunc("/catalog", func(w http.ResponseWriter, r *http.Request) {
		log.Info("Proxying catalog request", "method", r.Method, "path", r.URL.Path)
		catalogProxy.ServeHTTP(w, r)
	})

	handler := middleware.RequestIDMiddleware()(mux)
	handler = middleware.LoggerMiddleware(log)(handler)
	handler = middleware.CORSMiddleware()(handler)

	addr := ":8000"
	log.Info("Gateway starting", "address", addr)

	if err := http.ListenAndServe(addr, handler); err != nil {
		log.Error("Gateway failed", "error", err)
	}
}
