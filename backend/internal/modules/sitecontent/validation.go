package sitecontent

import (
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"
)

var (
	ErrInvalidPortalActivityLabel = errors.New("invalid portal activity label")

	portalActivityDatePattern = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}$`)
)

func normalizePortalActivityDateLabel(value string) (string, error) {
	normalized := strings.TrimSpace(value)
	if normalized == "" {
		return "", fmt.Errorf("%w: 时间标签不能为空，格式需为 YYYY-MM-DD", ErrInvalidPortalActivityLabel)
	}
	if !portalActivityDatePattern.MatchString(normalized) {
		return "", fmt.Errorf("%w: 时间标签格式必须为 YYYY-MM-DD", ErrInvalidPortalActivityLabel)
	}
	if _, err := time.Parse("2006-01-02", normalized); err != nil {
		return "", fmt.Errorf("%w: 时间标签必须是有效日期，格式需为 YYYY-MM-DD", ErrInvalidPortalActivityLabel)
	}

	return normalized, nil
}
