package sitecontent

import (
	"net/http"

	"example.com/rubedo/backend/internal/http/response"
	"example.com/rubedo/backend/internal/pagination"
	"github.com/gin-gonic/gin"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) GetContent(c *gin.Context) {
	content, err := h.service.GetContent(c.Request.Context())
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.OK(c, content)
}

func (h *Handler) ListContentBlocks(c *gin.Context) {
	blocks, err := h.service.ListContentBlocks(c.Request.Context(), pagination.FromGin(c))
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.OK(c, blocks)
}

func (h *Handler) ListGalleryEntries(c *gin.Context) {
	entries, err := h.service.ListGalleryEntries(c.Request.Context(), pagination.FromGin(c))
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.OK(c, entries)
}

func (h *Handler) CreateContentBlock(c *gin.Context) {
	var input CreateContentBlockRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	block, err := h.service.CreateContentBlock(c.Request.Context(), input)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.Created(c, block)
}

func (h *Handler) UpdateContentBlock(c *gin.Context) {
	var input UpdateContentBlockRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	block, err := h.service.UpdateContentBlock(c.Request.Context(), c.Param("blockID"), input)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.OK(c, block)
}

func (h *Handler) DeleteContentBlock(c *gin.Context) {
	if err := h.service.DeleteContentBlock(c.Request.Context(), c.Param("blockID")); err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.OK(c, gin.H{"deleted": true})
}

func (h *Handler) CreateGalleryEntry(c *gin.Context) {
	var input CreateGalleryEntryRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	entry, err := h.service.CreateGalleryEntry(c.Request.Context(), input)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.Created(c, entry)
}

func (h *Handler) UpdateGalleryEntry(c *gin.Context) {
	var input UpdateGalleryEntryRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	entry, err := h.service.UpdateGalleryEntry(c.Request.Context(), c.Param("entryID"), input)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.OK(c, entry)
}

func (h *Handler) DeleteGalleryEntry(c *gin.Context) {
	if err := h.service.DeleteGalleryEntry(c.Request.Context(), c.Param("entryID")); err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.OK(c, gin.H{"deleted": true})
}
