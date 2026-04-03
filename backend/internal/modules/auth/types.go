package auth

type RegisterRequest struct {
	StudentID string `json:"student_id" binding:"required"`
	Username  string `json:"username" binding:"required"`
	Password  string `json:"password" binding:"required"`
}

type RegisterResult struct {
	UserID   string   `json:"user_id"`
	Username string   `json:"username"`
	Status   string   `json:"status"`
	Verified bool     `json:"verified"`
	Roles    []string `json:"roles"`
}

type LoginRequest struct {
	Account  string `json:"account" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type Session struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
}
