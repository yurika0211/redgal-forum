package user

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"slices"
	"strconv"
	"strings"
	"time"

	"example.com/rubedo/backend/internal/pagination"
	"example.com/rubedo/backend/internal/security"
)

func (r *repository) QueueBangumiImport(ctx context.Context, principal security.Principal, input BangumiImportRequest) (BangumiImportJob, error) {
	syncMode, err := normalizeBangumiSyncMode(input.SyncMode, len(input.SubjectIDs), input.BangumiUsername)
	if err != nil {
		return BangumiImportJob{}, err
	}

	normalizedVisibility, err := normalizeBangumiVisibility(input.Visibility)
	if err != nil {
		return BangumiImportJob{}, err
	}

	var (
		requestPayload       map[string]any
		resultPayload        map[string]any
		importErr            error
		jobType              string
		normalizedSubjectIDs []int64
		normalizedStatus     string
		bangumiUsername      string
		maxItems             int
	)

	switch syncMode {
	case "account":
		bangumiUsername, err = normalizeBangumiUsername(input.BangumiUsername)
		if err != nil {
			return BangumiImportJob{}, err
		}
		maxItems = normalizeBangumiSyncMaxItems(input.MaxItems)
		jobType = "collection_sync"
		requestPayload = map[string]any{
			"sync_mode":        syncMode,
			"bangumi_username": bangumiUsername,
			"max_items":        maxItems,
			"visibility":       normalizedVisibility,
		}
	default:
		normalizedSubjectIDs = normalizeBangumiSubjectIDs(input.SubjectIDs)
		if len(normalizedSubjectIDs) == 0 {
			return BangumiImportJob{}, fmt.Errorf("at least one valid subject id is required")
		}

		normalizedStatus, err = normalizeBangumiCollectionStatus(input.Status)
		if err != nil {
			return BangumiImportJob{}, err
		}

		jobType = "collection_sync"
		requestPayload = map[string]any{
			"sync_mode":   syncMode,
			"subject_ids": normalizedSubjectIDs,
			"status":      normalizedStatus,
			"visibility":  normalizedVisibility,
		}
	}

	if !r.hasPostgres() {
		resultPayload = map[string]any{
			"sync_mode":  syncMode,
			"visibility": normalizedVisibility,
		}
		if syncMode == "account" {
			resultPayload["bangumi_username"] = bangumiUsername
			resultPayload["requested"] = maxItems
			resultPayload["imported"] = 0
			resultPayload["failed"] = 0
		} else {
			resultPayload["imported_subject_ids"] = normalizedSubjectIDs
			resultPayload["requested"] = len(normalizedSubjectIDs)
			resultPayload["imported"] = len(normalizedSubjectIDs)
			resultPayload["failed"] = 0
		}

		return BangumiImportJob{
			JobID:          "bgm-sync-scaffold",
			Status:         "succeeded",
			Channel:        "bangumi_sync_jobs",
			JobType:        jobType,
			RequestPayload: requestPayload,
			ResultPayload:  resultPayload,
		}, nil
	}

	userID, err := strconv.ParseInt(strings.TrimSpace(principal.UserID), 10, 64)
	if err != nil {
		record, loadErr := r.loadUserByUsername(ctx, principal.Username)
		if loadErr != nil {
			return BangumiImportJob{}, loadErr
		}
		userID = record.ID
	}

	requestPayloadRaw, err := json.Marshal(requestPayload)
	if err != nil {
		return BangumiImportJob{}, err
	}

	var jobID int64
	var status string
	if err := r.platform.Postgres.QueryRowContext(
		ctx,
		`insert into bangumi_sync_jobs (
			user_id,
			job_type,
			status,
			request_payload
		) values ($1, $2::sync_job_type, 'queued', $3::jsonb)
		returning id, status::text`,
		userID,
		jobType,
		string(requestPayloadRaw),
	).Scan(&jobID, &status); err != nil {
		return BangumiImportJob{}, err
	}

	if _, err := r.platform.Postgres.ExecContext(
		ctx,
		`update bangumi_sync_jobs
		 set status = 'running',
		     started_at = now(),
		     updated_at = now()
		 where id = $1`,
		jobID,
	); err != nil {
		return BangumiImportJob{}, err
	}

	if syncMode == "account" {
		resultPayload, importErr = r.importBangumiCollectionsByUsernameNow(
			ctx,
			userID,
			bangumiUsername,
			normalizedVisibility,
			maxItems,
		)
	} else {
		resultPayload, importErr = r.importBangumiCollectionsNow(
			ctx,
			userID,
			normalizedSubjectIDs,
			normalizedStatus,
			normalizedVisibility,
		)
	}

	finalStatus := "succeeded"
	errorMessage := ""
	if importErr != nil {
		finalStatus = "failed"
		errorMessage = importErr.Error()
	}

	if resultPayload == nil {
		resultPayload = map[string]any{}
	}
	if _, exists := resultPayload["sync_mode"]; !exists {
		resultPayload["sync_mode"] = syncMode
	}
	if syncMode == "account" {
		if _, exists := resultPayload["bangumi_username"]; !exists {
			resultPayload["bangumi_username"] = bangumiUsername
		}
	}

	resultRaw, marshalErr := json.Marshal(resultPayload)
	if marshalErr != nil {
		resultRaw = []byte(`{}`)
	}

	if _, err := r.platform.Postgres.ExecContext(
		ctx,
		`update bangumi_sync_jobs
		 set status = $2::sync_job_status,
		     result_payload = $3::jsonb,
		     error_message = nullif($4, ''),
		     finished_at = now(),
		     updated_at = now()
		 where id = $1`,
		jobID,
		finalStatus,
		string(resultRaw),
		errorMessage,
	); err != nil {
		return BangumiImportJob{}, err
	}

	return r.getBangumiJobByID(ctx, jobID)
}

