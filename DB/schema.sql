begin;

create type user_status as enum (
    'pending_verification',
    'active',
    'suspended',
    'banned'
);

create type visibility_level as enum (
    'public',
    'members',
    'private'
);

create type verification_status as enum (
    'pending',
    'approved',
    'rejected'
);

create type verification_method as enum (
    'school_email',
    'student_id',
    'invite_code',
    'manual'
);

create type article_status as enum (
    'draft',
    'published',
    'archived',
    'deleted'
);

create type comment_status as enum (
    'visible',
    'hidden',
    'deleted'
);

create type forum_board_mode as enum (
    'normal',
    'anonymous'
);

create type thread_status as enum (
    'active',
    'locked',
    'hidden',
    'deleted'
);

create type post_status as enum (
    'visible',
    'hidden',
    'deleted'
);

create type wall_entry_status as enum (
    'draft',
    'pending_review',
    'approved',
    'rejected',
    'archived',
    'removed'
);

create type review_action as enum (
    'approved',
    'rejected',
    'changes_requested'
);

create type report_status as enum (
    'open',
    'in_review',
    'resolved',
    'rejected'
);

create type report_target_type as enum (
    'article',
    'article_comment',
    'forum_thread',
    'forum_post',
    'wall_entry',
    'user_profile'
);

create type external_provider as enum (
    'bangumi'
);

create type bangumi_collection_status as enum (
    'wish',
    'doing',
    'collect',
    'on_hold',
    'dropped'
);

create type sync_job_type as enum (
    'bind_account',
    'full_sync',
    'subject_refresh',
    'collection_sync'
);

create type sync_job_status as enum (
    'queued',
    'running',
    'succeeded',
    'failed',
    'cancelled'
);

create type bot_session_type as enum (
    'user_chat',
    'admin_console'
);

create type bot_session_status as enum (
    'active',
    'archived',
    'closed'
);

create type bot_sender_type as enum (
    'user',
    'assistant',
    'system',
    'admin_tool'
);

create type bot_message_type as enum (
    'text',
    'json',
    'event'
);

create type media_type as enum (
    'image',
    'video'
);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create table users (
    id bigserial primary key,
    username varchar(32) not null,
    password_hash varchar(255) not null,
    school_email varchar(255) not null,
    student_no varchar(64),
    nickname varchar(64) not null,
    signature varchar(160),
    bio text,
    avatar_url text,
    banner_url text,
    homepage_url text,
    profile_visibility visibility_level not null default 'public',
    status user_status not null default 'pending_verification',
    email_verified_at timestamptz,
    last_login_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,
    check (username ~ '^[A-Za-z0-9_]{3,32}$')
);

create unique index ux_users_username_active
    on users (lower(username))
    where deleted_at is null;

create unique index ux_users_school_email_active
    on users (lower(school_email))
    where deleted_at is null;

create unique index ux_users_student_no_active
    on users (student_no)
    where student_no is not null and deleted_at is null;

create table roles (
    id smallserial primary key,
    code varchar(32) not null unique,
    name varchar(64) not null,
    description text,
    created_at timestamptz not null default now()
);

create table user_roles (
    user_id bigint not null references users(id),
    role_id smallint not null references roles(id),
    granted_by bigint references users(id),
    granted_at timestamptz not null default now(),
    primary key (user_id, role_id)
);

