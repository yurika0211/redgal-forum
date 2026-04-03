package pagination

import (
	"math"
	"strconv"

	"github.com/gin-gonic/gin"
)

const (
	DefaultPage     = 1
	DefaultPageSize = 10
	MaxPageSize     = 100
)

type Params struct {
	Page     int `json:"page"`
	PageSize int `json:"page_size"`
}

type Result[T any] struct {
	Items      []T `json:"items"`
	Page       int `json:"page"`
	PageSize   int `json:"page_size"`
	Total      int `json:"total"`
	TotalPages int `json:"total_pages"`
}

func FromGin(c *gin.Context) Params {
	return Normalize(
		parsePositiveInt(c.Query("page"), DefaultPage),
		parsePositiveInt(c.Query("page_size"), DefaultPageSize),
	)
}

func Normalize(page, pageSize int) Params {
	if page < 1 {
		page = DefaultPage
	}
	if pageSize < 1 {
		pageSize = DefaultPageSize
	}
	if pageSize > MaxPageSize {
		pageSize = MaxPageSize
	}

	return Params{
		Page:     page,
		PageSize: pageSize,
	}
}

func (p Params) Offset() int {
	return (p.Page - 1) * p.PageSize
}

func NewResult[T any](items []T, total int, params Params) Result[T] {
	totalPages := 0
	if total > 0 {
		totalPages = int(math.Ceil(float64(total) / float64(params.PageSize)))
	}

	return Result[T]{
		Items:      items,
		Page:       params.Page,
		PageSize:   params.PageSize,
		Total:      total,
		TotalPages: totalPages,
	}
}

func Slice[T any](items []T, params Params) Result[T] {
	total := len(items)
	start := params.Offset()
	if start >= total {
		return NewResult([]T{}, total, params)
	}

	end := start + params.PageSize
	if end > total {
		end = total
	}

	return NewResult(items[start:end], total, params)
}

func parsePositiveInt(value string, fallback int) int {
	parsed, err := strconv.Atoi(value)
	if err != nil || parsed <= 0 {
		return fallback
	}

	return parsed
}
