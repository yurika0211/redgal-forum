package forum

import (
	"context"

	"example.com/rubedo/backend/internal/platform"
	"example.com/rubedo/backend/internal/security"
)

type Repository interface {
	ListThreads(ctx context.Context) ([]Thread, error)
	GetThread(ctx context.Context, threadID string) (ThreadDetail, error)
	CreateThread(ctx context.Context, principal security.Principal, input CreateThreadRequest) (Thread, error)
	CreateReply(ctx context.Context, principal security.Principal, threadID string, input CreateReplyRequest) (Reply, error)
}

type repository struct {
	platform *platform.Platform
}

func NewRepository(platform *platform.Platform) Repository {
	return &repository{platform: platform}
}

func (r *repository) ListThreads(ctx context.Context) ([]Thread, error) {
	return []Thread{
		{
			ID:         "thread-001",
			Title:      "欢迎来到论坛讨论版",
			Content:    "This is the scaffolded discussion board thread.",
			Board:      "general",
			Anonymous:  false,
			Author:     "rubedo-member",
			Tags:       []string{"welcome"},
			ReplyCount: 1,
		},
	}, nil
}

func (r *repository) GetThread(ctx context.Context, threadID string) (ThreadDetail, error) {
	return ThreadDetail{
		Thread: Thread{
			ID:         threadID,
			Title:      "Scaffolded forum thread detail",
			Content:    "Forum thread detail will later be backed by PostgreSQL.",
			Board:      "general",
			Author:     "rubedo-member",
			ReplyCount: 1,
		},
		Replies: []Reply{
			{
				ID:       "reply-001",
				ThreadID: threadID,
				Content:  "First scaffolded reply.",
				Author:   "member-002",
			},
		},
	}, nil
}

func (r *repository) CreateThread(ctx context.Context, principal security.Principal, input CreateThreadRequest) (Thread, error) {
	author := principal.Username
	if input.Anonymous {
		author = "anonymous-mask"
	}

	return Thread{
		ID:         "thread-new-001",
		Title:      input.Title,
		Content:    input.Content,
		Board:      input.Board,
		Anonymous:  input.Anonymous,
		Author:     author,
		Tags:       input.Tags,
		ReplyCount: 0,
	}, nil
}

func (r *repository) CreateReply(ctx context.Context, principal security.Principal, threadID string, input CreateReplyRequest) (Reply, error) {
	author := principal.Username
	if input.Anonymous {
		author = "anonymous-mask"
	}

	return Reply{
		ID:        "reply-new-001",
		ThreadID:  threadID,
		Content:   input.Content,
		Author:    author,
		Anonymous: input.Anonymous,
	}, nil
}