type bangumiSubjectTag struct {
	Name string `json:"name"`
}

type bangumiSubjectImages struct {
	Large  string `json:"large"`
	Common string `json:"common"`
	Medium string `json:"medium"`
	Small  string `json:"small"`
	Grid   string `json:"grid"`
}

type bangumiSubjectRating struct {
	Rank  int     `json:"rank"`
	Score float64 `json:"score"`
	Total int     `json:"total"`
}

type bangumiSubjectResponse struct {
	ID       int64                `json:"id"`
	Type     int16                `json:"type"`
	Name     string               `json:"name"`
	NameCN   string               `json:"name_cn"`
	Summary  string               `json:"summary"`
	Date     string               `json:"date"`
	Platform string               `json:"platform"`
	Images   bangumiSubjectImages `json:"images"`
	Rating   bangumiSubjectRating `json:"rating"`
	Tags     []bangumiSubjectTag  `json:"tags"`
}

func normalizeBangumiSubjectIDs(ids []int64) []int64 {
	if len(ids) == 0 {
		return nil
	}

	seen := make(map[int64]struct{}, len(ids))
	result := make([]int64, 0, len(ids))
	for _, id := range ids {
		if id <= 0 {
			continue
		}
		if _, exists := seen[id]; exists {
			continue
		}
		seen[id] = struct{}{}
		result = append(result, id)
		if len(result) >= maxBangumiImportSubjects {
			break
		}
	}
	return result
}

func normalizeBangumiSyncMode(raw string, subjectCount int, bangumiUsername string) (string, error) {
	mode := strings.ToLower(strings.TrimSpace(raw))
	if mode == "" {
		if strings.TrimSpace(bangumiUsername) != "" && subjectCount == 0 {
			return "account", nil
		}
		return "subject_ids", nil
	}

	switch mode {
	case "subject_ids", "subjects", "subject", "id":
		return "subject_ids", nil
	case "account", "username", "user":
		return "account", nil
	default:
		return "", fmt.Errorf("unsupported bangumi sync mode: %s", raw)
	}
}

func normalizeBangumiUsername(raw string) (string, error) {
	value := strings.TrimSpace(raw)
	if value == "" {
		return "", fmt.Errorf("bangumi username is required for account sync")
	}
	if len(value) > 64 {
		return "", fmt.Errorf("bangumi username is too long")
	}

	for i := 0; i < len(value); i++ {
		ch := value[i]
		isAllowed := (ch >= 'a' && ch <= 'z') ||
			(ch >= 'A' && ch <= 'Z') ||
			(ch >= '0' && ch <= '9') ||
			ch == '_' || ch == '-' || ch == '.'
		if !isAllowed {
			return "", fmt.Errorf("bangumi username contains unsupported character: %q", ch)
		}
	}

	return value, nil
}

func normalizeProfileUsername(raw string) (string, error) {
	value := strings.TrimSpace(raw)
	if value == "" {
		return "", nil
	}
	if len(value) < 3 {
		return "", fmt.Errorf("username must be at least 3 characters")
	}
	if len(value) > 64 {
		return "", fmt.Errorf("username is too long")
	}

	for i := 0; i < len(value); i++ {
		ch := value[i]
		isAllowed := (ch >= 'a' && ch <= 'z') ||
			(ch >= 'A' && ch <= 'Z') ||
			(ch >= '0' && ch <= '9') ||
			ch == '_' || ch == '-' || ch == '.'
		if !isAllowed {
			return "", fmt.Errorf("username contains unsupported character: %q", ch)
		}
	}

	return value, nil
}

func normalizeBangumiSyncMaxItems(value int) int {
	switch {
	case value <= 0:
		return defaultBangumiSyncItems
	case value > maxBangumiSyncItems:
		return maxBangumiSyncItems
	default:
		return value
	}
}

func normalizeBangumiCollectionStatus(raw string) (string, error) {
	status := strings.ToLower(strings.TrimSpace(raw))
	switch status {
	case "wish", "doing", "collect", "on_hold", "dropped":
		return status, nil
	default:
		return "", fmt.Errorf("unsupported bangumi collection status: %s", raw)
	}
}

func bangumiCollectionTypeToStatus(value int) (string, error) {
	switch value {
	case 1:
		return "wish", nil
	case 2:
		return "collect", nil
	case 3:
		return "doing", nil
	case 4:
		return "on_hold", nil
	case 5:
		return "dropped", nil
	default:
		return "", fmt.Errorf("unsupported bangumi collection type: %d", value)
	}
}

func normalizeBangumiVisibility(raw string) (string, error) {
	visibility := strings.ToLower(strings.TrimSpace(raw))
	if visibility == "" {
		visibility = "public"
	}

	switch visibility {
	case "public", "members", "private":
		return visibility, nil
	default:
		return "", fmt.Errorf("unsupported visibility: %s", raw)
	}
}

