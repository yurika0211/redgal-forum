package article

import (
	"context"

	"example.com/rubedo/backend/internal/pagination"
	"example.com/rubedo/backend/internal/security"
)

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) List(
	ctx context.Context,
	viewer security.Principal,
	params pagination.Params,
	query string,
) (pagination.Result[Article], error) {
	return s.repo.ListArticles(ctx, viewer, params, query)
}

func (s *Service) Get(ctx context.Context, viewer security.Principal, articleID string) (Article, error) {
	return s.repo.GetArticle(ctx, viewer, articleID)
}

func (s *Service) Create(ctx context.Context, principal security.Principal, input CreateArticleRequest) (Article, error) {
	return s.repo.CreateArticle(ctx, principal, input)
}

func (s *Service) Update(ctx context.Context, principal security.Principal, articleID string, input UpdateArticleRequest) (Article, error) {
	return s.repo.UpdateArticle(ctx, principal, articleID, input)
}

func (s *Service) Delete(ctx context.Context, principal security.Principal, articleID string) (DeleteArticleResult, error) {
	return s.repo.DeleteArticle(ctx, principal, articleID)
}
