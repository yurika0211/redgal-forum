package router

import (
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"example.com/rubedo/backend/internal/config"
	"example.com/rubedo/backend/internal/modules/forum"
	"example.com/rubedo/backend/internal/modules/health"
	"github.com/gin-gonic/gin"
)

func BenchmarkForumAnonymousThreadsRoute(b *testing.B) {
	engine := newForumAnonymousThreadsBenchmarkRouter()

	b.Run("default-query", func(b *testing.B) {
		benchmarkAnonymousThreadsRequest(
			b,
			engine,
			"/api/v1/forum/anonymous/threads?page=1&page_size=20",
		)
	})

	b.Run("keyword-query", func(b *testing.B) {
		benchmarkAnonymousThreadsRequest(
			b,
			engine,
			"/api/v1/forum/anonymous/threads?page=1&page_size=20&q=%E5%8C%BF%E5%90%8D",
		)
	})
}

func newForumAnonymousThreadsBenchmarkRouter() http.Handler {
	gin.SetMode(gin.TestMode)
	gin.DefaultWriter = io.Discard
	gin.DefaultErrorWriter = io.Discard

	cfg := config.Config{
		App: config.AppConfig{
			Name: "rubedo-backend-benchmark",
			Env:  "development",
		},
		Auth: config.AuthConfig{
			JWTSecret:         "benchmark-secret",
			AllowDebugHeaders: true,
		},
	}

	forumHandler := forum.NewHandler(
		forum.NewService(
			forum.NewRepository(nil),
			nil,
		),
	)

	deps := Dependencies{
		Config:        cfg,
		HealthHandler: health.NewHandler(cfg, nil),
		ForumHandler:  forumHandler,
	}

	return New(deps)
}

func benchmarkAnonymousThreadsRequest(b *testing.B, engine http.Handler, target string) {
	b.Helper()

	request := httptest.NewRequest(http.MethodGet, target, nil)
	request.Header.Set("X-Debug-User", "benchmark-user")
	request.Header.Set("X-Debug-Roles", "member")

	b.ReportAllocs()
	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		recorder := httptest.NewRecorder()
		engine.ServeHTTP(recorder, request)

		if recorder.Code != http.StatusOK {
			b.Fatalf("unexpected status code: got %d, want %d", recorder.Code, http.StatusOK)
		}
	}
}
