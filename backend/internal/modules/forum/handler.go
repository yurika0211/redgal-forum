package forum

import (
	"errors"
	"net/http"
	"strings"

	"example.com/rubedo/backend/internal/http/response"
	"example.com/rubedo/backend/internal/pagination"
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
	threads, err := h.service.ListThreads(
		c.Request.Context(),
		pagination.FromGin(c),
		strings.TrimSpace(c.Query("q")),
	)
	if err != nil {
		respondForumError(c, err)
		return
	}

	response.OK(c, threads)
}

func (h *Handler) ListAnonymousThreads(c *gin.Context) {
	threads, err := h.service.ListAnonymousThreads(
		c.Request.Context(),
		pagination.Params{
			Page:     1,
			PageSize: AnonymousBoardMessageCap,
		},
		strings.TrimSpace(c.Query("q")),
	)
	if err != nil {
		respondForumError(c, err)
		return
	}

	response.OK(c, threads)
}

func (h *Handler) GetThread(c *gin.Context) {
	thread, err := h.service.GetThread(c.Request.Context(), c.Param("threadID"))
	if err != nil {
		respondForumError(c, err)
		return
	}

	response.OK(c, thread)
}

func (h *Handler) GetAnonymousThread(c *gin.Context) {
	thread, err := h.service.GetAnonymousThread(c.Request.Context(), c.Param("threadID"))
	if err != nil {
		respondForumError(c, err)
		return
	}

	response.OK(c, thread)
}

func (h *Handler) GetAvailabilitySettings(c *gin.Context) {
	settings, err := h.service.GetAvailabilitySettings(c.Request.Context())
	if err != nil {
		respondForumError(c, err)
		return
	}

	response.OK(c, settings)
}

func (h *Handler) UpdateAvailabilitySettings(c *gin.Context) {
	var input UpdateAvailabilitySettingsRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	if input.ForumEnabled == nil && input.AnonymousEnabled == nil {
		response.Error(c, http.StatusBadRequest, "至少需要提供一个开关字段。")
		return
	}

	settings, err := h.service.UpdateAvailabilitySettings(c.Request.Context(), input)
	if err != nil {
		respondForumError(c, err)
		return
	}

	response.OK(c, settings)
}

func (h *Handler) GetProgress(c *gin.Context) {
	progress, err := h.service.GetProgress(c.Request.Context(), security.FromContext(c))
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.OK(c, progress)
}

func (h *Handler) ListMyThreadReplySnapshots(c *gin.Context) {
	result, err := h.service.ListMyThreadReplySnapshots(
		c.Request.Context(),
		security.FromContext(c),
		pagination.FromGin(c),
	)
	if err != nil {
		respondForumError(c, err)
		return
	}

	response.OK(c, result)
}

func (h *Handler) SignIn(c *gin.Context) {
	result, err := h.service.SignIn(c.Request.Context(), security.FromContext(c))
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.OK(c, result)
}

func (h *Handler) CreateThread(c *gin.Context) {
	var input CreateThreadRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	if input.Anonymous {
		response.Error(c, http.StatusBadRequest, "论坛版块已关闭匿名发帖，请使用实名发帖。")
		return
	}

	thread, err := h.service.CreateThread(c.Request.Context(), security.FromContext(c), input)
	if err != nil {
		if errors.Is(err, scaffold.ErrNotImplemented) {
			response.NotImplemented(c, "forum.thread.create")
			return
		}
		respondForumError(c, err)
		return
	}

	response.Created(c, thread)
}

func (h *Handler) CreateAnonymousThread(c *gin.Context) {
	var input CreateThreadRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	thread, err := h.service.CreateAnonymousThread(c.Request.Context(), security.FromContext(c), input)
	if err != nil {
		if errors.Is(err, scaffold.ErrNotImplemented) {
			response.NotImplemented(c, "forum.anonymous_thread.create")
			return
		}
		respondForumError(c, err)
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
	if input.Anonymous {
		response.Error(c, http.StatusBadRequest, "论坛版块已关闭匿名回复，请使用实名回复。")
		return
	}

	reply, err := h.service.CreateReply(c.Request.Context(), security.FromContext(c), c.Param("threadID"), input)
	if err != nil {
		if errors.Is(err, scaffold.ErrNotImplemented) {
			response.NotImplemented(c, "forum.reply.create")
			return
		}
		respondForumError(c, err)
		return
	}

	response.Created(c, reply)
}

func (h *Handler) CreateAnonymousReply(c *gin.Context) {
	var input CreateReplyRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	reply, err := h.service.CreateAnonymousReply(c.Request.Context(), security.FromContext(c), c.Param("threadID"), input)
	if err != nil {
		if errors.Is(err, scaffold.ErrNotImplemented) {
			response.NotImplemented(c, "forum.anonymous_reply.create")
			return
		}
		respondForumError(c, err)
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

func respondForumError(c *gin.Context, err error) {
	if errors.Is(err, ErrForumDisabled) || errors.Is(err, ErrAnonymousDisabled) {
		response.Error(c, http.StatusForbidden, err.Error())
		return
	}

	response.Error(c, http.StatusInternalServerError, err.Error())
}
