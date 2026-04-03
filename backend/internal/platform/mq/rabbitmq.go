package mq

import (
	"strings"

	"example.com/rubedo/backend/internal/config"
)

type Client struct {
	URL string
}

func New(cfg config.RabbitMQConfig) (*Client, error) {
	if strings.TrimSpace(cfg.URL) == "" {
		return nil, nil
	}

	return &Client{URL: cfg.URL}, nil
}

func (c *Client) Close() error {
	return nil
}