func (r *repository) importBangumiCollectionsNow(
	ctx context.Context,
	userID int64,
	subjectIDs []int64,
	collectionStatus string,
	visibility string,
) (map[string]any, error) {
	imported := make([]int64, 0, len(subjectIDs))
	failed := make(map[string]string)

	for _, subjectID := range subjectIDs {
		subject, rawPayload, err := r.fetchBangumiSubject(ctx, subjectID)
		if err != nil {
			failed[strconv.FormatInt(subjectID, 10)] = err.Error()
			continue
		}

		if err := r.upsertBangumiCollection(ctx, userID, subject, rawPayload, collectionStatus, visibility); err != nil {
			failed[strconv.FormatInt(subjectID, 10)] = err.Error()
			continue
		}

		imported = append(imported, subjectID)
	}

	payload := map[string]any{
		"requested_subject_ids": subjectIDs,
		"imported_subject_ids":  imported,
		"requested":             len(subjectIDs),
		"imported":              len(imported),
		"failed":                len(failed),
		"status":                collectionStatus,
		"visibility":            visibility,
	}
	if len(failed) > 0 {
		payload["failed_details"] = failed
	}

	if len(imported) == 0 {
		return payload, fmt.Errorf("all requested subjects failed to import")
	}

	return payload, nil
}

type bangumiUserCollectionPage struct {
	Data   []bangumiUserCollectionEntry `json:"data"`
	Total  int                          `json:"total"`
	Limit  int                          `json:"limit"`
	Offset int                          `json:"offset"`
}

type bangumiUserCollectionEntry struct {
	SubjectID int64           `json:"subject_id"`
	Type      int             `json:"type"`
	Subject   json.RawMessage `json:"subject"`
}

type bangumiCollectionSyncItem struct {
	SubjectID int64
	Status    string
	Subject   json.RawMessage
}

func (r *repository) importBangumiCollectionsByUsernameNow(
	ctx context.Context,
	userID int64,
	bangumiUsername string,
	visibility string,
	maxItems int,
) (map[string]any, error) {
	items, fetchedStatusCounts, err := r.fetchBangumiCollectionItemsByUsername(ctx, bangumiUsername, maxItems)
	if err != nil {
		return map[string]any{
			"sync_mode":        "account",
			"bangumi_username": bangumiUsername,
			"visibility":       visibility,
			"requested":        0,
			"imported":         0,
			"failed":           0,
		}, err
	}

	imported := make([]int64, 0, len(items))
	importedStatusCounts := make(map[string]int, 5)
	failed := make(map[string]string)

	for _, item := range items {
		subject, rawPayload, parseErr := parseBangumiSubjectPayload(item.Subject, item.SubjectID)
		if parseErr != nil {
			subject, rawPayload, parseErr = r.fetchBangumiSubject(ctx, item.SubjectID)
		}
		if parseErr != nil {
			failed[strconv.FormatInt(item.SubjectID, 10)] = parseErr.Error()
			continue
		}

		if err := r.upsertBangumiCollection(ctx, userID, subject, rawPayload, item.Status, visibility); err != nil {
			failed[strconv.FormatInt(item.SubjectID, 10)] = err.Error()
			continue
		}

		imported = append(imported, item.SubjectID)
		importedStatusCounts[item.Status]++
	}

	payload := map[string]any{
		"sync_mode":             "account",
		"bangumi_username":      bangumiUsername,
		"visibility":            visibility,
		"max_items":             maxItems,
		"requested":             len(items),
		"imported":              len(imported),
		"failed":                len(failed),
		"imported_subject_ids":  imported,
		"fetched_status_counts": fetchedStatusCounts,
		"imported_status_counts": map[string]int{
			"wish":    importedStatusCounts["wish"],
			"doing":   importedStatusCounts["doing"],
			"collect": importedStatusCounts["collect"],
			"on_hold": importedStatusCounts["on_hold"],
			"dropped": importedStatusCounts["dropped"],
		},
	}
	if len(failed) > 0 {
		payload["failed_details"] = failed
	}

	if len(imported) == 0 {
		return payload, fmt.Errorf("all fetched collections failed to import")
	}

	return payload, nil
}

func (r *repository) fetchBangumiCollectionItemsByUsername(
	ctx context.Context,
	bangumiUsername string,
	maxItems int,
) ([]bangumiCollectionSyncItem, map[string]int, error) {
	statusCounters := map[string]int{
		"wish":    0,
		"doing":   0,
		"collect": 0,
		"on_hold": 0,
		"dropped": 0,
	}

	items := make([]bangumiCollectionSyncItem, 0, maxItems)
	seenSubjectIDs := make(map[int64]struct{}, maxItems)
	collectionTypes := []int{1, 2, 3, 4, 5}

	for _, collectionType := range collectionTypes {
		offset := 0
		for len(items) < maxItems {
			pageItems, total, err := r.fetchBangumiCollectionPage(ctx, bangumiUsername, collectionType, bangumiCollectionPage, offset)
			if err != nil {
				return nil, statusCounters, err
			}
			if len(pageItems) == 0 {
				break
			}

			for _, item := range pageItems {
				if len(items) >= maxItems {
					break
				}
				if item.SubjectID <= 0 {
					continue
				}
				if _, exists := seenSubjectIDs[item.SubjectID]; exists {
					continue
				}
				seenSubjectIDs[item.SubjectID] = struct{}{}
				items = append(items, item)
				statusCounters[item.Status]++
			}

			offset += len(pageItems)
			if total > 0 && offset >= total {
				break
			}
			if len(pageItems) < bangumiCollectionPage {
				break
			}
		}

		if len(items) >= maxItems {
			break
		}
	}

	if len(items) == 0 {
		return nil, statusCounters, fmt.Errorf("no collections found for bangumi user: %s", bangumiUsername)
	}

	return items, statusCounters, nil
}

