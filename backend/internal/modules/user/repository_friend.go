package user

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"example.com/rubedo/backend/internal/pagination"
	"example.com/rubedo/backend/internal/scaffold"
	"example.com/rubedo/backend/internal/security"
)

func (r *repository) ListFriends(
	ctx context.Context,
	principal security.Principal,
	params pagination.Params,
) (pagination.Result[FriendSummary], error) {
	if !r.hasPostgres() {
		return pagination.Result[FriendSummary]{}, fmt.Errorf("postgres unavailable for friend list")
	}

	userID, err := r.resolvePrincipalUserID(ctx, principal)
	if err != nil {
		return pagination.Result[FriendSummary]{}, err
	}

	return r.listFriendsByUserID(ctx, userID, params)
}

func (r *repository) ListUserFriends(
	ctx context.Context,
	username string,
	params pagination.Params,
) (pagination.Result[FriendSummary], error) {
	if !r.hasPostgres() {
		return pagination.Result[FriendSummary]{}, fmt.Errorf("postgres unavailable for friend list")
	}

	record, err := r.loadUserByPublicIdentifier(ctx, username)
	if err != nil {
		return pagination.Result[FriendSummary]{}, err
	}

	return r.listFriendsByUserID(ctx, record.ID, params)
}

func (r *repository) listFriendsByUserID(
	ctx context.Context,
	userID int64,
	params pagination.Params,
) (pagination.Result[FriendSummary], error) {
	var total int
	if err := r.platform.Postgres.QueryRowContext(
		ctx,
		`select count(*)::int
		 from user_friend_requests fr
		 where fr.deleted_at is null
		   and fr.status = $2
		   and (fr.requester_id = $1 or fr.receiver_id = $1)`,
		userID,
		friendStatusApproved,
	).Scan(&total); err != nil {
		return pagination.Result[FriendSummary]{}, err
	}

	rows, err := r.platform.Postgres.QueryContext(
		ctx,
		`select
			u.id,
			u.username,
			coalesce(nullif(u.nickname, ''), u.username) as nickname,
			coalesce(u.avatar_url, '') as avatar_url,
			coalesce(u.signature, '') as signature
		 from user_friend_requests fr
		 join users u on u.id = case
		 	when fr.requester_id = $1 then fr.receiver_id
		 	else fr.requester_id
		 end
		 where fr.deleted_at is null
		   and fr.status = $2
		   and (fr.requester_id = $1 or fr.receiver_id = $1)
		   and u.deleted_at is null
		 order by coalesce(fr.reviewed_at, fr.updated_at, fr.created_at) desc, fr.id desc
		 limit $3 offset $4`,
		userID,
		friendStatusApproved,
		params.PageSize,
		params.Offset(),
	)
	if err != nil {
		return pagination.Result[FriendSummary]{}, err
	}
	defer rows.Close()

	friends := make([]FriendSummary, 0)
	for rows.Next() {
		friend, scanErr := scanFriendSummary(rows)
		if scanErr != nil {
			return pagination.Result[FriendSummary]{}, scanErr
		}
		friends = append(friends, friend)
	}
	if err := rows.Err(); err != nil {
		return pagination.Result[FriendSummary]{}, err
	}

	return pagination.NewResult(friends, total, params), nil
}

func (r *repository) ListIncomingFriendRequests(
	ctx context.Context,
	principal security.Principal,
	params pagination.Params,
) (pagination.Result[FriendRequest], error) {
	if !r.hasPostgres() {
		return pagination.Result[FriendRequest]{}, fmt.Errorf("postgres unavailable for incoming friend request listing")
	}

	userID, err := r.resolvePrincipalUserID(ctx, principal)
	if err != nil {
		return pagination.Result[FriendRequest]{}, err
	}

	return r.listFriendRequestsByDirection(ctx, params, userID, true)
}

func (r *repository) ListOutgoingFriendRequests(
	ctx context.Context,
	principal security.Principal,
	params pagination.Params,
) (pagination.Result[FriendRequest], error) {
	if !r.hasPostgres() {
		return pagination.Result[FriendRequest]{}, fmt.Errorf("postgres unavailable for outgoing friend request listing")
	}

	userID, err := r.resolvePrincipalUserID(ctx, principal)
	if err != nil {
		return pagination.Result[FriendRequest]{}, err
	}

	return r.listFriendRequestsByDirection(ctx, params, userID, false)
}

