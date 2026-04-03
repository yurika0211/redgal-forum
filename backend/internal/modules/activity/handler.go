package activity

import (
	"net/http"

	"example.com/rubedo/backend/internal/http/response"
	"example.com/rubedo/backend/internal/pagination"
	"example.com/rubedo/backend/internal/security"
	"github.com/gin-gonic/gin"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) ListRelays(c *gin.Context) {
	events, err := h.service.ListRelays(c.Request.Context(), pagination.FromGin(c))
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.OK(c, events)
}

func (h *Handler) GetRelay(c *gin.Context) {
	detail, err := h.service.GetRelay(c.Request.Context(), c.Param("relayID"))
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.OK(c, detail)
}

func (h *Handler) CreateRelay(c *gin.Context) {
	var input CreateRelayRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	result, err := h.service.CreateRelay(c.Request.Context(), security.FromContext(c), input)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.Created(c, result)
}

func (h *Handler) UpdateRelayStatus(c *gin.Context) {
	var input UpdateRelayStatusRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	result, err := h.service.UpdateRelayStatus(c.Request.Context(), security.FromContext(c), c.Param("relayID"), input)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.OK(c, result)
}

func (h *Handler) CreateRelayEntry(c *gin.Context) {
	var input CreateRelayEntryRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	result, err := h.service.CreateRelayEntry(c.Request.Context(), security.FromContext(c), c.Param("relayID"), input)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.Created(c, result)
}

func (h *Handler) ListWritingContests(c *gin.Context) {
	contests, err := h.service.ListWritingContests(c.Request.Context(), pagination.FromGin(c))
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.OK(c, contests)
}

func (h *Handler) GetWritingContest(c *gin.Context) {
	detail, err := h.service.GetWritingContest(c.Request.Context(), c.Param("contestID"))
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.OK(c, detail)
}

func (h *Handler) CreateWritingContest(c *gin.Context) {
	var input CreateWritingContestRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	result, err := h.service.CreateWritingContest(c.Request.Context(), security.FromContext(c), input)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.Created(c, result)
}

func (h *Handler) UpdateWritingContestStatus(c *gin.Context) {
	var input UpdateWritingContestStatusRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	result, err := h.service.UpdateWritingContestStatus(c.Request.Context(), security.FromContext(c), c.Param("contestID"), input)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.OK(c, result)
}

func (h *Handler) CreateWritingSubmission(c *gin.Context) {
	var input CreateWritingSubmissionRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	result, err := h.service.CreateWritingSubmission(c.Request.Context(), security.FromContext(c), c.Param("contestID"), input)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.Created(c, result)
}
