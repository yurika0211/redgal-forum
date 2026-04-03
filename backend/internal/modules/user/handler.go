package user

import (
	"errors"
	"net/http"

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
		if errors.Is(err, scaffold.ErrNotImplemented) {
			response.NotImplemented(c, "user.profile.update")
			return
		}

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
		if errors.Is(err, scaffold.ErrNotImplemented) {
			response.NotImplemented(c, "user.bangumi.import")
			return
		}

		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.Accepted(c, job)
}

func (h *Handler) GetAdminDashboard(c *gin.Context) {
	result, err := h.service.GetAdminDashboard(c.Request.Context(), security.FromContext(c))
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.OK(c, result)
}

func (h *Handler) GetSuperAdminDashboard(c *gin.Context) {
	result, err := h.service.GetSuperAdminDashboard(c.Request.Context(), security.FromContext(c))
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.OK(c, result)
}

func (h *Handler) ListAdminUsers(c *gin.Context) {
	users, err := h.service.ListAdminUsers(c.Request.Context(), security.FromContext(c), pagination.FromGin(c))
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.OK(c, users)
}

func (h *Handler) UpdateUserStatus(c *gin.Context) {
	var input UpdateUserStatusRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	result, err := h.service.UpdateUserStatus(c.Request.Context(), security.FromContext(c), c.Param("userID"), input)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.OK(c, result)
}

func (h *Handler) ReviewVerification(c *gin.Context) {
	var input VerificationDecisionRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	result, err := h.service.ReviewVerification(c.Request.Context(), security.FromContext(c), c.Param("userID"), input)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.OK(c, result)
}