func (r *repository) fetchBangumiCollectionPage(
	ctx context.Context,
	bangumiUsername string,
	collectionType int,
	limit int,
	offset int,
) ([]bangumiCollectionSyncItem, int, error) {
	status, err := bangumiCollectionTypeToStatus(collectionType)
	if err != nil {
		return nil, 0, err
	}

	endpoint, err := url.JoinPath(r.bangumiAPIBaseURL, "users", bangumiUsername, "collections")
	if err != nil {
		return nil, 0, err
	}

	parsed, err := url.Parse(endpoint)
	if err != nil {
		return nil, 0, err
	}
	query := parsed.Query()
	query.Set("type", strconv.Itoa(collectionType))
	query.Set("limit", strconv.Itoa(limit))
	query.Set("offset", strconv.Itoa(offset))
	parsed.RawQuery = query.Encode()

	rawBody, statusCode, err := r.fetchBangumiJSON(ctx, parsed.String(), 4<<20)
	if err != nil {
		return nil, 0, err
	}
	if statusCode < http.StatusOK || statusCode >= http.StatusMultipleChoices {
		return nil, 0, fmt.Errorf("bangumi collections api %d: %s", statusCode, compactErrorBody(rawBody))
	}

	var page bangumiUserCollectionPage
	if err := json.Unmarshal(rawBody, &page); err != nil || page.Data == nil {
		var rawItems []bangumiUserCollectionEntry
		if err := json.Unmarshal(rawBody, &rawItems); err != nil {
			return nil, 0, fmt.Errorf("invalid bangumi collections response: %w", err)
		}
		page.Data = rawItems
		page.Total = len(rawItems)
	}

	items := make([]bangumiCollectionSyncItem, 0, len(page.Data))
	for _, entry := range page.Data {
		subjectID := entry.SubjectID
		if subjectID <= 0 {
			subjectID = bangumiSubjectIDFromRaw(entry.Subject)
		}
		if subjectID <= 0 {
			continue
		}

		nextStatus := status
		if mapped, mapErr := bangumiCollectionTypeToStatus(entry.Type); mapErr == nil {
			nextStatus = mapped
		}

		items = append(items, bangumiCollectionSyncItem{
			SubjectID: subjectID,
			Status:    nextStatus,
			Subject:   entry.Subject,
		})
	}

	return items, page.Total, nil
}

func (r *repository) fetchBangumiSubject(ctx context.Context, subjectID int64) (bangumiSubjectResponse, map[string]any, error) {
	endpoint, err := url.JoinPath(r.bangumiAPIBaseURL, "subjects", strconv.FormatInt(subjectID, 10))
	if err != nil {
		return bangumiSubjectResponse{}, nil, err
	}

	rawBody, statusCode, err := r.fetchBangumiJSON(ctx, endpoint, 2<<20)
	if err != nil {
		return bangumiSubjectResponse{}, nil, err
	}

	if statusCode < http.StatusOK || statusCode >= http.StatusMultipleChoices {
		return bangumiSubjectResponse{}, nil, fmt.Errorf("bangumi api %d: %s", statusCode, compactErrorBody(rawBody))
	}

	return parseBangumiSubjectPayload(rawBody, subjectID)
}

func (r *repository) fetchBangumiJSON(ctx context.Context, endpoint string, bodyLimit int64) ([]byte, int, error) {
	var lastErr error

	for attempt := 1; attempt <= bangumiHTTPMaxAttempts; attempt++ {
		if attempt > 1 {
			if err := waitForBangumiRetry(ctx, bangumiRetryDelay(attempt-1)); err != nil {
				return nil, 0, err
			}
		}

		req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
		if err != nil {
			return nil, 0, err
		}
		req.Header.Set("Accept", "application/json")
		req.Header.Set("User-Agent", r.bangumiAPIUserAgent)

		resp, err := r.bangumiHTTPClient.Do(req)
		if err != nil {
			if shouldRetryBangumiTransportError(err) && attempt < bangumiHTTPMaxAttempts {
				lastErr = err
				continue
			}
			return nil, 0, err
		}

		rawBody, readErr := io.ReadAll(io.LimitReader(resp.Body, bodyLimit))
		_ = resp.Body.Close()
		if readErr != nil {
			if shouldRetryBangumiTransportError(readErr) && attempt < bangumiHTTPMaxAttempts {
				lastErr = readErr
				continue
			}
			return nil, resp.StatusCode, readErr
		}

		if shouldRetryBangumiStatus(resp.StatusCode) && attempt < bangumiHTTPMaxAttempts {
			lastErr = fmt.Errorf("bangumi api %d: %s", resp.StatusCode, compactErrorBody(rawBody))
			continue
		}

		return rawBody, resp.StatusCode, nil
	}

	if lastErr != nil {
		return nil, 0, lastErr
	}

	return nil, 0, fmt.Errorf("bangumi request failed: %s", endpoint)
}

func shouldRetryBangumiTransportError(err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
		return false
	}

	var dnsErr *net.DNSError
	if errors.As(err, &dnsErr) {
		return true
	}

	var netErr net.Error
	if errors.As(err, &netErr) {
		return true
	}

	text := strings.ToLower(err.Error())
	return strings.Contains(text, "server misbehaving") ||
		strings.Contains(text, "no such host") ||
		strings.Contains(text, "i/o timeout") ||
		strings.Contains(text, "tls handshake timeout") ||
		strings.Contains(text, "connection reset")
}

func shouldRetryBangumiStatus(statusCode int) bool {
	return statusCode == http.StatusRequestTimeout ||
		statusCode == http.StatusTooManyRequests ||
		statusCode >= http.StatusInternalServerError
}

func bangumiRetryDelay(attempt int) time.Duration {
	switch attempt {
	case 1:
		return 350 * time.Millisecond
	case 2:
		return 1200 * time.Millisecond
	default:
		return 2500 * time.Millisecond
	}
}

