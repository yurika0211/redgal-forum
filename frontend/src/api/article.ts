import { request, withListQuery } from "./request";
import type {
  Article,
  CreateArticlePayload,
  DeleteArticleResult,
  ListParams,
  Paginated,
} from "./types";

export function fetchArticles(token?: string, params?: ListParams): Promise<Paginated<Article>> {
  return request<Paginated<Article>>(withListQuery("/articles", params), { token });
}

export function fetchArticleDetail(articleID: string, token?: string): Promise<Article> {
  return request<Article>(`/articles/${encodeURIComponent(articleID)}`, { token });
}

export function createArticle(body: CreateArticlePayload, token: string): Promise<Article> {
  return request<Article>("/articles", {
    method: "POST",
    body,
    token,
  });
}

export function updateArticle(
  articleID: string,
  body: CreateArticlePayload,
  token: string,
): Promise<Article> {
  return request<Article>(`/articles/${encodeURIComponent(articleID)}`, {
    method: "PATCH",
    body,
    token,
  });
}

export function deleteArticle(articleID: string, token: string): Promise<DeleteArticleResult> {
  return request<DeleteArticleResult>(`/admin/articles/${encodeURIComponent(articleID)}`, {
    method: "DELETE",
    token,
  });
}
