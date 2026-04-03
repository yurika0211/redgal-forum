package cache

import (
	"context"
	"fmt"
	"net"
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

func (c *Client) PingContext(ctx context.Context) error {
	if c == nil || strings.TrimSpace(c.Addr) == "" {
		return net.ErrClosed
	}

	dialer := &net.Dialer{}
	conn, err := dialer.DialContext(ctx, "tcp", c.Addr)
	if err != nil {
		return err
	}
	defer conn.Close()
	if deadline, ok := ctx.Deadline(); ok {
		_ = conn.SetDeadline(deadline)
	}

	if _, err := fmt.Fprint(conn, "*1\r\n$4\r\nPING\r\n"); err != nil {
		return err
	}

	buffer := make([]byte, 7)
	_, err = conn.Read(buffer)
	return err
}

func (c *Client) Available() bool {
	return c != nil && strings.TrimSpace(c.Addr) != ""
}
