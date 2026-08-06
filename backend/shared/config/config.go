package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	AppName    string
	AppVersion string
	Env        string
	Port       int
	DBHost     string
	DBPort     int
	DBUser     string
	DBPassword string
	DBName     string
	RedisHost  string
	RedisPort  int
	JWTSecret  string
	JWTExpiry  time.Duration
}

func Load() *Config {
	return &Config{
		AppName:    getEnv("APP_NAME", "helmsman"),
		AppVersion: getEnv("APP_VERSION", "1.0.0"),
		Env:        getEnv("ENV", "development"),
		Port:       getEnvAsInt("PORT", 8080),
		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnvAsInt("DB_PORT", 5432),
		DBUser:     getEnv("DB_USER", "helmsman"),
		DBPassword: getEnv("DB_PASSWORD", "helmsman"),
		DBName:     getEnv("DB_NAME", "helmsman"),
		RedisHost:  getEnv("REDIS_HOST", "localhost"),
		RedisPort:  getEnvAsInt("REDIS_PORT", 6379),
		JWTSecret:  getEnv("JWT_SECRET", "change-me-in-production"),
		JWTExpiry:  getEnvAsDuration("JWT_EXPIRY", 24*time.Hour),
	}
}


func getEnv(key, defaultVal string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultVal
}

func getEnvAsInt(key string, defaultVal int) int {
	if v := os.Getenv(key); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			return i
		}
	}
	return defaultVal
}

func getEnvAsDuration(key string, defaultVal time.Duration) time.Duration {
	if v := os.Getenv(key); v != "" {
		if d, err := time.ParseDuration(v); err == nil {
			return d
		}
	}
	return defaultVal
}
