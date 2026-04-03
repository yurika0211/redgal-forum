package database

import (
	"context"
	"database/sql"
	"strings"
	"time"

	"example.com/rubedo/backend/internal/config"
	_ "github.com/jackc/pgx/v5/stdlib"
)

type Client struct {
	DB *sql.DB
}

func New(cfg config.PostgresConfig) (*Client, error) {
	if strings.TrimSpace(cfg.DSN) == "" {
		return nil, nil
	}

	db, err := sql.Open("pgx", cfg.DSN)
	if err != nil {
		return nil, err
	}

	db.SetConnMaxLifetime(30 * time.Minute)
	db.SetMaxIdleConns(5)
	db.SetMaxOpenConns(10)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		_ = db.Close()
		return nil, err
	}

	return &Client{DB: db}, nil
}

func (c *Client) Close() error {
	if c == nil || c.DB == nil {
		return nil
	}

	return c.DB.Close()
}

func (c *Client) QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error) {
	if c == nil || c.DB == nil {
		return nil, sql.ErrConnDone
	}

	return c.DB.QueryContext(ctx, query, args...)
}

func (c *Client) QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row {
	if c == nil || c.DB == nil {
		return &sql.Row{}
	}

	return c.DB.QueryRowContext(ctx, query, args...)
}

func (c *Client) ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error) {
	if c == nil || c.DB == nil {
		return nil, sql.ErrConnDone
	}

	return c.DB.ExecContext(ctx, query, args...)
}

func (c *Client) BeginTx(ctx context.Context, options *sql.TxOptions) (*sql.Tx, error) {
	if c == nil || c.DB == nil {
		return nil, sql.ErrConnDone
	}

	return c.DB.BeginTx(ctx, options)
}

func (c *Client) PingContext(ctx context.Context) error {
	if c == nil || c.DB == nil {
		return sql.ErrConnDone
	}

	return c.DB.PingContext(ctx)
}

func (c *Client) Available() bool {
	return c != nil && c.DB != nil
}
