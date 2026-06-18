package apidocs

func BuildOpenAPISpec() map[string]any {
	return map[string]any{
		"openapi": "3.0.3",
		"info": map[string]any{
			"title":       "Rubedo Forum API",
			"version":     "1.0.0",
			"description": "Swagger documentation for the Rubedo Forum backend. API responses are wrapped as { ok, request_id, data } or { ok, request_id, error }.",
		},
		"servers": []any{
			map[string]any{"url": "/api/v1", "description": "Current backend API prefix"},
		},
		"tags": []any{
			tag("Health"),
			tag("Auth"),
			tag("Users"),
			tag("Admin"),
			tag("Articles"),
			tag("Activities"),
			tag("Forum"),
			tag("Site"),
			tag("Wall"),
		},
		"paths": paths(),
		"components": map[string]any{
			"securitySchemes": map[string]any{
				"bearerAuth": map[string]any{
					"type":         "http",
					"scheme":       "bearer",
					"bearerFormat": "JWT",
				},
			},
			"schemas": schemas(),
		},
	}
}

func paths() map[string]any {
	return map[string]any{
		"/health": map[string]any{
			"get": operation("Health", "getHealth", "Check service health", false, nil, nil, "200"),
		},
		"/auth/register": map[string]any{
			"post": operation("Auth", "register", "Register a user", false, nil, jsonBody("RegisterRequest", true), "201"),
		},
		"/auth/login": map[string]any{
			"post": operation("Auth", "login", "Create a login session", false, nil, jsonBody("LoginRequest", true), "200"),
		},
		"/auth/logout": map[string]any{
			"post": operation("Auth", "logout", "Logout current session", true, nil, nil, "200"),
		},
		"/users/{username}": map[string]any{
			"get": operation("Users", "getUserProfile", "Get public user profile", false, []any{pathParam("username")}, nil, "200"),
		},
		"/users/{username}/friends": map[string]any{
			"get": operation("Users", "listUserFriends", "List public friends for a user", false, append([]any{pathParam("username")}, pageParams()...), nil, "200"),
		},
		"/users/{username}/bangumi/collections": map[string]any{
			"get": operation("Users", "listUserBangumiCollections", "List public Bangumi collections for a user", false, append([]any{pathParam("username")}, pageParams()...), nil, "200"),
		},
		"/users/me": map[string]any{
			"get":   operation("Users", "getMe", "Get current user profile", true, nil, nil, "200"),
			"patch": operation("Users", "updateMe", "Update current user profile", true, nil, jsonBody("UpdateProfileRequest", true), "200"),
		},
		"/users/me/friends": map[string]any{
			"get": operation("Users", "listMyFriends", "List current user's friends", true, pageParams(), nil, "200"),
		},
		"/users/me/friend-requests/incoming": map[string]any{
			"get": operation("Users", "listIncomingFriendRequests", "List incoming friend requests", true, pageParams(), nil, "200"),
		},
		"/users/me/friend-requests/outgoing": map[string]any{
			"get": operation("Users", "listOutgoingFriendRequests", "List outgoing friend requests", true, pageParams(), nil, "200"),
		},
		"/users/me/friend-requests": map[string]any{
			"post": operation("Users", "createFriendRequest", "Create a friend request", true, nil, jsonBody("CreateFriendRequest", true), "201"),
		},
		"/users/me/friend-requests/{requestID}/review": map[string]any{
			"post": operation("Users", "reviewFriendRequest", "Review a friend request", true, []any{pathParam("requestID")}, jsonBody("ReviewFriendRequest", true), "200"),
		},
		"/users/me/bangumi/import": map[string]any{
			"post": operation("Users", "importBangumi", "Queue a Bangumi collection import", true, nil, jsonBody("BangumiImportRequest", true), "202"),
		},
		"/users/me/bangumi/jobs": map[string]any{
			"get": operation("Users", "listMyBangumiImportJobs", "List current user's Bangumi import jobs", true, pageParams(), nil, "200"),
		},
		"/users/me/bangumi/collections": map[string]any{
			"get": operation("Users", "listMyBangumiCollections", "List current user's Bangumi collections", true, pageParams(), nil, "200"),
		},
		"/users/me/bangumi/collections/{collectionID}": map[string]any{
			"patch": operation("Users", "updateMyBangumiCollection", "Update one Bangumi collection", true, []any{pathParam("collectionID")}, jsonBody("UpdateBangumiCollectionRequest", true), "200"),
		},
		"/admin/dashboard": map[string]any{
			"get": operation("Admin", "getAdminDashboard", "Get admin dashboard metrics", true, nil, nil, "200"),
		},
		"/admin/users": map[string]any{
			"get": operation("Admin", "listAdminUsers", "List users for admin management", true, pageParams(), nil, "200"),
		},
		"/admin/bangumi/jobs": map[string]any{
			"get": operation("Admin", "listBangumiImportJobs", "List all Bangumi import jobs", true, pageParams(), nil, "200"),
		},
		"/admin/users/{userID}/status": map[string]any{
			"patch": operation("Admin", "updateUserStatus", "Update user account status", true, []any{pathParam("userID")}, jsonBody("UpdateUserStatusRequest", true), "200"),
		},
		"/admin/users/{userID}/moderation": map[string]any{
			"post": operation("Admin", "moderateUser", "Run a moderation action on a user", true, []any{pathParam("userID")}, jsonBody("ModerateUserRequest", true), "200"),
		},
		"/admin/users/{userID}/verification/reviews": map[string]any{
			"post": operation("Admin", "reviewVerification", "Review user verification", true, []any{pathParam("userID")}, jsonBody("VerificationDecisionRequest", true), "200"),
		},
		"/super-admin/dashboard": map[string]any{
			"get": operation("Admin", "getSuperAdminDashboard", "Get super-admin dashboard metrics", true, nil, nil, "200"),
		},
		"/articles": map[string]any{
			"get":  operation("Articles", "listArticles", "List articles", false, searchPageParams(), nil, "200"),
			"post": operation("Articles", "createArticle", "Create an article", true, nil, jsonBody("CreateArticleRequest", true), "201"),
		},
		"/articles/{articleID}": map[string]any{
			"get":   operation("Articles", "getArticle", "Get an article", false, []any{pathParam("articleID")}, nil, "200"),
			"patch": operation("Articles", "updateArticle", "Update an article", true, []any{pathParam("articleID")}, jsonBody("UpdateArticleRequest", true), "200"),
		},
		"/admin/articles/{articleID}": map[string]any{
			"delete": operation("Articles", "deleteArticle", "Delete an article", true, []any{pathParam("articleID")}, nil, "200"),
		},
		"/activities/relays": map[string]any{
			"get": operation("Activities", "listRelays", "List relay events", false, pageParams(), nil, "200"),
		},
		"/activities/relays/{relayID}": map[string]any{
			"get": operation("Activities", "getRelay", "Get relay event detail", false, []any{pathParam("relayID")}, nil, "200"),
		},
		"/activities/relays/{relayID}/entries": map[string]any{
			"post": operation("Activities", "createRelayEntry", "Create a relay entry", true, []any{pathParam("relayID")}, jsonBody("CreateRelayEntryRequest", true), "201"),
		},
		"/activities/contests": map[string]any{
			"get": operation("Activities", "listWritingContests", "List writing contests", false, pageParams(), nil, "200"),
		},
		"/activities/contests/{contestID}": map[string]any{
			"get": operation("Activities", "getWritingContest", "Get writing contest detail", false, []any{pathParam("contestID")}, nil, "200"),
		},
		"/activities/contests/{contestID}/submissions": map[string]any{
			"post": operation("Activities", "createWritingSubmission", "Create a writing contest submission", true, []any{pathParam("contestID")}, jsonBody("CreateWritingSubmissionRequest", true), "201"),
		},
		"/admin/activities/relays": map[string]any{
			"post": operation("Activities", "createRelay", "Create a relay event", true, nil, jsonBody("CreateRelayRequest", true), "201"),
		},
		"/admin/activities/relays/{relayID}/status": map[string]any{
			"patch": operation("Activities", "updateRelayStatus", "Update relay event status", true, []any{pathParam("relayID")}, jsonBody("UpdateRelayStatusRequest", true), "200"),
		},
		"/admin/activities/contests": map[string]any{
			"post": operation("Activities", "createWritingContest", "Create a writing contest", true, nil, jsonBody("CreateWritingContestRequest", true), "201"),
		},
		"/admin/activities/contests/{contestID}/status": map[string]any{
			"patch": operation("Activities", "updateWritingContestStatus", "Update writing contest status", true, []any{pathParam("contestID")}, jsonBody("UpdateWritingContestStatusRequest", true), "200"),
		},
		"/forum/threads": map[string]any{
			"get":  operation("Forum", "listThreads", "List forum threads", false, searchPageParams(), nil, "200"),
			"post": operation("Forum", "createThread", "Create a forum thread", true, nil, jsonBody("CreateThreadRequest", true), "201"),
		},
		"/forum/threads/{threadID}": map[string]any{
			"get": operation("Forum", "getThread", "Get forum thread detail", false, []any{pathParam("threadID")}, nil, "200"),
		},
		"/forum/threads/{threadID}/replies": map[string]any{
			"post": operation("Forum", "createReply", "Create a forum reply", true, []any{pathParam("threadID")}, jsonBody("CreateReplyRequest", true), "201"),
		},
		"/forum/threads/{threadID}/engagement": map[string]any{
			"patch": operation("Forum", "updateThreadEngagement", "Like or favorite a thread", true, []any{pathParam("threadID")}, jsonBody("UpdateThreadEngagementRequest", true), "200"),
		},
		"/forum/me/progression": map[string]any{
			"get": operation("Forum", "getForumProgress", "Get forum progression for current user", true, nil, nil, "200"),
		},
		"/forum/me/thread-reply-snapshots": map[string]any{
			"get": operation("Forum", "listMyThreadReplySnapshots", "List current user's thread reply snapshots", true, pageParams(), nil, "200"),
		},
		"/forum/me/favorites": map[string]any{
			"get": operation("Forum", "listMyFavoritedThreads", "List current user's favorited threads", true, pageParams(), nil, "200"),
		},
		"/forum/sign-in": map[string]any{
			"post": operation("Forum", "forumSignIn", "Sign in for forum experience", true, nil, nil, "200"),
		},
		"/forum/anonymous/threads": map[string]any{
			"get":  operation("Forum", "listAnonymousThreads", "List anonymous board threads", true, []any{queryParam("q", "Search keyword", false)}, nil, "200"),
			"post": operation("Forum", "createAnonymousThread", "Create an anonymous thread", true, nil, jsonBody("CreateThreadRequest", true), "201"),
		},
		"/forum/anonymous/threads/{threadID}": map[string]any{
			"get": operation("Forum", "getAnonymousThread", "Get anonymous thread detail", true, []any{pathParam("threadID")}, nil, "200"),
		},
		"/forum/anonymous/threads/{threadID}/replies": map[string]any{
			"post": operation("Forum", "createAnonymousReply", "Create an anonymous reply", true, []any{pathParam("threadID")}, jsonBody("CreateReplyRequest", true), "201"),
		},
		"/admin/forum/threads/{threadID}": map[string]any{
			"delete": operation("Forum", "deleteThread", "Delete a forum thread", true, []any{pathParam("threadID")}, nil, "200"),
		},
		"/admin/forum/threads/{threadID}/replies/{replyID}": map[string]any{
			"delete": operation("Forum", "deleteReply", "Delete a forum reply", true, []any{pathParam("threadID"), pathParam("replyID")}, nil, "200"),
		},
		"/super-admin/forum/settings": map[string]any{
			"get":   operation("Forum", "getForumAvailabilitySettings", "Get forum availability settings", true, nil, nil, "200"),
			"patch": operation("Forum", "updateForumAvailabilitySettings", "Update forum availability settings", true, nil, jsonBody("UpdateAvailabilitySettingsRequest", true), "200"),
		},
		"/site/content": map[string]any{
			"get": operation("Site", "getSiteContent", "Get aggregated public site content", false, nil, nil, "200"),
		},
		"/admin/site/content-blocks": map[string]any{
			"get":  operation("Site", "listContentBlocks", "List site content blocks", true, pageParams(), nil, "200"),
			"post": operation("Site", "createContentBlock", "Create a site content block", true, nil, jsonBody("CreateContentBlockRequest", true), "201"),
		},
		"/admin/site/content-blocks/{blockID}": map[string]any{
			"patch":  operation("Site", "updateContentBlock", "Update a site content block", true, []any{pathParam("blockID")}, jsonBody("UpdateContentBlockRequest", true), "200"),
			"delete": operation("Site", "deleteContentBlock", "Delete a site content block", true, []any{pathParam("blockID")}, nil, "200"),
		},
		"/admin/site/gallery-entries": map[string]any{
			"get":  operation("Site", "listGalleryEntries", "List gallery entries", true, pageParams(), nil, "200"),
			"post": operation("Site", "createGalleryEntry", "Create a gallery entry", true, nil, jsonBody("CreateGalleryEntryRequest", true), "201"),
		},
		"/admin/site/gallery-entries/{entryID}": map[string]any{
			"patch":  operation("Site", "updateGalleryEntry", "Update a gallery entry", true, []any{pathParam("entryID")}, jsonBody("UpdateGalleryEntryRequest", true), "200"),
			"delete": operation("Site", "deleteGalleryEntry", "Delete a gallery entry", true, []any{pathParam("entryID")}, nil, "200"),
		},
		"/admin/site/gallery-assets": map[string]any{
			"post": operation("Site", "uploadGalleryAssets", "Upload gallery assets", true, nil, multipartBody(), "201"),
		},
		"/wall": map[string]any{
			"get": operation("Wall", "listWallEntries", "List approved wall entries", false, pageParams(), nil, "200"),
		},
		"/wall/submissions": map[string]any{
			"get":  operation("Wall", "listWallSubmissions", "List wall submissions for moderation", true, pageParams(), nil, "200"),
			"post": operation("Wall", "createWallSubmission", "Create a wall submission", true, nil, jsonBody("CreateSubmissionRequest", true), "201"),
		},
		"/wall/submissions/{submissionID}/review": map[string]any{
			"post": operation("Wall", "reviewWallSubmission", "Review a wall submission", true, []any{pathParam("submissionID")}, jsonBody("ReviewSubmissionRequest", true), "200"),
		},
	}
}