create table user_verification_requests (
    id bigserial primary key,
    user_id bigint not null references users(id),
    method verification_method not null,
    proof_payload jsonb not null default '{}'::jsonb,
    status verification_status not null default 'pending',
    review_note text,
    reviewer_id bigint references users(id),
    reviewed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index idx_user_verification_requests_user_status
    on user_verification_requests (user_id, status, created_at desc);

create table auth_sessions (
    id bigserial primary key,
    user_id bigint not null references users(id),
    refresh_token_hash varchar(255) not null unique,
    device_name varchar(128),
    user_agent text,
    ip_address inet,
    last_seen_at timestamptz not null default now(),
    expires_at timestamptz not null,
    revoked_at timestamptz,
    created_at timestamptz not null default now()
);

create index idx_auth_sessions_user_active
    on auth_sessions (user_id, expires_at desc)
    where revoked_at is null;

create table login_audit_logs (
    id bigserial primary key,
    user_id bigint references users(id),
    login_identifier varchar(255) not null,
    success boolean not null,
    failure_reason varchar(255),
    ip_address inet,
    user_agent text,
    created_at timestamptz not null default now()
);

create index idx_login_audit_logs_identifier
    on login_audit_logs (login_identifier, created_at desc);

create table user_external_accounts (
    id bigserial primary key,
    user_id bigint not null references users(id),
    provider external_provider not null,
    external_uid varchar(128) not null,
    external_name varchar(128),
    profile_url text,
    credential_payload jsonb not null default '{}'::jsonb,
    meta jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (user_id, provider),
    unique (provider, external_uid)
);

create table articles (
    id bigserial primary key,
    author_id bigint not null references users(id),
    title varchar(200) not null,
    slug varchar(200) not null,
    summary text,
    cover_image_url text,
    content_md text not null,
    visibility visibility_level not null default 'public',
    status article_status not null default 'draft',
    allow_comments boolean not null default true,
    published_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create unique index ux_articles_slug_active
    on articles (lower(slug))
    where deleted_at is null;

create index idx_articles_author_status
    on articles (author_id, status, created_at desc);

create index idx_articles_public_listing
    on articles (visibility, status, published_at desc)
    where deleted_at is null;

create table article_tags (
    id bigserial primary key,
    name varchar(32) not null,
    slug varchar(32) not null,
    created_at timestamptz not null default now()
);

create unique index ux_article_tags_name
    on article_tags (lower(name));

create unique index ux_article_tags_slug
    on article_tags (lower(slug));

create table article_tag_relations (
    article_id bigint not null references articles(id) on delete cascade,
    tag_id bigint not null references article_tags(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (article_id, tag_id)
);

create table article_comments (
    id bigserial primary key,
    article_id bigint not null references articles(id) on delete cascade,
    author_id bigint not null references users(id),
    parent_id bigint references article_comments(id),
    reply_to_user_id bigint references users(id),
    content_md text not null,
    status comment_status not null default 'visible',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create index idx_article_comments_article_parent
    on article_comments (article_id, parent_id, created_at);

create index idx_article_comments_author
    on article_comments (author_id, created_at desc);

create table forum_boards (
    id bigserial primary key,
    name varchar(80) not null,
    slug varchar(80) not null,
    description text,
    board_mode forum_board_mode not null default 'normal',
    read_visibility visibility_level not null default 'public',
    write_visibility visibility_level not null default 'members',
    sort_order integer not null default 0,
    is_active boolean not null default true,
    created_by bigint references users(id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index ux_forum_boards_name
    on forum_boards (lower(name));

create unique index ux_forum_boards_slug
    on forum_boards (lower(slug));

create table forum_threads (
    id bigserial primary key,
    board_id bigint not null references forum_boards(id),
    author_id bigint not null references users(id),
    title varchar(200) not null,
    content_md text not null,
    status thread_status not null default 'active',
    is_pinned boolean not null default false,
    is_featured boolean not null default false,
    reply_count integer not null default 0,
    view_count bigint not null default 0,
    last_post_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,
    check (reply_count >= 0),
    check (view_count >= 0)
);

create index idx_forum_threads_board_listing
    on forum_threads (board_id, status, is_pinned desc, last_post_at desc)
    where deleted_at is null;

create index idx_forum_threads_author
    on forum_threads (author_id, created_at desc);

create table forum_posts (
    id bigserial primary key,
    thread_id bigint not null references forum_threads(id) on delete cascade,
    author_id bigint not null references users(id),
    parent_id bigint references forum_posts(id),
    reply_to_user_id bigint references users(id),
    floor_no integer not null,
    content_md text not null,
    status post_status not null default 'visible',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,
    check (floor_no > 0),
    unique (thread_id, floor_no)
);

create index idx_forum_posts_thread_parent
    on forum_posts (thread_id, parent_id, created_at);

create index idx_forum_posts_author
    on forum_posts (author_id, created_at desc);

create table forum_anonymous_identities (
    id bigserial primary key,
    thread_id bigint not null references forum_threads(id) on delete cascade,
    user_id bigint not null references users(id),
    alias_code varchar(32) not null,
    alias_name varchar(64) not null,
    created_at timestamptz not null default now(),
    unique (thread_id, user_id),
    unique (thread_id, alias_code),
    unique (thread_id, alias_name)
);

create table wall_entries (
    id bigserial primary key,
    submitter_id bigint not null references users(id),
    slug varchar(200) not null,
    title varchar(200) not null,
    summary text,
    content_md text,
    cover_image_url text,
    keywords text[] not null default array[]::text[],
    visibility visibility_level not null default 'public',
    status wall_entry_status not null default 'pending_review',
    event_date date,
    is_featured boolean not null default false,
    published_at timestamptz,
    approved_by bigint references users(id),
    approved_at timestamptz,
    rejection_reason text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create unique index ux_wall_entries_slug_active
    on wall_entries (lower(slug))
    where deleted_at is null;

create index idx_wall_entries_status_listing
    on wall_entries (status, is_featured desc, published_at desc)
    where deleted_at is null;

create index idx_wall_entries_submitter
    on wall_entries (submitter_id, created_at desc);

create table wall_entry_media (
    id bigserial primary key,
    entry_id bigint not null references wall_entries(id) on delete cascade,
    media_type media_type not null default 'image',
    media_url text not null,
    thumbnail_url text,
    sort_order integer not null default 0,
    meta jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index idx_wall_entry_media_order
    on wall_entry_media (entry_id, sort_order, id);

create table wall_entry_reviews (
    id bigserial primary key,
    entry_id bigint not null references wall_entries(id) on delete cascade,
    reviewer_id bigint not null references users(id),
    decision review_action not null,
    review_note text,
    created_at timestamptz not null default now()
);

create index idx_wall_entry_reviews_entry
    on wall_entry_reviews (entry_id, created_at desc);

create table content_reports (
    id bigserial primary key,
    reporter_id bigint not null references users(id),
    target_type report_target_type not null,
    target_id bigint not null,
    reason_code varchar(64),
    reason_text text,
    status report_status not null default 'open',
    handler_id bigint references users(id),
    resolution_note text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    resolved_at timestamptz
);

create index idx_content_reports_target
    on content_reports (target_type, target_id, status);

create index idx_content_reports_handler
    on content_reports (handler_id, status, created_at desc);

create table bangumi_subjects (
    id bigserial primary key,
    bgm_subject_id bigint not null unique,
    subject_type smallint not null,
    name varchar(255) not null,
    name_cn varchar(255),
    summary text,
    cover_image_url text,
    air_date date,
    rating_score numeric(3,1),
    rank_no integer,
    tags text[] not null default array[]::text[],
    platforms text[] not null default array[]::text[],
    extra jsonb not null default '{}'::jsonb,
    raw_payload jsonb not null default '{}'::jsonb,
    synced_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check (rating_score is null or (rating_score >= 0 and rating_score <= 10))
);

create index idx_bangumi_subjects_name
    on bangumi_subjects (name);

create index idx_bangumi_subjects_name_cn
    on bangumi_subjects (name_cn);

create index idx_bangumi_subjects_tags_gin
    on bangumi_subjects using gin (tags);

create index idx_bangumi_subjects_raw_payload_gin
    on bangumi_subjects using gin (raw_payload jsonb_path_ops);

create table user_bangumi_collections (
    id bigserial primary key,
    user_id bigint not null references users(id),
    subject_id bigint not null references bangumi_subjects(id),
    collection_status bangumi_collection_status not null,
    display_visibility visibility_level not null default 'public',
    score smallint,
    comment text,
    tags text[] not null default array[]::text[],
    is_favorite boolean not null default false,
    raw_payload jsonb not null default '{}'::jsonb,
    synced_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (user_id, subject_id),
    check (score is null or (score >= 0 and score <= 10))
);

create index idx_user_bangumi_collections_user_status
    on user_bangumi_collections (user_id, collection_status, created_at desc);

create index idx_user_bangumi_collections_subject
    on user_bangumi_collections (subject_id, collection_status);

create table bangumi_sync_jobs (
    id bigserial primary key,
    user_id bigint not null references users(id),
    external_account_id bigint references user_external_accounts(id),
    job_type sync_job_type not null,
    status sync_job_status not null default 'queued',
    request_payload jsonb not null default '{}'::jsonb,
    result_payload jsonb not null default '{}'::jsonb,
    error_message text,
    started_at timestamptz,
    finished_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index idx_bangumi_sync_jobs_status
    on bangumi_sync_jobs (status, created_at desc);

create index idx_bangumi_sync_jobs_user
    on bangumi_sync_jobs (user_id, created_at desc);

create table luckybot_sessions (
    id bigserial primary key,
    owner_user_id bigint not null references users(id),
    session_type bot_session_type not null default 'user_chat',
    title varchar(200),
    status bot_session_status not null default 'active',
    system_prompt text,
    context_payload jsonb not null default '{}'::jsonb,
    last_message_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index idx_luckybot_sessions_owner
    on luckybot_sessions (owner_user_id, status, updated_at desc);

create table luckybot_messages (
    id bigserial primary key,
    session_id bigint not null references luckybot_sessions(id) on delete cascade,
    sender_type bot_sender_type not null,
    sender_user_id bigint references users(id),
    message_type bot_message_type not null default 'text',
    content text not null,
    tool_name varchar(100),
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index idx_luckybot_messages_session
    on luckybot_messages (session_id, created_at);

create table luckybot_admin_actions (
    id bigserial primary key,
    actor_user_id bigint not null references users(id),
    session_id bigint references luckybot_sessions(id) on delete set null,
    action_name varchar(100) not null,
    action_payload jsonb not null default '{}'::jsonb,
    result_payload jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

insert into roles (code, name, description) values
    ('user', 'User', 'Default member role'),
    ('moderator', 'Moderator', 'Content moderation and forum management'),
    ('admin', 'Admin', 'Site administration role'),
    ('super_admin', 'Super Admin', 'System-level control and Luckybot admin operations')
on conflict (code) do nothing;

create trigger trg_users_set_updated_at
before update on users
for each row execute function set_updated_at();

create trigger trg_user_verification_requests_set_updated_at
before update on user_verification_requests
for each row execute function set_updated_at();

create trigger trg_user_external_accounts_set_updated_at
before update on user_external_accounts
for each row execute function set_updated_at();

create trigger trg_articles_set_updated_at
before update on articles
for each row execute function set_updated_at();

create trigger trg_article_comments_set_updated_at
before update on article_comments
for each row execute function set_updated_at();

create trigger trg_forum_boards_set_updated_at
before update on forum_boards
for each row execute function set_updated_at();

create trigger trg_forum_threads_set_updated_at
before update on forum_threads
for each row execute function set_updated_at();

create trigger trg_forum_posts_set_updated_at
before update on forum_posts
for each row execute function set_updated_at();

create trigger trg_wall_entries_set_updated_at
before update on wall_entries
for each row execute function set_updated_at();

create trigger trg_content_reports_set_updated_at
before update on content_reports
for each row execute function set_updated_at();

create trigger trg_bangumi_subjects_set_updated_at
before update on bangumi_subjects
for each row execute function set_updated_at();

create trigger trg_user_bangumi_collections_set_updated_at
before update on user_bangumi_collections
for each row execute function set_updated_at();

create trigger trg_bangumi_sync_jobs_set_updated_at
before update on bangumi_sync_jobs
for each row execute function set_updated_at();

create trigger trg_luckybot_sessions_set_updated_at
before update on luckybot_sessions
for each row execute function set_updated_at();

commit;
