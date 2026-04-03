package auth

import "errors"

var (
	ErrInvalidCredentials    = errors.New("invalid credentials")
	ErrScaffoldLoginDisabled = errors.New("scaffold login is disabled")
)
