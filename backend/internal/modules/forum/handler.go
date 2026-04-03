package forum

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

func (h *Handler) ListThreads(c *gin.Context) {
	threads, err := h.service.ListThreads(c.Request.Context())
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.OK(c, threads)
}

func (h *Handler) GetThread(c *gin.Context) {
	thread, err := h.service.GetThread(c.Request.Context(), c.Param("threadID"))
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.OK(c, thread)
}

func (h *Handler) CreateThread(c *gin.Context) {
	var input CreateThreadRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	thread, err := h.service.CreateThread(c.Request.Context(), security.FromContext(c), input)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.Created(c, thread)
}

func (h *Handler) CreateReply(c *gin.Context) {
	var input CreateReplyRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	reply, err := h.service.CreateReply(c.Request.Context(), security.FromContext(c), c.Param("threadID"), input)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.Created(c, reply)
}