func waitForBangumiRetry(ctx context.Context, delay time.Duration) error {
	timer := time.NewTimer(delay)
	defer timer.Stop()

	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-timer.C:
		return nil
	}
}

func parseBangumiSubjectPayload(rawBody []byte, fallbackSubjectID int64) (bangumiSubjectResponse, map[string]any, error) {
	if len(rawBody) == 0 {
		return bangumiSubjectResponse{}, nil, fmt.Errorf("empty bangumi subject payload")
	}

	var rawPayload map[string]any
	if err := json.Unmarshal(rawBody, &rawPayload); err != nil {
		return bangumiSubjectResponse{}, nil, err
	}

	var subject bangumiSubjectResponse
	if err := json.Unmarshal(rawBody, &subject); err != nil {
		return bangumiSubjectResponse{}, nil, err
	}

	if subject.ID == 0 {
		subject.ID = fallbackSubjectID
	}
	if subject.Type <= 0 {
		subject.Type = 2
	}
	subject.Name = strings.TrimSpace(subject.Name)
	if subject.Name == "" {
		subject.Name = fmt.Sprintf("Bangumi Subject %d", subject.ID)
	}
	subject.NameCN = strings.TrimSpace(subject.NameCN)
	subject.Summary = strings.TrimSpace(subject.Summary)
	subject.Platform = strings.TrimSpace(subject.Platform)

	return subject, rawPayload, nil
}

func bangumiSubjectURL(rawPayload map[string]any, subjectID int64) string {
	if rawPayload != nil {
		if rawURL, ok := rawPayload["url"].(string); ok {
			normalized := strings.TrimSpace(rawURL)
			if strings.HasPrefix(normalized, "http://") || strings.HasPrefix(normalized, "https://") {
				return normalized
			}
			if strings.HasPrefix(normalized, "/subject/") {
				return "https://bgm.tv" + normalized
			}
		}
	}

	if subjectID <= 0 {
		return ""
	}

	return fmt.Sprintf("%s/%d", bangumiSubjectWebBaseURL, subjectID)
}

func bangumiSubjectIDFromRaw(raw json.RawMessage) int64 {
	if len(raw) == 0 {
		return 0
	}

	var probe struct {
		ID        int64 `json:"id"`
		SubjectID int64 `json:"subject_id"`
	}
	if err := json.Unmarshal(raw, &probe); err != nil {
		return 0
	}
	if probe.ID > 0 {
		return probe.ID
	}
	if probe.SubjectID > 0 {
		return probe.SubjectID
	}
	return 0
}

func compactErrorBody(raw []byte) string {
	text := strings.TrimSpace(string(raw))
	if text == "" {
		return "empty response"
	}
	text = strings.ReplaceAll(text, "\n", " ")
	text = strings.Join(strings.Fields(text), " ")
	if len(text) > 240 {
		return text[:240] + "..."
	}
	return text
}

func selectBangumiCoverURL(images bangumiSubjectImages) string {
	candidates := []string{images.Large, images.Common, images.Medium, images.Small, images.Grid}
	for _, candidate := range candidates {
		value := strings.TrimSpace(candidate)
		if value != "" {
			return value
		}
	}
	return ""
}

func parseBangumiAirDate(value string) any {
	dateText := strings.TrimSpace(value)
	if dateText == "" {
		return nil
	}

	parsed, err := time.Parse("2006-01-02", dateText)
	if err != nil {
		return nil
	}
	return parsed
}

func uniqueNonEmptyStrings(items []string) []string {
	if len(items) == 0 {
		return []string{}
	}

	normalized := make([]string, 0, len(items))
	seen := make(map[string]struct{}, len(items))
	for _, item := range items {
		next := strings.TrimSpace(item)
		if next == "" {
			continue
		}
		if _, exists := seen[next]; exists {
			continue
		}
		seen[next] = struct{}{}
		normalized = append(normalized, next)
	}

	if len(normalized) == 0 {
		return []string{}
	}

	slices.Sort(normalized)
	return normalized
}

