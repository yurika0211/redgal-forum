package database

import (
	"strings"

	"example.com/rubedo/backend/internal/config"
)

type Client struct {
	DSN string
}

func New(cfg config.PostgresConfig) (*Client, error) {
	if strings.TrimSpace(cfg.DSN) == "" {
		return nil, nil
	}

	return &Client{DSN: cfg.DSN}, nil
}

func (c *Client) Close() error {
	return nil
}
