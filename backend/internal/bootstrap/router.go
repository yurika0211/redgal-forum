package bootstrap

import (
	"log/slog"
	"net/http"
	"time"

	"example.com/rubedo/backend/internal/config"
	"example.com/rubedo/backend/internal/http/router"
	"example.com/rubedo/backend/internal/modules/activity"
	"example.com/rubedo/backend/internal/modules/article"
	"example.com/rubedo/backend/internal/modules/auth"
	"example.com/rubedo/backend/internal/modules/forum"
	"example.com/rubedo/backend/internal/modules/health"
	"example.com/rubedo/backend/internal/modules/luckybot"
	"example.com/rubedo/backend/internal/modules/sitecontent"
	"example.com/rubedo/backend/internal/modules/user"
	"example.com/rubedo/backend/internal/modules/wall"
	"example.com/rubedo/backend/internal/platform"
	platformcache "example.com/rubedo/backend/internal/platform/cache"
)

func NewAPIHandler(cfg config.Config, logger *slog.Logger, infra *platform.Platform) http.Handler {
	forumService := forum.NewService(
		forum.NewRepository(infra),
		platformcache.NewMultiLevel("forum", infra.Redis),
	).ConfigureSnapshotCache(forum.SnapshotCacheOptions{
		Enabled: cfg.Cache.ForumSnapshotEnabled,
		TTL:     time.Duration(cfg.Cache.ForumSnapshotTTLSeconds) * time.Second,
	})

	siteContentService := sitecontent.NewService(
		sitecontent.NewRepository(infra),
		platformcache.NewMultiLevel("site-content", infra.Redis),
	).ConfigureCache(sitecontent.CacheOptions{
		Enabled: cfg.Cache.SiteContentEnabled,
		TTL:     time.Duration(cfg.Cache.SiteContentTTLSeconds) * time.Second,
	})

	deps := router.Dependencies{
		Config:          cfg,
		Logger:          logger,
		HealthHandler:   health.NewHandler(cfg, infra),
		AuthHandler:     auth.NewHandler(auth.NewService(auth.NewRepository(infra, cfg.Auth))),
		UserHandler:     user.NewHandler(user.NewService(user.NewRepository(infra))),
		ActivityHandler: activity.NewHandler(activity.NewService(activity.NewRepository(infra))),
		ArticleHandler:  article.NewHandler(article.NewService(article.NewRepository(infra))),
		ForumHandler:    forum.NewHandler(forumService),
		SiteHandler:     sitecontent.NewHandler(siteContentService),
		WallHandler:     wall.NewHandler(wall.NewService(wall.NewRepository(infra))),
		Luckybot:        luckybot.NewHandler(luckybot.NewService(luckybot.NewRepository(infra))),
	}

	return router.New(deps)
}