func (r *repository) upsertBangumiCollection(
	ctx context.Context,
	userID int64,
	subject bangumiSubjectResponse,
	rawPayload map[string]any,
	collectionStatus string,
	visibility string,
) error {
	subjectURL := bangumiSubjectURL(rawPayload, subject.ID)

	tagNames := make([]string, 0, len(subject.Tags))
	for _, tag := range subject.Tags {
		tagNames = append(tagNames, tag.Name)
	}
	tagNames = uniqueNonEmptyStrings(tagNames)

	platforms := uniqueNonEmptyStrings([]string{subject.Platform})
	coverURL := selectBangumiCoverURL(subject.Images)
	airDate := parseBangumiAirDate(subject.Date)

	var ratingScore any = nil
	if subject.Rating.Score > 0 {
		ratingScore = subject.Rating.Score
	}

	var rankNo any = nil
	if subject.Rating.Rank > 0 {
		rankNo = subject.Rating.Rank
	}

	extraJSON, err := json.Marshal(map[string]any{
		"rating_total": subject.Rating.Total,
		"images": map[string]any{
			"large":  strings.TrimSpace(subject.Images.Large),
			"common": strings.TrimSpace(subject.Images.Common),
			"medium": strings.TrimSpace(subject.Images.Medium),
			"small":  strings.TrimSpace(subject.Images.Small),
			"grid":   strings.TrimSpace(subject.Images.Grid),
		},
	})
	if err != nil {
		return err
	}

	rawJSON, err := json.Marshal(rawPayload)
	if err != nil {
		return err
	}

	var localSubjectID int64
	if err := r.platform.Postgres.QueryRowContext(
		ctx,
		`insert into bangumi_subjects (
			bgm_subject_id,
			subject_type,
			name,
			name_cn,
			summary,
			cover_image_url,
			air_date,
			rating_score,
			rank_no,
			tags,
			platforms,
			extra,
			raw_payload,
			synced_at,
			updated_at
		) values (
			$1, $2, $3, nullif($4, ''), nullif($5, ''), nullif($6, ''), $7, $8, $9,
			$10, $11, $12::jsonb, $13::jsonb, now(), now()
		)
		on conflict (bgm_subject_id) do update
		 set subject_type = excluded.subject_type,
		     name = excluded.name,
		     name_cn = excluded.name_cn,
		     summary = excluded.summary,
		     cover_image_url = excluded.cover_image_url,
		     air_date = excluded.air_date,
		     rating_score = excluded.rating_score,
		     rank_no = excluded.rank_no,
		     tags = excluded.tags,
		     platforms = excluded.platforms,
		     extra = excluded.extra,
		     raw_payload = excluded.raw_payload,
		     synced_at = now(),
		     updated_at = now()
		returning id`,
		subject.ID,
		subject.Type,
		subject.Name,
		subject.NameCN,
		subject.Summary,
		coverURL,
		airDate,
		ratingScore,
		rankNo,
		tagNames,
		platforms,
		string(extraJSON),
		string(rawJSON),
	).Scan(&localSubjectID); err != nil {
		return err
	}

	collectionRawJSON, err := json.Marshal(map[string]any{
		"source":            "bangumi_v0",
		"bgm_subject_id":    subject.ID,
		"subject_url":       subjectURL,
		"collection_status": collectionStatus,
		"visibility":        visibility,
	})
	if err != nil {
		return err
	}

	if _, err := r.platform.Postgres.ExecContext(
		ctx,
		`insert into user_bangumi_collections (
			user_id,
			subject_id,
			collection_status,
			display_visibility,
			raw_payload,
			synced_at,
			updated_at
		) values (
			$1, $2, $3::bangumi_collection_status, $4::visibility_level, $5::jsonb, now(), now()
		)
		on conflict (user_id, subject_id) do update
		 set collection_status = excluded.collection_status,
		     display_visibility = excluded.display_visibility,
		     raw_payload = excluded.raw_payload,
		     synced_at = now(),
		     updated_at = now()`,
		userID,
		localSubjectID,
		collectionStatus,
		visibility,
		string(collectionRawJSON),
	); err != nil {
		return err
	}

	return nil
}

func (r *repository) ListMyBangumiImportJobs(ctx context.Context, principal security.Principal, params pagination.Params) (pagination.Result[BangumiImportJob], error) {
	if !r.hasPostgres() {
		return pagination.Slice(scaffoldBangumiJobs(principal.Username), params), nil
	}

	userID, err := strconv.ParseInt(strings.TrimSpace(principal.UserID), 10, 64)
	if err != nil {
		record, loadErr := r.loadUserByUsername(ctx, principal.Username)
		if loadErr != nil {
			return pagination.Result[BangumiImportJob]{}, loadErr
		}
		userID = record.ID
	}

	return r.listBangumiJobs(ctx, params, &userID)
}

func (r *repository) ListMyBangumiCollections(ctx context.Context, principal security.Principal, params pagination.Params) (pagination.Result[BangumiCollection], error) {
	if !r.hasPostgres() {
		return pagination.Slice(scaffoldBangumiCollections(principal.Username), params), nil
	}

	userID, err := strconv.ParseInt(strings.TrimSpace(principal.UserID), 10, 64)
	if err != nil {
		record, loadErr := r.loadUserByUsername(ctx, principal.Username)
		if loadErr != nil {
			return pagination.Result[BangumiCollection]{}, loadErr
		}
		userID = record.ID
	}

	return r.listBangumiCollectionsByUserID(ctx, userID, params, false)
}

func (r *repository) ListUserBangumiCollections(ctx context.Context, username string, params pagination.Params) (pagination.Result[BangumiCollection], error) {
	if !r.hasPostgres() {
		return pagination.Slice(scaffoldBangumiCollections(username), params), nil
	}

	record, err := r.loadUserByUsername(ctx, username)
	if err != nil {
		return pagination.Result[BangumiCollection]{}, err
	}

	return r.listBangumiCollectionsByUserID(ctx, record.ID, params, true)
}

func (r *repository) listBangumiCollectionsByUserID(
	ctx context.Context,
	userID int64,
	params pagination.Params,
	onlyPublic bool,
) (pagination.Result[BangumiCollection], error) {
	countQuery := `select count(*)::int
	 from user_bangumi_collections
	 where user_id = $1`
	listQuery := `select
		ubc.id,
		ubc.subject_id,
		ubc.collection_status::text,
		ubc.display_visibility::text,
		ubc.synced_at,
		ubc.updated_at,
		bs.bgm_subject_id,
		bs.subject_type,
		bs.name,
		coalesce(bs.name_cn, ''),
		coalesce(bs.summary, ''),
		coalesce(bs.cover_image_url, ''),
		coalesce(to_char(bs.air_date, 'YYYY-MM-DD'), ''),
		bs.rating_score,
		bs.rank_no,
		coalesce(array_to_json(bs.platforms)::text, '[]'),
		coalesce(ubc.raw_payload::text, '{}')
	from user_bangumi_collections ubc
	join bangumi_subjects bs on bs.id = ubc.subject_id
	where ubc.user_id = $1`
	if onlyPublic {
		countQuery += ` and display_visibility = 'public'::visibility_level`
		listQuery += ` and ubc.display_visibility = 'public'::visibility_level`
	}

	listQuery += `
	order by ubc.updated_at desc, ubc.id desc
	limit $2 offset $3`

	var total int
	if err := r.platform.Postgres.QueryRowContext(
		ctx,
		countQuery,
		userID,
	).Scan(&total); err != nil {
		return pagination.Result[BangumiCollection]{}, err
	}

	rows, err := r.platform.Postgres.QueryContext(
		ctx,
		listQuery,
		userID,
		params.PageSize,
		params.Offset(),
	)
	if err != nil {
		return pagination.Result[BangumiCollection]{}, err
	}
	defer rows.Close()

	items := make([]BangumiCollection, 0, params.PageSize)
	for rows.Next() {
		item, scanErr := scanBangumiCollection(rows)
		if scanErr != nil {
			return pagination.Result[BangumiCollection]{}, scanErr
		}
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return pagination.Result[BangumiCollection]{}, err
	}

	return pagination.NewResult(items, total, params), nil
}