func schemas() map[string]any {
	return map[string]any{
		"ApiEnvelope": objectSchema(map[string]any{
			"ok":         boolSchema(),
			"request_id": str(),
			"data":       map[string]any{"nullable": true},
		}, "ok", "request_id"),
		"ErrorEnvelope": objectSchema(map[string]any{
			"ok":         boolSchema(),
			"request_id": str(),
			"error":      str(),
		}, "ok", "request_id", "error"),
		"RegisterRequest": objectSchema(map[string]any{
			"student_id": str(),
			"username":   str(),
			"password":   stringFormat("password"),
		}, "student_id", "username", "password"),
		"LoginRequest": objectSchema(map[string]any{
			"account":  str(),
			"password": stringFormat("password"),
		}, "account", "password"),
		"UpdateProfileRequest": objectSchema(map[string]any{
			"username":   str(),
			"nickname":   str(),
			"signature":  str(),
			"bio":        str(),
			"avatar_url": str(),
		}),
		"BangumiImportRequest": objectSchema(map[string]any{
			"subject_ids":      arrayOf(intSchema()),
			"status":           strEnum("wish", "doing", "collect", "on_hold", "dropped"),
			"visibility":       strEnum("public", "members", "private"),
			"sync_mode":        strEnum("subject_ids", "account"),
			"bangumi_username": str(),
			"max_items":        intSchema(),
		}),
		"UpdateBangumiCollectionRequest": objectSchema(map[string]any{
			"collection_status": strEnum("wish", "doing", "collect", "on_hold", "dropped"),
			"my_score":          nullable(intSchema()),
			"my_comment":        str(),
		}, "collection_status"),
		"CreateFriendRequest": objectSchema(map[string]any{
			"username": str(),
			"message":  str(),
		}, "username"),
		"ReviewFriendRequest": objectSchema(map[string]any{
			"action": strEnum("approve", "reject"),
		}, "action"),
		"UpdateUserStatusRequest": objectSchema(map[string]any{
			"status": str(),
		}, "status"),
		"ModerateUserRequest": objectSchema(map[string]any{
			"action": strEnum("mute", "unmute", "ban", "unban", "demote"),
		}, "action"),
		"VerificationDecisionRequest": objectSchema(map[string]any{
			"action": str(),
			"note":   str(),
		}, "action"),
		"CreateArticleRequest": objectSchema(map[string]any{
			"title":      str(),
			"summary":    str(),
			"content":    str(),
			"visibility": strEnum("public", "member", "private"),
			"tags":       arrayOf(str()),
		}, "title", "content", "visibility"),
		"UpdateArticleRequest": objectSchema(map[string]any{
			"title":      str(),
			"summary":    str(),
			"content":    str(),
			"visibility": strEnum("public", "member", "private"),
			"tags":       arrayOf(str()),
		}),
		"CreateRelayRequest": objectSchema(map[string]any{
			"title":            str(),
			"description":      str(),
			"rules":            str(),
			"allow_unverified": boolSchema(),
			"starts_at":        nullable(stringFormat("date-time")),
			"ends_at":          nullable(stringFormat("date-time")),
		}, "title"),
		"UpdateRelayStatusRequest": objectSchema(map[string]any{
			"status": str(),
		}, "status"),
		"CreateRelayEntryRequest": objectSchema(map[string]any{
			"content": str(),
		}, "content"),
		"CreateWritingContestRequest": objectSchema(map[string]any{
			"title":                str(),
			"description":          str(),
			"rules":                str(),
			"allow_article_repost": boolSchema(),
			"starts_at":            nullable(stringFormat("date-time")),
			"ends_at":              nullable(stringFormat("date-time")),
		}, "title"),
		"UpdateWritingContestStatusRequest": objectSchema(map[string]any{
			"status": str(),
		}, "status"),
		"CreateWritingSubmissionRequest": objectSchema(map[string]any{
			"title":             str(),
			"summary":           str(),
			"content":           str(),
			"source_article_id": str(),
		}, "title"),
		"CreateThreadRequest": objectSchema(map[string]any{
			"title":     str(),
			"content":   str(),
			"board":     str(),
			"anonymous": boolSchema(),
			"tags":      arrayOf(str()),
		}, "title", "content", "board"),
		"CreateReplyRequest": objectSchema(map[string]any{
			"content":   str(),
			"anonymous": boolSchema(),
			"sage":      boolSchema(),
			"parent_id": str(),
		}, "content"),
		"UpdateThreadEngagementRequest": objectSchema(map[string]any{
			"liked":     nullable(boolSchema()),
			"favorited": nullable(boolSchema()),
		}),
		"UpdateAvailabilitySettingsRequest": objectSchema(map[string]any{
			"forum_enabled":     nullable(boolSchema()),
			"anonymous_enabled": nullable(boolSchema()),
		}),
		"CreateContentBlockRequest": objectSchema(map[string]any{
			"block_type":  strEnum("hero_object", "portal_page", "portal_highlight", "portal_pillar", "portal_notice", "portal_activity", "portal_join_step"),
			"slug":        str(),
			"path":        str(),
			"kicker":      str(),
			"label":       str(),
			"title":       str(),
			"description": str(),
			"body":        str(),
			"sort_order":  intSchema(),
			"active":      nullable(boolSchema()),
		}, "block_type", "title"),
		"UpdateContentBlockRequest": objectSchema(map[string]any{
			"slug":        nullable(str()),
			"path":        nullable(str()),
			"kicker":      nullable(str()),
			"label":       nullable(str()),
			"title":       nullable(str()),
			"description": nullable(str()),
			"body":        nullable(str()),
			"sort_order":  nullable(intSchema()),
			"active":      nullable(boolSchema()),
		}),
		"CreateGalleryEntryRequest": objectSchema(map[string]any{
			"entry_type": strEnum("album", "polaroid", "paper", "timeline", "track"),
			"slug":       str(),
			"title":      str(),
			"subtitle":   str(),
			"body":       str(),
			"extra_text": str(),
			"sort_order": intSchema(),
			"active":     nullable(boolSchema()),
		}, "entry_type", "title"),
		"UpdateGalleryEntryRequest": objectSchema(map[string]any{
			"slug":       nullable(str()),
			"title":      nullable(str()),
			"subtitle":   nullable(str()),
			"body":       nullable(str()),
			"extra_text": nullable(str()),
			"sort_order": nullable(intSchema()),
			"active":     nullable(boolSchema()),
		}),
		"CreateSubmissionRequest": objectSchema(map[string]any{
			"title":   str(),
			"content": str(),
			"images":  arrayOf(str()),
		}, "title", "content"),
		"ReviewSubmissionRequest": objectSchema(map[string]any{
			"decision": strEnum("approve", "reject"),
			"comment":  str(),
		}, "decision"),
	}
}

