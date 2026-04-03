package user

import (
	"context"

	"example.com/rubedo/backend/internal/platform"
	"example.com/rubedo/backend/internal/security"
)

type Repository interface {
	GetProfile(ctx context.Context, username string) (Profile, error)
	GetMe(ctx context.Context, principal security.Principal) (Profile, error)
	UpdateMe(ctx context.Context, principal security.Principal, input UpdateProfileRequest) (Profile, error)
	QueueBangumiImport(ctx context.Context, principal security.Principal, input BangumiImportRequest) (BangumiImportJob, error)
}

type repository struct {
	platform *platform.Platform
}

func NewRepository(platform *platform.Platform) Repository {
	return &repository{platform: platform}
}

func (r *repository) GetProfile(ctx context.Context, username string) (Profile, error) {
	return baseProfile(username), nil
}

func (r *repository) GetMe(ctx context.Context, principal security.Principal) (Profile, error) {
	profile := baseProfile(principal.Username)
	profile.UserID = principal.UserID
	return profile, nil
}

func (r *repository) UpdateMe(ctx context.Context, principal security.Principal, input UpdateProfileRequest) (Profile, error) {
	profile := baseProfile(principal.Username)
	profile.UserID = principal.UserID
	if input.Nickname != "" {
		profile.Nickname = input.Nickname
	}
	if input.Signature != "" {
		profile.Signature = input.Signature
	}
	if input.Bio != "" {
		profile.Bio = input.Bio
	}
	if input.AvatarURL != "" {
		profile.AvatarURL = input.AvatarURL
	}
	return profile, nil
}

func (r *repository) QueueBangumiImport(ctx context.Context, principal security.Principal, input BangumiImportRequest) (BangumiImportJob, error) {
	return BangumiImportJob{
		JobID:   "bgm-import-001",
		Status:  "queued",
		Channel: "rabbitmq.bangumi.import",
	}, nil
}

func baseProfile(username string) Profile {
	return Profile{
		UserID:    "user-scaffold-001",
		Username:  username,
		Nickname:  "Rubedo Member",
		Signature: "Scaffolded profile signature",
		Bio:       "This profile endpoint is scaffolded for the school-only forum flow.",
		AvatarURL: "https://example.com/avatar.png",
		Collections: map[string]int{
			"wish":    12,
			"played":  24,
			"hold":    2,
			"dropped": 1,
		},
	}
}
