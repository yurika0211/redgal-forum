package cache

import (
	"bufio"
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"net"
	"strconv"
	"strings"
	"time"

	"example.com/rubedo/backend/internal/config"
)

const defaultRedisIOTimeout = 2 * time.Second

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

	resp, err := c.exec(ctx, []byte("PING"))
	if err != nil {
		return err
	}
	if resp.kind != '+' || !strings.EqualFold(string(resp.data), "PONG") {
		return fmt.Errorf("unexpected redis ping response: %q", resp.data)
	}

	return nil
}

func (c *Client) SetEX(ctx context.Context, key string, value []byte, ttl time.Duration) error {
	if c == nil || strings.TrimSpace(c.Addr) == "" {
		return net.ErrClosed
	}
	if ttl <= 0 {
		return fmt.Errorf("ttl must be positive")
	}

	seconds := int(ttl / time.Second)
	if seconds < 1 {
		seconds = 1
	}

	_, err := c.exec(
		ctx,
		[]byte("SET"),
		[]byte(key),
		value,
		[]byte("EX"),
		[]byte(strconv.Itoa(seconds)),
	)
	return err
}

func (c *Client) Get(ctx context.Context, key string) ([]byte, bool, error) {
	if c == nil || strings.TrimSpace(c.Addr) == "" {
		return nil, false, net.ErrClosed
	}

	resp, err := c.exec(ctx, []byte("GET"), []byte(key))
	if err != nil {
		return nil, false, err
	}
	if resp.kind != '$' {
		return nil, false, fmt.Errorf("unexpected redis GET response type: %q", resp.kind)
	}
	if resp.data == nil {
		return nil, false, nil
	}

	return resp.data, true, nil
}

func (c *Client) Del(ctx context.Context, key string) error {
	if c == nil || strings.TrimSpace(c.Addr) == "" {
		return net.ErrClosed
	}

	_, err := c.exec(ctx, []byte("DEL"), []byte(key))
	return err
}

func (c *Client) Available() bool {
	return c != nil && strings.TrimSpace(c.Addr) != ""
}

type redisResponse struct {
	kind byte
	data []byte
}

func (c *Client) exec(ctx context.Context, args ...[]byte) (redisResponse, error) {
	if len(args) == 0 {
		return redisResponse{}, fmt.Errorf("redis command is required")
	}

	dialer := &net.Dialer{}
	conn, err := dialer.DialContext(ctx, "tcp", c.Addr)
	if err != nil {
		return redisResponse{}, err
	}
	defer conn.Close()

	if deadline, ok := ctx.Deadline(); ok {
		_ = conn.SetDeadline(deadline)
	} else {
		_ = conn.SetDeadline(time.Now().Add(defaultRedisIOTimeout))
	}

	if err := writeRESPCommand(conn, args...); err != nil {
		return redisResponse{}, err
	}

	reader := bufio.NewReader(conn)
	return readRESPResponse(reader)
}

func writeRESPCommand(w io.Writer, args ...[]byte) error {
	if _, err := fmt.Fprintf(w, "*%d\r\n", len(args)); err != nil {
		return err
	}

	for _, arg := range args {
		if _, err := fmt.Fprintf(w, "$%d\r\n", len(arg)); err != nil {
			return err
		}
		if _, err := w.Write(arg); err != nil {
			return err
		}
		if _, err := w.Write([]byte("\r\n")); err != nil {
			return err
		}
	}

	return nil
}

func readRESPResponse(reader *bufio.Reader) (redisResponse, error) {
	prefix, err := reader.ReadByte()
	if err != nil {
		return redisResponse{}, err
	}

	switch prefix {
	case '+':
		line, err := readRESPLine(reader)
		if err != nil {
			return redisResponse{}, err
		}
		return redisResponse{kind: prefix, data: []byte(line)}, nil
	case '-':
		line, err := readRESPLine(reader)
		if err != nil {
			return redisResponse{}, err
		}
		return redisResponse{}, errors.New(line)
	case ':':
		line, err := readRESPLine(reader)
		if err != nil {
			return redisResponse{}, err
		}
		return redisResponse{kind: prefix, data: []byte(line)}, nil
	case '$':
		line, err := readRESPLine(reader)
		if err != nil {
			return redisResponse{}, err
		}
		length, err := strconv.Atoi(line)
		if err != nil {
			return redisResponse{}, err
		}
		if length < 0 {
			return redisResponse{kind: prefix, data: nil}, nil
		}

		payload := make([]byte, length+2)
		if _, err := io.ReadFull(reader, payload); err != nil {
			return redisResponse{}, err
		}
		if !bytes.Equal(payload[length:], []byte("\r\n")) {
			return redisResponse{}, fmt.Errorf("invalid redis bulk string terminator")
		}

		return redisResponse{kind: prefix, data: payload[:length]}, nil
	default:
		return redisResponse{}, fmt.Errorf("unsupported redis response prefix: %q", prefix)
	}
}

func readRESPLine(reader *bufio.Reader) (string, error) {
	line, err := reader.ReadString('\n')
	if err != nil {
		return "", err
	}

	return strings.TrimSuffix(strings.TrimSuffix(line, "\n"), "\r"), nil
}