func (r *repository) CreateFriendRequest(
	ctx context.Context,
	principal security.Principal,
	input CreateFriendRequest,
) (FriendRequest, error) {
	if !r.hasPostgres() {
		return FriendRequest{}, scaffold.ErrNotImplemented
	}

	requesterID, err := r.resolvePrincipalUserID(ctx, principal)
	if err != nil {
		return FriendRequest{}, err
	}

	targetUsername := strings.TrimSpace(input.Username)
	if targetUsername == "" {
		return FriendRequest{}, fmt.Errorf("friend username is required")
	}

	receiverRecord, err := r.loadUserByUsername(ctx, targetUsername)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return FriendRequest{}, fmt.Errorf("user %s not found", targetUsername)
		}
		return FriendRequest{}, err
	}

	if receiverRecord.ID == requesterID {
		return FriendRequest{}, fmt.Errorf("cannot send friend request to yourself")
	}

	var (
		existingRequestID int64
		existingStatus    string
		existingRequester int64
	)
	err = r.platform.Postgres.QueryRowContext(
		ctx,
		`select id, status, requester_id
		 from user_friend_requests
		 where deleted_at is null
		   and (
		     (requester_id = $1 and receiver_id = $2)
		     or (requester_id = $2 and receiver_id = $1)
		   )
		   and status in ($3, $4)
		 order by
		   case when status = $3 then 0 else 1 end,
		   created_at desc,
		   id desc
		 limit 1`,
		requesterID,
		receiverRecord.ID,
		friendStatusPending,
		friendStatusApproved,
	).Scan(&existingRequestID, &existingStatus, &existingRequester)
	if err == nil {
		switch existingStatus {
		case friendStatusApproved:
			return FriendRequest{}, fmt.Errorf("you are already friends")
		case friendStatusPending:
			if existingRequester == requesterID {
				return FriendRequest{}, fmt.Errorf("friend request already sent")
			}
			return FriendRequest{}, fmt.Errorf("the other user has already sent you a request, please review it first")
		default:
			return FriendRequest{}, fmt.Errorf("friend request already exists")
		}
	}
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return FriendRequest{}, err
	}

	normalizedMessage := strings.TrimSpace(input.Message)
	if len([]rune(normalizedMessage)) > friendRequestMsgMaxChars {
		normalizedMessage = string([]rune(normalizedMessage)[:friendRequestMsgMaxChars])
	}

	var requestID int64
	if err := r.platform.Postgres.QueryRowContext(
		ctx,
		`insert into user_friend_requests (
			requester_id,
			receiver_id,
			status,
			message
		) values ($1, $2, $3, $4)
		returning id`,
		requesterID,
		receiverRecord.ID,
		friendStatusPending,
		normalizedMessage,
	).Scan(&requestID); err != nil {
		return FriendRequest{}, err
	}

	return r.getFriendRequestByID(ctx, requestID)
}

func (r *repository) ReviewFriendRequest(
	ctx context.Context,
	principal security.Principal,
	requestID string,
	input ReviewFriendRequest,
) (ReviewFriendRequestResult, error) {
	if !r.hasPostgres() {
		return ReviewFriendRequestResult{}, scaffold.ErrNotImplemented
	}

	reviewerID, err := r.resolvePrincipalUserID(ctx, principal)
	if err != nil {
		return ReviewFriendRequestResult{}, err
	}

	dbRequestID, err := strconv.ParseInt(strings.TrimSpace(requestID), 10, 64)
	if err != nil || dbRequestID <= 0 {
		return ReviewFriendRequestResult{}, fmt.Errorf("invalid friend request id")
	}

	action := strings.ToLower(strings.TrimSpace(input.Action))
	nextStatus := ""
	switch action {
	case "approve", "approved":
		nextStatus = friendStatusApproved
	case "reject", "rejected", "deny", "decline":
		nextStatus = friendStatusRejected
	default:
		return ReviewFriendRequestResult{}, fmt.Errorf("unsupported review action: %s", input.Action)
	}

	tx, err := r.platform.Postgres.BeginTx(ctx, nil)
	if err != nil {
		return ReviewFriendRequestResult{}, err
	}
	defer func() {
		_ = tx.Rollback()
	}()

	var (
		existingRequesterID int64
		existingReceiverID  int64
		existingStatus      string
	)
	if err := tx.QueryRowContext(
		ctx,
		`select requester_id, receiver_id, status
		 from user_friend_requests
		 where id = $1
		   and deleted_at is null
		 for update`,
		dbRequestID,
	).Scan(&existingRequesterID, &existingReceiverID, &existingStatus); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ReviewFriendRequestResult{}, fmt.Errorf("friend request %s not found", requestID)
		}
		return ReviewFriendRequestResult{}, err
	}

	if existingReceiverID != reviewerID {
		return ReviewFriendRequestResult{}, fmt.Errorf("only receiver can review this friend request")
	}
	if existingStatus != friendStatusPending {
		return ReviewFriendRequestResult{}, fmt.Errorf("friend request already processed")
	}

	if nextStatus == friendStatusApproved {
		var approvedExists bool
		if err := tx.QueryRowContext(
			ctx,
			`select exists(
				select 1
				from user_friend_requests
				where deleted_at is null
				  and status = $3
				  and id <> $1
				  and (
				    (requester_id = $2 and receiver_id = $4)
				    or (requester_id = $4 and receiver_id = $2)
				  )
			)`,
			dbRequestID,
			existingRequesterID,
			friendStatusApproved,
			existingReceiverID,
		).Scan(&approvedExists); err != nil {
			return ReviewFriendRequestResult{}, err
		}
		if approvedExists {
			return ReviewFriendRequestResult{}, fmt.Errorf("users are already friends")
		}
	}

	if _, err := tx.ExecContext(
		ctx,
		`update user_friend_requests
		 set status = $2,
		     reviewed_by = $3,
		     reviewed_at = now(),
		     updated_at = now()
		 where id = $1`,
		dbRequestID,
		nextStatus,
		reviewerID,
	); err != nil {
		return ReviewFriendRequestResult{}, err
	}

	if err := tx.Commit(); err != nil {
		return ReviewFriendRequestResult{}, err
	}

	return ReviewFriendRequestResult{
		RequestID: strconv.FormatInt(dbRequestID, 10),
		Status:    nextStatus,
	}, nil
}

