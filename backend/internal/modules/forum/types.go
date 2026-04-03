package forum

type Thread struct {
	ID         string   `json:"id"`
	Title      string   `json:"title"`
	Content    string   `json:"content"`
	Board      string   `json:"board"`
	Anonymous  bool     `json:"anonymous"`
	Author     string   `json:"author"`
	Tags       []string `json:"tags"`
	ReplyCount int      `json:"reply_count"`
}

type Reply struct {
	ID        string `json:"id"`
	ThreadID  string `json:"thread_id"`
	Content   string `json:"content"`
	Author    string `json:"author"`
	Anonymous bool   `json:"anonymous"`
}

type ThreadDetail struct {
	Thread  Thread  `json:"thread"`
	Replies []Reply `json:"replies"`
}

type CreateThreadRequest struct {
	Title     string   `json:"title" binding:"required"`
	Content   string   `json:"content" binding:"required"`
	Board     string   `json:"board" binding:"required"`
	Anonymous bool     `json:"anonymous"`
	Tags      []string `json:"tags"`
}

type CreateReplyRequest struct {
	Content   string `json:"content" binding:"required"`
	Anonymous bool   `json:"anonymous"`
}
