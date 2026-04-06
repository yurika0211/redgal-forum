package platform

import (
	"errors"

	"example.com/rubedo/backend/internal/config"
	"example.com/rubedo/backend/internal/platform/cache"
	"example.com/rubedo/backend/internal/platform/database"
	"example.com/rubedo/backend/internal/platform/search"
)

type Platform struct {
	Postgres *database.Client
	Redis    *cache.Client
	Search   *search.Client
}

func New(cfg config.Config) (*Platform, error) {
	postgres, err := database.New(cfg.Postgres)
	if err != nil {
		return nil, err
	}

	redisClient, err := cache.New(cfg.Redis)
	if err != nil {
		return nil, err
	}

	searchClient, err := search.New(cfg.Meilisearch)
	if err != nil {
		return nil, err
	}

	return &Platform{
		Postgres: postgres,
		Redis:    redisClient,
		Search:   searchClient,
	}, nil
}

func (p *Platform) Close() error {
	if p == nil {
		return nil
	}

	var errs []error

	if p.Postgres != nil {
		errs = append(errs, p.Postgres.Close())
	}
	if p.Redis != nil {
		errs = append(errs, p.Redis.Close())
	}
	if p.Search != nil {
		errs = append(errs, p.Search.Close())
	}

	return errors.Join(errs...)
}
