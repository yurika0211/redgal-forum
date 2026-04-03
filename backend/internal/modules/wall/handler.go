package wall

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

func (h *Handler) List(c *gin.Context) {
	entries, err := h.service.List(c.Request.Context())
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.OK(c, entries)
}

func (h *Handler) CreateSubmission(c *gin.Context) {
	var input CreateSubmissionRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	entry, err := h.service.CreateSubmission(c.Request.Context(), security.FromContext(c), input)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.Created(c, entry)
}

func (h *Handler) ReviewSubmission(c *gin.Context) {
	var input ReviewSubmissionRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	result, err := h.service.ReviewSubmission(c.Request.Context(), security.FromContext(c), c.Param("submissionID"), input)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.OK(c, result)
}
