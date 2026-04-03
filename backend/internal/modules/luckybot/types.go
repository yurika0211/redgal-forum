package luckybot

type ChatRequest struct {
	Message   string `json:"message" binding:"required"`
	SessionID string `json:"session_id"`
}

type ChatResult struct {
	SessionID string `json:"session_id"`
	Reply     string `json:"reply"`
	Model     string `json:"model"`
}

type ReloadResult struct {
	Status string `json:"status"`
}
