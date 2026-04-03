package article

import (
	"context"

	"example.com/rubedo/backend/internal/platform"
	"example.com/rubedo/backend/internal/security"
)

type Repository interface {
	ListArticles(ctx context.Context, viewer security.Principal) ([]Article, error)
	GetArticle(ctx context.Context, viewer security.Principal, articleID string) (Article, error)
	CreateArticle(ctx context.Context, principal security.Principal, input CreateArticleRequest) (Article, error)
	UpdateArticle(ctx context.Context, principal security.Principal, articleID string, input UpdateArticleRequest) (Article, error)
}

type repository struct {
	platform *platform.Platform
}

func NewRepository(platform *platform.Platform) Repository {
	return &repository{platform: platform}
}

func (r *repository) ListArticles(ctx context.Context, viewer security.Principal) ([]Article, error) {
	articles := []Article{
		{
			ID:         "article-001",
			Title:      "公开区示例感想",
			Summary:    "公开可见文章占位数据",
			Content:    "This is a scaffolded public article.",
			Visibility: VisibilityPublic,
			Author:     "rubedo-member",
			Tags:       []string{"galgame", "public"},
		},
	}

	if viewer.Authenticated() {
		articles = append(articles, Article{
			ID:         "article-002",
			Title:      "登录可见示例感想",
			Summary:    "成员可见文章占位数据",
			Content:    "This is a scaffolded members-only article.",
			Visibility: VisibilityMember,
			Author:     "rubedo-member",
			Tags:       []string{"member"},
		})
	}

	return articles, nil
}

func (r *repository) GetArticle(ctx context.Context, viewer security.Principal, articleID string) (Article, error) {
	return Article{
		ID:         articleID,
		Title:      "Scaffolded article detail",
		Summary:    "Reserved for public/member/private visibility logic.",
		Content:    "Full article content will be backed by PostgreSQL later.",
		Visibility: VisibilityPublic,
		Author:     "rubedo-member",
		Tags:       []string{"scaffold"},
	}, nil
}

func (r *repository) CreateArticle(ctx context.Context, principal security.Principal, input CreateArticleRequest) (Article, error) {
	return Article{
		ID:         "article-new-001",
		Title:      input.Title,
		Summary:    input.Summary,
		Content:    input.Content,
		Visibility: input.Visibility,
		Author:     principal.Username,
		Tags:       input.Tags,
	}, nil
}

func (r *repository) UpdateArticle(ctx context.Context, principal security.Principal, articleID string, input UpdateArticleRequest) (Article, error) {
	article := Article{
		ID:         articleID,
		Title:      "Updated article title",
		Summary:    "Updated article summary",
		Content:    "Updated article content",
		Visibility: VisibilityMember,
		Author:     principal.Username,
		Tags:       []string{"updated"},
	}

	if input.Title != "" {
		article.Title = input.Title
	}
	if input.Summary != "" {
		article.Summary = input.Summary
	}
	if input.Content != "" {
		article.Content = input.Content
	}
	if input.Visibility != "" {
		article.Visibility = input.Visibility
	}
	if input.Tags != nil {
		article.Tags = input.Tags
	}

	return article, nil
}
