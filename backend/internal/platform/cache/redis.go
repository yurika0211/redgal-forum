package cache

import (
	"strings"

	"example.com/rubedo/backend/internal/config"
)

type Client struct {
	Addr string
	DB   int
}

func New(cfg config.RedisConfig) (*Client, error) {
	if strings.TrimSpace(cfg.Addr) == "" {
		return nil, nil
	}

	return &Client{
		Addr: cfg.Addr,
		DB:   cfg.DB,
	}, nil
}

func (c *Client) Close() error {
	return nil
}
