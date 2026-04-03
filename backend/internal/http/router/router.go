package router

import (
	"log/slog"

	"example.com/rubedo/backend/internal/config"
	"example.com/rubedo/backend/internal/middleware"
	"example.com/rubedo/backend/internal/modules/article"
	"example.com/rubedo/backend/internal/modules/auth"
	"example.com/rubedo/backend/internal/modules/forum"
	"example.com/rubedo/backend/internal/modules/health"
	"example.com/rubedo/backend/internal/modules/luckybot"
	"example.com/rubedo/backend/internal/modules/user"
	"example.com/rubedo/backend/internal/modules/wall"
	"example.com/rubedo/backend/internal/security"
	"github.com/gin-gonic/gin"
)

type Dependencies struct {
	Config         config.Config
	Logger         *slog.Logger
	HealthHandler  *health.Handler
	AuthHandler    *auth.Handler
	UserHandler    *user.Handler
	ArticleHandler *article.Handler
	ForumHandler   *forum.Handler
	WallHandler    *wall.Handler
	Luckybot       *luckybot.Handler
}

func New(deps Dependencies) *gin.Engine {
	if deps.Config.App.Env != "development" {
		gin.SetMode(gin.ReleaseMode)
	}

	engine := gin.New()
	engine.Use(gin.Logger())
	engine.Use(middleware.RequestID())
	engine.Use(middleware.Recovery())

	api := engine.Group("/api/v1")
	api.GET("/health", deps.HealthHandler.Get)
	api.Use(middleware.OptionalAuth(deps.Config.Auth))

	registerAuthRoutes(api, deps)
	registerUserRoutes(api, deps)
	registerArticleRoutes(api, deps)
	registerForumRoutes(api, deps)
	registerWallRoutes(api, deps)
	registerLuckybotRoutes(api, deps)

	return engine
}

func registerAuthRoutes(api *gin.RouterGroup, deps Dependencies) {
	group := api.Group("/auth")
	group.POST("/register", deps.AuthHandler.Register)
	group.POST("/login", deps.AuthHandler.Login)
	group.POST("/logout", middleware.RequireAuthenticated(), deps.AuthHandler.Logout)
}

func registerUserRoutes(api *gin.RouterGroup, deps Dependencies) {
	group := api.Group("/users")
	group.GET("/:username", deps.UserHandler.GetProfile)

	member := group.Group("")
	member.Use(middleware.RequireAuthenticated())
	member.GET("/me", deps.UserHandler.GetMe)
	member.PATCH("/me", deps.UserHandler.UpdateMe)
	member.POST("/me/bangumi/import", deps.UserHandler.ImportBangumi)
}

func registerArticleRoutes(api *gin.RouterGroup, deps Dependencies) {
	group := api.Group("/articles")
	group.GET("", deps.ArticleHandler.List)
	group.GET("/:articleID", deps.ArticleHandler.Get)

	member := group.Group("")
	member.Use(middleware.RequireAuthenticated(), middleware.RateLimit("member-write"))
	member.POST("", deps.ArticleHandler.Create)
	member.PATCH("/:articleID", deps.ArticleHandler.Update)
}

func registerForumRoutes(api *gin.RouterGroup, deps Dependencies) {
	group := api.Group("/forum")
	group.GET("/threads", deps.ForumHandler.ListThreads)
	group.GET("/threads/:threadID", deps.ForumHandler.GetThread)

	member := group.Group("")
	member.Use(middleware.RequireAuthenticated(), middleware.RateLimit("forum-write"))
	member.POST("/threads", deps.ForumHandler.CreateThread)
	member.POST("/threads/:threadID/replies", deps.ForumHandler.CreateReply)
}

func registerWallRoutes(api *gin.RouterGroup, deps Dependencies) {
	group := api.Group("/wall")
	group.GET("", deps.WallHandler.List)

	member := group.Group("")
	member.Use(middleware.RequireAuthenticated(), middleware.RateLimit("wall-submit"))
	member.POST("/submissions", deps.WallHandler.CreateSubmission)

	moderation := group.Group("")
	moderation.Use(
		middleware.RequireAuthenticated(),
		middleware.RequireRoles(security.RoleModerator, security.RoleAdmin, security.RoleSuperAdmin),
	)
	moderation.POST("/submissions/:submissionID/review", deps.WallHandler.ReviewSubmission)
}

func registerLuckybotRoutes(api *gin.RouterGroup, deps Dependencies) {
	group := api.Group("/luckybot")
	group.Use(middleware.RequireAuthenticated(), middleware.RateLimit("chat"))
	group.POST("/chat", deps.Luckybot.Chat)

	admin := api.Group("/admin/luckybot")
	admin.Use(middleware.RequireAuthenticated(), middleware.RequireRoles(security.RoleAdmin, security.RoleSuperAdmin))
	admin.POST("/reload", deps.Luckybot.ReloadPersona)
}
