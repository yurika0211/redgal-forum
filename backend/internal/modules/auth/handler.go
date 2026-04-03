package auth

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

func (h *Handler) Register(c *gin.Context) {
	var input RegisterRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	result, err := h.service.Register(c.Request.Context(), input)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.Created(c, result)
}

func (h *Handler) Login(c *gin.Context) {
	var input LoginRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	session, err := h.service.Login(c.Request.Context(), input)
	if err != nil {
		response.Error(c, http.StatusUnauthorized, err.Error())
		return
	}

	response.OK(c, session)
}

func (h *Handler) Logout(c *gin.Context) {
	principal := security.FromContext(c)
	if err := h.service.Logout(c.Request.Context(), principal); err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.OK(c, gin.H{
		"status": "logged_out",
	})
}
