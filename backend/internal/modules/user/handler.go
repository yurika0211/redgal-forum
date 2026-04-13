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
		if errors.Is(err, ErrInvalidProfileInput) || errors.Is(err, ErrSpaceIDChangeLimitReached) {
			response.Error(c, http.StatusBadRequest, err.Error())
			return
		}
		if errors.Is(err, ErrUsernameAlreadyExists) {
			response.Error(c, http.StatusConflict, err.Error())
			return
		}

		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.OK(c, profile)
}

func (h *Handler) ListFriends(c *gin.Context) {
	friends, err := h.service.ListFriends(c.Request.Context(), security.FromContext(c), pagination.FromGin(c))
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.OK(c, friends)
}

func (h *Handler) ListUserFriends(c *gin.Context) {
	friends, err := h.service.ListUserFriends(c.Request.Context(), c.Param("username"), pagination.FromGin(c))
	if err != nil {
		if errors.Is(err, ErrUserNotFound) {
			response.Error(c, http.StatusNotFound, err.Error())
			return
		}
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.OK(c, friends)
}

func (h *Handler) ListIncomingFriendRequests(c *gin.Context) {
	requests, err := h.service.ListIncomingFriendRequests(c.Request.Context(), security.FromContext(c), pagination.FromGin(c))
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.OK(c, requests)
}

func (h *Handler) ListOutgoingFriendRequests(c *gin.Context) {
	requests, err := h.service.ListOutgoingFriendRequests(c.Request.Context(), security.FromContext(c), pagination.FromGin(c))
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.OK(c, requests)
}

func (h *Handler) CreateFriendRequest(c *gin.Context) {
	var input CreateFriendRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	request, err := h.service.CreateFriendRequest(c.Request.Context(), security.FromContext(c), input)
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	response.Created(c, request)
}

func (h *Handler) ReviewFriendRequest(c *gin.Context) {
	var input ReviewFriendRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	result, err := h.service.ReviewFriendRequest(
		c.Request.Context(),
		security.FromContext(c),
		c.Param("requestID"),
		input,
	)
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	response.OK(c, result)
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

func (h *Handler) ListMyBangumiImportJobs(c *gin.Context) {
	jobs, err := h.service.ListMyBangumiImportJobs(c.Request.Context(), security.FromContext(c), pagination.FromGin(c))
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.OK(c, jobs)
}

func (h *Handler) ListMyBangumiCollections(c *gin.Context) {
	collections, err := h.service.ListMyBangumiCollections(c.Request.Context(), security.FromContext(c), pagination.FromGin(c))
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.OK(c, collections)
}

func (h *Handler) ListUserBangumiCollections(c *gin.Context) {
	collections, err := h.service.ListUserBangumiCollections(c.Request.Context(), c.Param("username"), pagination.FromGin(c))
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.OK(c, collections)
}

func (h *Handler) UpdateMyBangumiCollection(c *gin.Context) {
	var input UpdateBangumiCollectionRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	collection, err := h.service.UpdateMyBangumiCollection(
		c.Request.Context(),
		security.FromContext(c),
		c.Param("collectionID"),
		input,
	)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.OK(c, collection)
}

func (h *Handler) GetAdminDashboard(c *gin.Context) {
	result, err := h.service.GetAdminDashboard(c.Request.Context(), security.FromContext(c))
	if err != nil {
		if errors.Is(err, ErrAdminRoleRequired) {
			response.Error(c, http.StatusForbidden, err.Error())
			return
		}

		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.OK(c, result)
}

func (h *Handler) GetSuperAdminDashboard(c *gin.Context) {
	result, err := h.service.GetSuperAdminDashboard(c.Request.Context(), security.FromContext(c))
	if err != nil {
		if errors.Is(err, ErrSuperAdminRoleRequired) {
			response.Error(c, http.StatusForbidden, err.Error())
			return
		}

		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.OK(c, result)
}

func (h *Handler) ListAdminUsers(c *gin.Context) {
	users, err := h.service.ListAdminUsers(c.Request.Context(), security.FromContext(c), pagination.FromGin(c))
	if err != nil {
		if errors.Is(err, ErrAdminRoleRequired) {
			response.Error(c, http.StatusForbidden, err.Error())
			return
		}

		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.OK(c, users)
}

func (h *Handler) ListBangumiImportJobs(c *gin.Context) {
	jobs, err := h.service.ListBangumiImportJobs(c.Request.Context(), security.FromContext(c), pagination.FromGin(c))
	if err != nil {
		if errors.Is(err, ErrAdminRoleRequired) {
			response.Error(c, http.StatusForbidden, err.Error())
			return
		}

		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.OK(c, jobs)
}

func (h *Handler) UpdateBangumiImportJobStatus(c *gin.Context) {
	var input UpdateBangumiJobStatusRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	job, err := h.service.UpdateBangumiImportJobStatus(c.Request.Context(), security.FromContext(c), c.Param("jobID"), input)
	if err != nil {
		if errors.Is(err, ErrAdminRoleRequired) {
			response.Error(c, http.StatusForbidden, err.Error())
			return
		}

		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.OK(c, job)
}

func (h *Handler) UpdateUserStatus(c *gin.Context) {
	var input UpdateUserStatusRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	result, err := h.service.UpdateUserStatus(c.Request.Context(), security.FromContext(c), c.Param("userID"), input)
	if err != nil {
		if errors.Is(err, ErrAdminRoleRequired) {
			response.Error(c, http.StatusForbidden, err.Error())
			return
		}

		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.OK(c, result)
}

func (h *Handler) ModerateUser(c *gin.Context) {
	var input ModerateUserRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	result, err := h.service.ModerateUser(c.Request.Context(), security.FromContext(c), c.Param("userID"), input)
	if err != nil {
		switch {
		case errors.Is(err, ErrAdminRoleRequired):
			response.Error(c, http.StatusForbidden, err.Error())
		case errors.Is(err, ErrUnsupportedModeration), errors.Is(err, ErrModerationSelf):
			response.Error(c, http.StatusBadRequest, err.Error())
		case errors.Is(err, ErrModerationForbidden):
			response.Error(c, http.StatusForbidden, err.Error())
		default:
			response.Error(c, http.StatusInternalServerError, err.Error())
		}
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
		if errors.Is(err, ErrAdminRoleRequired) {
			response.Error(c, http.StatusForbidden, err.Error())
			return
		}

		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.OK(c, result)
}
