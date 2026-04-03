package user

import (
	"net/http"

	"example.com/rubedo/backend/internal/http/response"
	"example.com/rubedo/backend/internal/security"
	"github.com/gin-gonic/gin"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) GetProfile(c *gin.Context) {
	profile, err := h.service.GetProfile(c.Request.Context(), c.Param("username"))
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.OK(c, profile)
}

func (h *Handler) GetMe(c *gin.Context) {
	profile, err := h.service.GetMe(c.Request.Context(), security.FromContext(c))
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.OK(c, profile)
}

func (h *Handler) UpdateMe(c *gin.Context) {
	var input UpdateProfileRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	profile, err := h.service.UpdateMe(c.Request.Context(), security.FromContext(c), input)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.OK(c, profile)
}

func (h *Handler) ImportBangumi(c *gin.Context) {
	var input BangumiImportRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	job, err := h.service.QueueBangumiImport(c.Request.Context(), security.FromContext(c), input)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.Accepted(c, job)
}
