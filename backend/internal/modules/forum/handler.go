package forum

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
		if errors.Is(err, scaffold.ErrNotImplemented) {
			response.NotImplemented(c, "forum.thread.create")
			return
		}

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
		if errors.Is(err, scaffold.ErrNotImplemented) {
			response.NotImplemented(c, "forum.reply.create")
			return
		}

		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.Created(c, reply)
}

func (h *Handler) DeleteThread(c *gin.Context) {
	result, err := h.service.DeleteThread(c.Request.Context(), security.FromContext(c), c.Param("threadID"))
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.OK(c, result)
}

func (h *Handler) DeleteReply(c *gin.Context) {
	result, err := h.service.DeleteReply(
		c.Request.Context(),
		security.FromContext(c),
		c.Param("threadID"),
		c.Param("replyID"),
	)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.OK(c, result)
}
