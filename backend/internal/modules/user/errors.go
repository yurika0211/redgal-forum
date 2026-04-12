package user

import "errors"

var (
	ErrInvalidProfileInput       = errors.New("invalid profile input")
	ErrUsernameAlreadyExists     = errors.New("username already exists")
	ErrSpaceIDChangeLimitReached = errors.New("space id can only be changed once")
	ErrUserNotFound              = errors.New("user not found")
	ErrUnsupportedModeration     = errors.New("unsupported moderation action")
	ErrModerationForbidden       = errors.New("moderation action forbidden")
	ErrModerationSelf            = errors.New("cannot moderate yourself")
	ErrAdminRoleRequired         = errors.New("admin role required")
	ErrSuperAdminRoleRequired    = errors.New("super admin role required")
)