func operation(tagName, operationID, summary string, auth bool, params []any, body map[string]any, successStatus string) map[string]any {
	op := map[string]any{
		"tags":        []string{tagName},
		"operationId": operationID,
		"summary":     summary,
		"responses": map[string]any{
			successStatus: successResponseRef("Successful response"),
			"400":         errorResponseRef("Bad request"),
			"401":         errorResponseRef("Authentication required"),
			"403":         errorResponseRef("Forbidden"),
			"404":         errorResponseRef("Resource not found"),
			"500":         errorResponseRef("Internal server error"),
		},
	}
	if auth {
		op["security"] = []any{map[string]any{"bearerAuth": []any{}}}
	}
	if len(params) > 0 {
		op["parameters"] = params
	}
	if body != nil {
		op["requestBody"] = body
	}
	return op
}

func tag(name string) map[string]any {
	return map[string]any{"name": name}
}

func successResponseRef(description string) map[string]any {
	return map[string]any{
		"description": description,
		"content": map[string]any{
			"application/json": map[string]any{
				"schema": map[string]any{"$ref": "#/components/schemas/ApiEnvelope"},
			},
		},
	}
}

func errorResponseRef(description string) map[string]any {
	return map[string]any{
		"description": description,
		"content": map[string]any{
			"application/json": map[string]any{
				"schema": map[string]any{"$ref": "#/components/schemas/ErrorEnvelope"},
			},
		},
	}
}

