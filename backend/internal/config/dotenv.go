package config

import (
	"bufio"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// LoadEnvFromDefaultFiles loads env vars from repo-level .env first,
// then falls back to backend-level .env for backward compatibility.
// Existing process environment variables always take precedence.
func LoadEnvFromDefaultFiles() ([]string, error) {
	return LoadEnvFromFiles(
		"../.env.local",
		"../.env",
		"../backend/.env.local",
		"../backend/.env",
		".env.local",
		".env",
		"backend/.env.local",
		"backend/.env",
	)
}

// LoadEnvFromFiles loads env vars from the given file list in order.
// The first value wins: if a key already exists in process env, it will not be overwritten.
func LoadEnvFromFiles(paths ...string) ([]string, error) {
	seen := make(map[string]struct{}, len(paths))
	loaded := make([]string, 0, len(paths))
	var loadErrs []error

	for _, path := range paths {
		cleanPath := filepath.Clean(path)
		if _, ok := seen[cleanPath]; ok {
			continue
		}
		seen[cleanPath] = struct{}{}

		err := loadEnvFile(cleanPath)
		if err == nil {
			loaded = append(loaded, cleanPath)
			continue
		}
		if errors.Is(err, os.ErrNotExist) {
			continue
		}
		loadErrs = append(loadErrs, fmt.Errorf("%s: %w", cleanPath, err))
	}

	return loaded, errors.Join(loadErrs...)
}

func loadEnvFile(path string) error {
	file, err := os.Open(path)
	if err != nil {
		return err
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		if strings.HasPrefix(line, "export ") {
			line = strings.TrimSpace(strings.TrimPrefix(line, "export "))
		}

		separator := strings.IndexRune(line, '=')
		if separator <= 0 {
			continue
		}

		key := strings.TrimSpace(line[:separator])
		if key == "" {
			continue
		}

		if _, exists := os.LookupEnv(key); exists {
			continue
		}

		value := strings.TrimSpace(line[separator+1:])
		value = normalizeEnvValue(value)
		if err := os.Setenv(key, value); err != nil {
			return err
		}
	}

	return scanner.Err()
}

func normalizeEnvValue(value string) string {
	if len(value) >= 2 {
		if strings.HasPrefix(value, "\"") && strings.HasSuffix(value, "\"") {
			return strings.TrimSuffix(strings.TrimPrefix(value, "\""), "\"")
		}
		if strings.HasPrefix(value, "'") && strings.HasSuffix(value, "'") {
			return strings.TrimSuffix(strings.TrimPrefix(value, "'"), "'")
		}
	}

	commentStart := strings.Index(value, " #")
	if commentStart >= 0 {
		return strings.TrimSpace(value[:commentStart])
	}

	return value
}
