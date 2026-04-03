package mq

import (
	"context"
	"net"
	"net/url"
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

func (c *Client) PingContext(ctx context.Context) error {
	if c == nil || strings.TrimSpace(c.URL) == "" {
		return net.ErrClosed
	}

	parsed, err := url.Parse(c.URL)
	if err != nil {
		return err
	}

	address := parsed.Host
	if parsed.Port() == "" {
		address = net.JoinHostPort(parsed.Hostname(), "5672")
	}

	dialer := &net.Dialer{}
	conn, err := dialer.DialContext(ctx, "tcp", address)
	if err != nil {
		return err
	}
	return conn.Close()
}

func (c *Client) Available() bool {
	return c != nil && strings.TrimSpace(c.URL) != ""
}