func jsonBody(schema string, required bool) map[string]any {
	return map[string]any{
		"required": required,
		"content": map[string]any{
			"application/json": map[string]any{
				"schema": map[string]any{"$ref": "#/components/schemas/" + schema},
			},
		},
	}
}

func multipartBody() map[string]any {
	return map[string]any{
		"required": true,
		"content": map[string]any{
			"multipart/form-data": map[string]any{
				"schema": objectSchema(map[string]any{
					"files": map[string]any{
						"type":  "array",
						"items": map[string]any{"type": "string", "format": "binary"},
					},
				}, "files"),
			},
		},
	}
}

func pageParams() []any {
	return []any{
		queryParamWithSchema("page", "Page number, starting from 1", false, intSchema()),
		queryParamWithSchema("page_size", "Page size, max 100", false, intSchema()),
	}
}

func searchPageParams() []any {
	return append(pageParams(), queryParam("q", "Search keyword", false))
}

func pathParam(name string) map[string]any {
	return map[string]any{
		"name":        name,
		"in":          "path",
		"required":    true,
		"description": name,
		"schema":      str(),
	}
}

func queryParam(name, description string, required bool) map[string]any {
	return queryParamWithSchema(name, description, required, str())
}

func queryParamWithSchema(name, description string, required bool, schema map[string]any) map[string]any {
	return map[string]any{
		"name":        name,
		"in":          "query",
		"required":    required,
		"description": description,
		"schema":      schema,
	}
}

func objectSchema(properties map[string]any, required ...string) map[string]any {
	schema := map[string]any{
		"type":       "object",
		"properties": properties,
	}
	if len(required) > 0 {
		schema["required"] = required
	}
	return schema
}

func str() map[string]any {
	return map[string]any{"type": "string"}
}

func stringFormat(format string) map[string]any {
	return map[string]any{"type": "string", "format": format}
}

func strEnum(values ...string) map[string]any {
	items := make([]any, 0, len(values))
	for _, value := range values {
		items = append(items, value)
	}
	return map[string]any{"type": "string", "enum": items}
}

func boolSchema() map[string]any {
	return map[string]any{"type": "boolean"}
}

func intSchema() map[string]any {
	return map[string]any{"type": "integer"}
}

func nullable(schema map[string]any) map[string]any {
	copy := make(map[string]any, len(schema)+1)
	for key, value := range schema {
		copy[key] = value
	}
	copy["nullable"] = true
	return copy
}

func arrayOf(item map[string]any) map[string]any {
	return map[string]any{
		"type":  "array",
		"items": item,
	}
}
