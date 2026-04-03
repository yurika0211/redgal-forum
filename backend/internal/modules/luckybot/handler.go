package luckybot

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

func (h *Handler) Chat(c *gin.Context) {
	var input ChatRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	result, err := h.service.Chat(c.Request.Context(), security.FromContext(c), input)
	if err != nil {
		if errors.Is(err, scaffold.ErrNotImplemented) {
			response.NotImplemented(c, "luckybot.chat")
			return
		}

		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.OK(c, result)
}

func (h *Handler) ReloadPersona(c *gin.Context) {
	result, err := h.service.ReloadPersona(c.Request.Context(), security.FromContext(c))
	if err != nil {
		if errors.Is(err, scaffold.ErrNotImplemented) {
			response.NotImplemented(c, "luckybot.reload")
			return
		}

		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.Accepted(c, result)
}