func (r *repository) UpdateMyBangumiCollection(
	ctx context.Context,
	principal security.Principal,
	collectionID string,
	input UpdateBangumiCollectionRequest,
) (BangumiCollection, error) {
	if !r.hasPostgres() {
		collections := scaffoldBangumiCollections(principal.Username)
		if len(collections) == 0 {
			return BangumiCollection{}, fmt.Errorf("bangumi collection %s not found", collectionID)
		}
		item := collections[0]
		item.CollectionID = strings.TrimSpace(collectionID)
		item.CollectionStatus = strings.TrimSpace(strings.ToLower(input.CollectionStatus))
		item.MyScore = input.MyScore
		item.MyComment = strings.TrimSpace(input.MyComment)
		return item, nil
	}

	userID, err := strconv.ParseInt(strings.TrimSpace(principal.UserID), 10, 64)
	if err != nil {
		record, loadErr := r.loadUserByUsername(ctx, principal.Username)
		if loadErr != nil {
			return BangumiCollection{}, loadErr
		}
		userID = record.ID
	}

	collectionIDInt, err := strconv.ParseInt(strings.TrimSpace(collectionID), 10, 64)
	if err != nil || collectionIDInt <= 0 {
		return BangumiCollection{}, fmt.Errorf("invalid collection id: %s", collectionID)
	}

	normalizedStatus, err := normalizeBangumiCollectionStatus(input.CollectionStatus)
	if err != nil {
		return BangumiCollection{}, err
	}

	var normalizedScore *int
	if input.MyScore != nil {
		if *input.MyScore < 1 || *input.MyScore > 10 {
			return BangumiCollection{}, fmt.Errorf("my_score must be between 1 and 10")
		}
		score := *input.MyScore
		normalizedScore = &score
	}

	normalizedComment := strings.TrimSpace(input.MyComment)
	if len(normalizedComment) > 200 {
		normalizedComment = normalizedComment[:200]
	}

	var rawPayloadText string
	if err := r.platform.Postgres.QueryRowContext(
		ctx,
		`select coalesce(raw_payload::text, '{}')
		 from user_bangumi_collections
		 where id = $1 and user_id = $2`,
		collectionIDInt,
		userID,
	).Scan(&rawPayloadText); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return BangumiCollection{}, fmt.Errorf("bangumi collection %s not found", collectionID)
		}
		return BangumiCollection{}, err
	}

	rawPayload := map[string]any{}
	if strings.TrimSpace(rawPayloadText) != "" {
		_ = json.Unmarshal([]byte(rawPayloadText), &rawPayload)
	}

	rawPayload["collection_status"] = normalizedStatus
	if normalizedScore != nil {
		rawPayload["my_score"] = *normalizedScore
	} else {
		delete(rawPayload, "my_score")
	}
	if normalizedComment != "" {
		rawPayload["my_comment"] = normalizedComment
	} else {
		delete(rawPayload, "my_comment")
	}

	nextRawPayloadJSON, err := json.Marshal(rawPayload)
	if err != nil {
		return BangumiCollection{}, err
	}

	row := r.platform.Postgres.QueryRowContext(
		ctx,
		`with updated as (
			update user_bangumi_collections
			   set collection_status = $3::bangumi_collection_status,
			       raw_payload = $4::jsonb,
			       updated_at = now()
			 where id = $1 and user_id = $2
			 returning
			 	id,
			 	subject_id,
			 	collection_status::text,
			 	display_visibility::text,
			 	synced_at,
			 	updated_at,
			 	coalesce(raw_payload::text, '{}') as raw_payload_text
		)
		select
			updated.id,
			updated.subject_id,
			updated.collection_status,
			updated.display_visibility,
			updated.synced_at,
			updated.updated_at,
			bs.bgm_subject_id,
			bs.subject_type,
			bs.name,
			coalesce(bs.name_cn, ''),
			coalesce(bs.summary, ''),
			coalesce(bs.cover_image_url, ''),
			coalesce(to_char(bs.air_date, 'YYYY-MM-DD'), ''),
			bs.rating_score,
			bs.rank_no,
			coalesce(array_to_json(bs.platforms)::text, '[]'),
			updated.raw_payload_text
		from updated
		join bangumi_subjects bs on bs.id = updated.subject_id`,
		collectionIDInt,
		userID,
		normalizedStatus,
		string(nextRawPayloadJSON),
	)

	item, err := scanBangumiCollection(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return BangumiCollection{}, fmt.Errorf("bangumi collection %s not found", collectionID)
		}
		return BangumiCollection{}, err
	}

	return item, nil
}

