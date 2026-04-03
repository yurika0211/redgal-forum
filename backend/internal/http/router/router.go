package router

import (
	"log/slog"

	"example.com/rubedo/backend/internal/config"
	"example.com/rubedo/backend/internal/middleware"
	"example.com/rubedo/backend/internal/modules/activity"
	"example.com/rubedo/backend/internal/modules/article"
	"example.com/rubedo/backend/internal/modules/auth"
	"example.com/rubedo/backend/internal/modules/forum"
	"example.com/rubedo/backend/internal/modules/health"
	"example.com/rubedo/backend/internal/modules/luckybot"
	"example.com/rubedo/backend/internal/modules/sitecontent"
	"example.com/rubedo/backend/internal/modules/user"
	"example.com/rubedo/backend/internal/modules/wall"
	"example.com/rubedo/backend/internal/security"
	"github.com/gin-gonic/gin"
)

type Dependencies struct {
	Config          config.Config
	Logger          *slog.Logger
	HealthHandler   *health.Handler
	AuthHandler     *auth.Handler
	UserHandler     *user.Handler
	ActivityHandler *activity.Handler
	ArticleHandler  *article.Handler
	ForumHandler    *forum.Handler
	SiteHandler     *sitecontent.Handler
	WallHandler     *wall.Handler
	Luckybot        *luckybot.Handler
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
	registerAdminUserRoutes(api, deps)
	registerActivityRoutes(api, deps)
	registerArticleRoutes(api, deps)
	registerForumRoutes(api, deps)
	registerSiteRoutes(api, deps)
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
	member.Use(middleware.RequireAuthenticated(), middleware.RequireVerifiedUser())
	member.GET("/me", deps.UserHandler.GetMe)
	member.PATCH("/me", deps.UserHandler.UpdateMe)
	member.POST("/me/bangumi/import", deps.UserHandler.ImportBangumi)
}

func registerAdminUserRoutes(api *gin.RouterGroup, deps Dependencies) {
	admin := api.Group("/admin")
	admin.Use(middleware.RequireAuthenticated(), middleware.RequireRoles(security.RoleAdmin, security.RoleSuperAdmin))
	admin.GET("/dashboard", deps.UserHandler.GetAdminDashboard)
	admin.GET("/users", deps.UserHandler.ListAdminUsers)
	admin.PATCH("/users/:userID/status", deps.UserHandler.UpdateUserStatus)
	admin.POST("/users/:userID/verification/reviews", deps.UserHandler.ReviewVerification)

	superAdmin := api.Group("/super-admin")
	superAdmin.Use(middleware.RequireAuthenticated(), middleware.RequireRoles(security.RoleSuperAdmin))
	superAdmin.GET("/dashboard", deps.UserHandler.GetSuperAdminDashboard)
}

func registerArticleRoutes(api *gin.RouterGroup, deps Dependencies) {
	group := api.Group("/articles")
	group.GET("", deps.ArticleHandler.List)
	group.GET("/:articleID", deps.ArticleHandler.Get)

	member := group.Group("")
	member.Use(middleware.RequireAuthenticated(), middleware.RequireVerifiedUser(), middleware.RateLimit("member-write"))
	member.POST("", deps.ArticleHandler.Create)
	member.PATCH("/:articleID", deps.ArticleHandler.Update)

	admin := api.Group("/admin/articles")
	admin.Use(middleware.RequireAuthenticated(), middleware.RequireRoles(security.RoleAdmin, security.RoleSuperAdmin))
	admin.DELETE("/:articleID", deps.ArticleHandler.Delete)
}

func registerActivityRoutes(api *gin.RouterGroup, deps Dependencies) {
	group := api.Group("/activities")
	group.GET("/relays", deps.ActivityHandler.ListRelays)
	group.GET("/relays/:relayID", deps.ActivityHandler.GetRelay)
	group.GET("/contests", deps.ActivityHandler.ListWritingContests)
	group.GET("/contests/:contestID", deps.ActivityHandler.GetWritingContest)

	relayParticipant := group.Group("")
	relayParticipant.Use(middleware.RequireAuthenticated(), middleware.RateLimit("relay-write"))
	relayParticipant.POST("/relays/:relayID/entries", deps.ActivityHandler.CreateRelayEntry)

	contestParticipant := group.Group("")
	contestParticipant.Use(middleware.RequireAuthenticated(), middleware.RequireVerifiedUser(), middleware.RateLimit("contest-write"))
	contestParticipant.POST("/contests/:contestID/submissions", deps.ActivityHandler.CreateWritingSubmission)

	admin := api.Group("/admin/activities")
	admin.Use(middleware.RequireAuthenticated(), middleware.RequireRoles(security.RoleAdmin, security.RoleSuperAdmin))
	admin.POST("/relays", deps.ActivityHandler.CreateRelay)
	admin.PATCH("/relays/:relayID/status", deps.ActivityHandler.UpdateRelayStatus)
	admin.POST("/contests", deps.ActivityHandler.CreateWritingContest)
	admin.PATCH("/contests/:contestID/status", deps.ActivityHandler.UpdateWritingContestStatus)
}

func registerForumRoutes(api *gin.RouterGroup, deps Dependencies) {
	group := api.Group("/forum")
	group.GET("/threads", deps.ForumHandler.ListThreads)
	group.GET("/threads/:threadID", deps.ForumHandler.GetThread)

	member := group.Group("")
	member.Use(middleware.RequireAuthenticated(), middleware.RequireVerifiedUser(), middleware.RateLimit("forum-write"))
	member.POST("/threads", deps.ForumHandler.CreateThread)
	member.POST("/threads/:threadID/replies", deps.ForumHandler.CreateReply)

	admin := api.Group("/admin/forum")
	admin.Use(middleware.RequireAuthenticated(), middleware.RequireRoles(security.RoleAdmin, security.RoleSuperAdmin))
	admin.DELETE("/threads/:threadID", deps.ForumHandler.DeleteThread)
	admin.DELETE("/threads/:threadID/replies/:replyID", deps.ForumHandler.DeleteReply)
}

func registerSiteRoutes(api *gin.RouterGroup, deps Dependencies) {
	group := api.Group("/site")
	group.GET("/content", deps.SiteHandler.GetContent)

	admin := api.Group("/admin/site")
	admin.Use(middleware.RequireAuthenticated(), middleware.RequireRoles(security.RoleAdmin, security.RoleSuperAdmin))
	admin.POST("/content-blocks", deps.SiteHandler.CreateContentBlock)
	admin.PATCH("/content-blocks/:blockID", deps.SiteHandler.UpdateContentBlock)
	admin.DELETE("/content-blocks/:blockID", deps.SiteHandler.DeleteContentBlock)
	admin.POST("/gallery-entries", deps.SiteHandler.CreateGalleryEntry)
	admin.PATCH("/gallery-entries/:entryID", deps.SiteHandler.UpdateGalleryEntry)
	admin.DELETE("/gallery-entries/:entryID", deps.SiteHandler.DeleteGalleryEntry)
}

func registerWallRoutes(api *gin.RouterGroup, deps Dependencies) {
	group := api.Group("/wall")
	group.GET("", deps.WallHandler.List)

	member := group.Group("")
	member.Use(middleware.RequireAuthenticated(), middleware.RequireVerifiedUser(), middleware.RateLimit("wall-submit"))
	member.POST("/submissions", deps.WallHandler.CreateSubmission)

	moderation := group.Group("")
	moderation.Use(
		middleware.RequireAuthenticated(),
		middleware.RequireRoles(security.RoleAdmin, security.RoleSuperAdmin),
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
