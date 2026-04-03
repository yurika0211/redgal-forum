begin;

do $$
begin
    if not exists (select 1 from pg_type where typname = 'relay_status') then
        create type relay_status as enum (
            'draft',
            'open',
            'closed',
            'archived',
            'deleted'
        );
    end if;
end
$$;

do $$
begin
    if not exists (select 1 from pg_type where typname = 'contest_status') then
        create type contest_status as enum (
            'draft',
            'open',
            'reviewing',
            'closed',
            'archived',
            'deleted'
        );
    end if;
end
$$;

do $$
begin
    if not exists (select 1 from pg_type where typname = 'contest_submission_status') then
        create type contest_submission_status as enum (
            'submitted',
            'approved',
            'rejected',
            'withdrawn',
            'deleted'
        );
    end if;
end
$$;

do $$
begin
    if not exists (select 1 from pg_type where typname = 'contest_submission_source') then
        create type contest_submission_source as enum (
            'direct',
            'article_repost'
        );
    end if;
end
$$;

create table if not exists user_verification_reviews (
    id bigserial primary key,
    request_id bigint not null references user_verification_requests(id) on delete cascade,
    reviewer_id bigint not null references users(id),
    action review_action not null,
    note text,
    created_at timestamptz not null default now(),
    unique (request_id, reviewer_id)
);

create index if not exists idx_user_verification_reviews_request
    on user_verification_reviews (request_id, created_at desc);

create table if not exists relay_events (
    id bigserial primary key,
    title varchar(200) not null,
    slug varchar(120) not null unique,
    description text,
    rules_md text,
    status relay_status not null default 'draft',
    allow_unverified boolean not null default true,
    starts_at timestamptz,
    ends_at timestamptz,
    created_by bigint not null references users(id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create index if not exists idx_relay_events_status
    on relay_events (status, created_at desc)
    where deleted_at is null;

create table if not exists relay_entries (
    id bigserial primary key,
    relay_id bigint not null references relay_events(id) on delete cascade,
    user_id bigint not null references users(id),
    floor_no integer not null,
    content_md text not null,
    status post_status not null default 'visible',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,
    unique (relay_id, floor_no)
);

create index if not exists idx_relay_entries_relay
    on relay_entries (relay_id, floor_no, created_at)
    where deleted_at is null;

create table if not exists writing_contests (
    id bigserial primary key,
    title varchar(200) not null,
    slug varchar(120) not null unique,
    description text,
    rules_md text,
    status contest_status not null default 'draft',
    allow_article_repost boolean not null default true,
    starts_at timestamptz,
    ends_at timestamptz,
    created_by bigint not null references users(id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create index if not exists idx_writing_contests_status
    on writing_contests (status, created_at desc)
    where deleted_at is null;

create table if not exists writing_submissions (
    id bigserial primary key,
    contest_id bigint not null references writing_contests(id) on delete cascade,
    user_id bigint not null references users(id),
    title varchar(200) not null,
    summary text,
    content_md text,
    source contest_submission_source not null default 'direct',
    source_article_id bigint references articles(id),
    status contest_submission_status not null default 'submitted',
    review_note text,
    reviewed_by bigint references users(id),
    reviewed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create index if not exists idx_writing_submissions_contest
    on writing_submissions (contest_id, status, created_at desc)
    where deleted_at is null;

commit;
