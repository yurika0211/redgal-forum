package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	App         AppConfig
	HTTP        HTTPConfig
	Auth        AuthConfig
	Postgres    PostgresConfig
	Redis       RedisConfig
	RabbitMQ    RabbitMQConfig
	Meilisearch MeilisearchConfig
}

type AppConfig struct {
	Name string
	Env  string
}

type HTTPConfig struct {
	Host string
	Port int
}

type AuthConfig struct {
	JWTSecret             string
	AllowDebugHeaders     bool
	AllowScaffoldLogin    bool
	ScaffoldLoginPassword string
}

type PostgresConfig struct {
	DSN string
}

type RedisConfig struct {
	Addr     string
	Password string
	DB       int
}

type RabbitMQConfig struct {
	URL string
}

type MeilisearchConfig struct {
	URL    string
	APIKey string
}

func Load() Config {
	appEnv := getEnv("APP_ENV", "development")

	return Config{
		App: AppConfig{
			Name: getEnv("APP_NAME", "rubedo-backend"),
			Env:  appEnv,
		},
		HTTP: HTTPConfig{
			Host: getEnv("HTTP_HOST", "0.0.0.0"),
			Port: getEnvInt("HTTP_PORT", 8080),
		},
		Auth: AuthConfig{
			JWTSecret:             getEnv("AUTH_JWT_SECRET", "replace-me"),
			AllowDebugHeaders:     getEnvBool("AUTH_ALLOW_DEBUG_HEADERS", false),
			AllowScaffoldLogin:    getEnvBool("AUTH_ALLOW_SCAFFOLD_LOGIN", appEnv == "development"),
			ScaffoldLoginPassword: getEnv("AUTH_SCAFFOLD_LOGIN_PASSWORD", "dev-password-change-me"),
		},
		Postgres: PostgresConfig{
			DSN: strings.TrimSpace(os.Getenv("POSTGRES_DSN")),
		},
		Redis: RedisConfig{
			Addr:     getEnv("REDIS_ADDR", ""),
			Password: os.Getenv("REDIS_PASSWORD"),
			DB:       getEnvInt("REDIS_DB", 0),
		},
		RabbitMQ: RabbitMQConfig{
			URL: strings.TrimSpace(os.Getenv("RABBITMQ_URL")),
		},
		Meilisearch: MeilisearchConfig{
			URL:    getEnv("MEILISEARCH_URL", ""),
			APIKey: os.Getenv("MEILISEARCH_API_KEY"),
		},
	}
}

func (c HTTPConfig) Address() string {
	return fmt.Sprintf("%s:%d", c.Host, c.Port)
}

func getEnv(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}

	return value
}

func getEnvInt(key string, fallback int) int {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}

	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}

	return parsed
}

func getEnvBool(key string, fallback bool) bool {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}

	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return fallback
	}

	return parsed
}
