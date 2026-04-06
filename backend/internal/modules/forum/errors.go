package forum

import "errors"

var (
	ErrForumDisabled     = errors.New("论坛当前已关闭")
	ErrAnonymousDisabled = errors.New("匿名板当前已关闭")
)