func (r *repository) listFriendRequestsByDirection(
	ctx context.Context,
	params pagination.Params,
	userID int64,
	incoming bool,
) (pagination.Result[FriendRequest], error) {
	countQuery := `select count(*)::int
		from user_friend_requests
		where deleted_at is null
		  and status = $2
		  and requester_id = $1`
	dataQuery := `select
			fr.id,
			fr.requester_id,
			req.username,
			coalesce(nullif(req.nickname, ''), req.username) as requester_nickname,
			coalesce(req.avatar_url, '') as requester_avatar,
			fr.receiver_id,
			recv.username,
			coalesce(nullif(recv.nickname, ''), recv.username) as receiver_nickname,
			coalesce(recv.avatar_url, '') as receiver_avatar,
			fr.status,
			coalesce(fr.message, '') as message,
			fr.created_at,
			fr.reviewed_at
		from user_friend_requests fr
		join users req on req.id = fr.requester_id
		join users recv on recv.id = fr.receiver_id
		where fr.deleted_at is null
		  and fr.status = $2
		  and fr.requester_id = $1
		order by fr.created_at desc, fr.id desc
		limit $3 offset $4`
	if incoming {
		countQuery = `select count(*)::int
			from user_friend_requests
			where deleted_at is null
			  and status = $2
			  and receiver_id = $1`
		dataQuery = `select
				fr.id,
				fr.requester_id,
				req.username,
				coalesce(nullif(req.nickname, ''), req.username) as requester_nickname,
				coalesce(req.avatar_url, '') as requester_avatar,
				fr.receiver_id,
				recv.username,
				coalesce(nullif(recv.nickname, ''), recv.username) as receiver_nickname,
				coalesce(recv.avatar_url, '') as receiver_avatar,
				fr.status,
				coalesce(fr.message, '') as message,
				fr.created_at,
				fr.reviewed_at
			from user_friend_requests fr
			join users req on req.id = fr.requester_id
			join users recv on recv.id = fr.receiver_id
			where fr.deleted_at is null
			  and fr.status = $2
			  and fr.receiver_id = $1
			order by fr.created_at desc, fr.id desc
			limit $3 offset $4`
	}

	var total int
	if err := r.platform.Postgres.QueryRowContext(
		ctx,
		countQuery,
		userID,
		friendStatusPending,
	).Scan(&total); err != nil {
		return pagination.Result[FriendRequest]{}, err
	}

	rows, err := r.platform.Postgres.QueryContext(
		ctx,
		dataQuery,
		userID,
		friendStatusPending,
		params.PageSize,
		params.Offset(),
	)
	if err != nil {
		return pagination.Result[FriendRequest]{}, err
	}
	defer rows.Close()

	requests := make([]FriendRequest, 0)
	for rows.Next() {
		request, scanErr := scanFriendRequest(rows)
		if scanErr != nil {
			return pagination.Result[FriendRequest]{}, scanErr
		}
		requests = append(requests, request)
	}
	if err := rows.Err(); err != nil {
		return pagination.Result[FriendRequest]{}, err
	}

	return pagination.NewResult(requests, total, params), nil
}

func (r *repository) getFriendRequestByID(ctx context.Context, requestID int64) (FriendRequest, error) {
	row := r.platform.Postgres.QueryRowContext(
		ctx,
		`select
			fr.id,
			fr.requester_id,
			req.username,
			coalesce(nullif(req.nickname, ''), req.username) as requester_nickname,
			coalesce(req.avatar_url, '') as requester_avatar,
			fr.receiver_id,
			recv.username,
			coalesce(nullif(recv.nickname, ''), recv.username) as receiver_nickname,
			coalesce(recv.avatar_url, '') as receiver_avatar,
			fr.status,
			coalesce(fr.message, '') as message,
			fr.created_at,
			fr.reviewed_at
		 from user_friend_requests fr
		 join users req on req.id = fr.requester_id
		 join users recv on recv.id = fr.receiver_id
		 where fr.id = $1
		   and fr.deleted_at is null
		 limit 1`,
		requestID,
	)

	result, err := scanFriendRequest(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return FriendRequest{}, fmt.Errorf("friend request %d not found", requestID)
		}
		return FriendRequest{}, err
	}

	return result, nil
}