func (r *repository) ListBangumiImportJobs(ctx context.Context, principal security.Principal, params pagination.Params) (pagination.Result[BangumiImportJob], error) {
	if !r.hasPostgres() {
		return pagination.Slice(scaffoldBangumiJobs("rubedo_room"), params), nil
	}

	return r.listBangumiJobs(ctx, params, nil)
}

func (r *repository) UpdateBangumiImportJobStatus(ctx context.Context, principal security.Principal, jobID string, input UpdateBangumiJobStatusRequest) (BangumiImportJob, error) {
	if !r.hasPostgres() {
		jobs := scaffoldBangumiJobs(principal.Username)
		job := jobs[0]
		job.JobID = jobID
		job.Status = strings.TrimSpace(strings.ToLower(input.Status))
		job.ErrorMessage = strings.TrimSpace(input.ErrorMessage)
		job.ResultPayload = input.ResultPayload
		return job, nil
	}

	nextStatus := strings.TrimSpace(strings.ToLower(input.Status))
	switch nextStatus {
	case "queued", "running", "succeeded", "failed", "cancelled":
	default:
		return BangumiImportJob{}, fmt.Errorf("unsupported bangumi job status: %s", input.Status)
	}

	dbJobID, err := strconv.ParseInt(strings.TrimSpace(jobID), 10, 64)
	if err != nil {
		return BangumiImportJob{}, err
	}

	resultPayloadJSON := "{}"
	if input.ResultPayload != nil {
		raw, marshalErr := json.Marshal(input.ResultPayload)
		if marshalErr != nil {
			return BangumiImportJob{}, marshalErr
		}
		resultPayloadJSON = string(raw)
	}

	if _, err := r.platform.Postgres.ExecContext(
		ctx,
		`update bangumi_sync_jobs
		 set status = $2::sync_job_status,
		     result_payload = case
		         when $3::jsonb = '{}'::jsonb and result_payload <> '{}'::jsonb then result_payload
		         else $3::jsonb
		     end,
		     error_message = nullif($4, ''),
		     started_at = case
		         when $2 = 'running' and started_at is null then now()
		         else started_at
		     end,
		     finished_at = case
		         when $2 in ('succeeded', 'failed', 'cancelled') then now()
		         else finished_at
		     end,
		     updated_at = now()
		 where id = $1`,
		dbJobID,
		nextStatus,
		resultPayloadJSON,
		strings.TrimSpace(input.ErrorMessage),
	); err != nil {
		return BangumiImportJob{}, err
	}

	return r.getBangumiJobByID(ctx, dbJobID)
}

func (r *repository) listBangumiJobs(ctx context.Context, params pagination.Params, userID *int64) (pagination.Result[BangumiImportJob], error) {
	countQuery := `select count(*)::int from bangumi_sync_jobs`
	countArgs := make([]any, 0, 1)
	listQuery := `select
		bsj.id,
		bsj.user_id,
		coalesce(u.username, ''),
		coalesce(bsj.external_account_id, 0),
		bsj.job_type::text,
		bsj.status::text,
		bsj.request_payload::text,
		bsj.result_payload::text,
		coalesce(bsj.error_message, ''),
		bsj.started_at,
		bsj.finished_at,
		bsj.created_at,
		bsj.updated_at
	from bangumi_sync_jobs bsj
	left join users u on u.id = bsj.user_id`
	listArgs := make([]any, 0, 3)

	if userID != nil {
		countQuery += ` where user_id = $1`
		listQuery += ` where bsj.user_id = $1`
		countArgs = append(countArgs, *userID)
		listArgs = append(listArgs, *userID)
	}

	var total int
	if err := r.platform.Postgres.QueryRowContext(ctx, countQuery, countArgs...).Scan(&total); err != nil {
		return pagination.Result[BangumiImportJob]{}, err
	}

	orderClause := ` order by bsj.created_at desc, bsj.id desc`
	if userID != nil {
		listQuery += orderClause + ` limit $2 offset $3`
		listArgs = append(listArgs, params.PageSize, params.Offset())
	} else {
		listQuery += orderClause + ` limit $1 offset $2`
		listArgs = append(listArgs, params.PageSize, params.Offset())
	}

	rows, err := r.platform.Postgres.QueryContext(ctx, listQuery, listArgs...)
	if err != nil {
		return pagination.Result[BangumiImportJob]{}, err
	}
	defer rows.Close()

	items := make([]BangumiImportJob, 0)
	for rows.Next() {
		job, scanErr := scanBangumiJob(rows)
		if scanErr != nil {
			return pagination.Result[BangumiImportJob]{}, scanErr
		}
		items = append(items, job)
	}

	if err := rows.Err(); err != nil {
		return pagination.Result[BangumiImportJob]{}, err
	}

	return pagination.NewResult(items, total, params), nil
}

func (r *repository) getBangumiJobByID(ctx context.Context, jobID int64) (BangumiImportJob, error) {
	row := r.platform.Postgres.QueryRowContext(
		ctx,
		`select
			bsj.id,
			bsj.user_id,
			coalesce(u.username, ''),
			coalesce(bsj.external_account_id, 0),
			bsj.job_type::text,
			bsj.status::text,
			bsj.request_payload::text,
			bsj.result_payload::text,
			coalesce(bsj.error_message, ''),
			bsj.started_at,
			bsj.finished_at,
			bsj.created_at,
			bsj.updated_at
		from bangumi_sync_jobs bsj
		left join users u on u.id = bsj.user_id
		where bsj.id = $1`,
		jobID,
	)

	job, err := scanBangumiJob(row)
	if err != nil {
		if err == sql.ErrNoRows {
			return BangumiImportJob{}, fmt.Errorf("bangumi job %d not found", jobID)
		}
		return BangumiImportJob{}, err
	}

	return job, nil
}
