package sitecontent

type ContentBlockType string

const (
	ContentBlockHeroObject      ContentBlockType = "hero_object"
	ContentBlockPortalPage      ContentBlockType = "portal_page"
	ContentBlockPortalHighlight ContentBlockType = "portal_highlight"
	ContentBlockPortalPillar    ContentBlockType = "portal_pillar"
	ContentBlockPortalNotice    ContentBlockType = "portal_notice"
	ContentBlockPortalActivity  ContentBlockType = "portal_activity"
	ContentBlockPortalJoinStep  ContentBlockType = "portal_join_step"
)

type GalleryEntryType string

const (
	GalleryAlbum    GalleryEntryType = "album"
	GalleryPolaroid GalleryEntryType = "polaroid"
	GalleryPaper    GalleryEntryType = "paper"
	GalleryTimeline GalleryEntryType = "timeline"
	GalleryTrack    GalleryEntryType = "track"
)

type ContentBlock struct {
	ID          string           `json:"id"`
	BlockType   ContentBlockType `json:"block_type"`
	Slug        string           `json:"slug"`
	Path        string           `json:"path,omitempty"`
	Kicker      string           `json:"kicker,omitempty"`
	Label       string           `json:"label,omitempty"`
	Title       string           `json:"title"`
	Description string           `json:"description,omitempty"`
	Body        string           `json:"body,omitempty"`
	SortOrder   int              `json:"sort_order"`
	Active      bool             `json:"active"`
}

type GalleryEntry struct {
	ID        string           `json:"id"`
	EntryType GalleryEntryType `json:"entry_type"`
	Slug      string           `json:"slug"`
	Title     string           `json:"title"`
	Subtitle  string           `json:"subtitle,omitempty"`
	Body      string           `json:"body,omitempty"`
	ExtraText string           `json:"extra_text,omitempty"`
	SortOrder int              `json:"sort_order"`
	Active    bool             `json:"active"`
}

type SiteContent struct {
	HeroObjects      []ContentBlock `json:"hero_objects"`
	PortalPages      []ContentBlock `json:"portal_pages"`
	PortalHighlights []ContentBlock `json:"portal_highlights"`
	PortalPillars    []ContentBlock `json:"portal_pillars"`
	PortalNotices    []ContentBlock `json:"portal_notices"`
	PortalActivities []ContentBlock `json:"portal_activities"`
	PortalJoinSteps  []ContentBlock `json:"portal_join_steps"`
	GalleryEntries   []GalleryEntry `json:"gallery_entries"`
}

type CreateContentBlockRequest struct {
	BlockType   ContentBlockType `json:"block_type" binding:"required"`
	Slug        string           `json:"slug"`
	Path        string           `json:"path"`
	Kicker      string           `json:"kicker"`
	Label       string           `json:"label"`
	Title       string           `json:"title" binding:"required"`
	Description string           `json:"description"`
	Body        string           `json:"body"`
	SortOrder   int              `json:"sort_order"`
	Active      *bool            `json:"active"`
}

type UpdateContentBlockRequest struct {
	Slug        *string `json:"slug"`
	Path        *string `json:"path"`
	Kicker      *string `json:"kicker"`
	Label       *string `json:"label"`
	Title       *string `json:"title"`
	Description *string `json:"description"`
	Body        *string `json:"body"`
	SortOrder   *int    `json:"sort_order"`
	Active      *bool   `json:"active"`
}

type CreateGalleryEntryRequest struct {
	EntryType GalleryEntryType `json:"entry_type" binding:"required"`
	Slug      string           `json:"slug"`
	Title     string           `json:"title" binding:"required"`
	Subtitle  string           `json:"subtitle"`
	Body      string           `json:"body"`
	ExtraText string           `json:"extra_text"`
	SortOrder int              `json:"sort_order"`
	Active    *bool            `json:"active"`
}

type UpdateGalleryEntryRequest struct {
	Slug      *string `json:"slug"`
	Title     *string `json:"title"`
	Subtitle  *string `json:"subtitle"`
	Body      *string `json:"body"`
	ExtraText *string `json:"extra_text"`
	SortOrder *int    `json:"sort_order"`
	Active    *bool   `json:"active"`
}

type GalleryAsset struct {
	URL          string `json:"url"`
	Filename     string `json:"filename"`
	OriginalName string `json:"original_name,omitempty"`
	ContentType  string `json:"content_type,omitempty"`
	Size         int64  `json:"size,omitempty"`
}

type GalleryAssetUploadResult struct {
	Files []GalleryAsset `json:"files"`
}
