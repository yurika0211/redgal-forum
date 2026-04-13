package user

import (
	"database/sql"
	"errors"
	"strings"

	"github.com/jackc/pgx/v5"
)

func isNoRowsError(err error) bool {
	if err == nil {
		return false
	}

	if errors.Is(err, sql.ErrNoRows) || errors.Is(err, pgx.ErrNoRows) {
		return true
	}

	return strings.Contains(strings.ToLower(err.Error()), "no rows in result set")
}
