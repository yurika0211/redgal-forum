package search

import (
	"context"
	"net/http"
	"strings"

	"example.com/rubedo/backend/internal/config"
)

type Client struct {
	Client *http.Client
	URL    string
}

func New(cfg config.MeilisearchConfig) (*Client, error) {
	if strings.TrimSpace(cfg.URL) == "" {
		return nil, nil
	}

	return &Client{
		Client: &http.Client{},
		URL:    cfg.URL,
	}, nil
}

func (c *Client) Close() error {
	return nil
}

func (c *Client) PingContext(ctx context.Context) error {
	if c == nil || strings.TrimSpace(c.URL) == "" {
		return http.ErrServerClosed
	}

	request, err := http.NewRequestWithContext(ctx, http.MethodGet, strings.TrimRight(c.URL, "/")+"/health", nil)
	if err != nil {
		return err
	}

	response, err := c.Client.Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()

	if response.StatusCode >= http.StatusBadRequest {
		return &http.ProtocolError{ErrorString: response.Status}
	}

	return nil
}

func (c *Client) Available() bool {
	return c != nil && strings.TrimSpace(c.URL) != ""
}
