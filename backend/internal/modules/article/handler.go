package article

import (
	"errors"
	"net/http"

	"example.com/rubedo/backend/internal/http/response"
	"example.com/rubedo/backend/internal/scaffold"
	"example.com/rubedo/backend/internal/security"
	"github.com/gin-gonic/gin"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) List(c *gin.Context) {
	articles, err := h.service.List(c.Request.Context(), security.FromContext(c))
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.OK(c, articles)
}

func (h *Handler) Get(c *gin.Context) {
	article, err := h.service.Get(c.Request.Context(), security.FromContext(c), c.Param("articleID"))
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.OK(c, article)
}

func (h *Handler) Create(c *gin.Context) {
	var input CreateArticleRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	article, err := h.service.Create(c.Request.Context(), security.FromContext(c), input)
	if err != nil {
		if errors.Is(err, scaffold.ErrNotImplemented) {
			response.NotImplemented(c, "article.create")
			return
		}

		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.Created(c, article)
}

func (h *Handler) Update(c *gin.Context) {
	var input UpdateArticleRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	article, err := h.service.Update(c.Request.Context(), security.FromContext(c), c.Param("articleID"), input)
	if err != nil {
		if errors.Is(err, scaffold.ErrNotImplemented) {
			response.NotImplemented(c, "article.update")
			return
		}

		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.OK(c, article)
}

func (h *Handler) Delete(c *gin.Context) {
	result, err := h.service.Delete(c.Request.Context(), security.FromContext(c), c.Param("articleID"))
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.OK(c, result)
}
