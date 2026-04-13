begin;

create table if not exists forum_thread_engagements (
    thread_id bigint not null references forum_threads(id) on delete cascade,
    user_id bigint not null references users(id) on delete cascade,
    liked boolean not null default false,
    favorited boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (thread_id, user_id),
    check (liked or favorited)
);

create index if not exists idx_forum_thread_engagements_user_updated
    on forum_thread_engagements (user_id, updated_at desc);

create index if not exists idx_forum_thread_engagements_thread
    on forum_thread_engagements (thread_id);

do $$
begin
    if not exists (
        select 1
        from pg_trigger
        where tgname = 'trg_forum_thread_engagements_set_updated_at'
          and not tgisinternal
    ) then
        create trigger trg_forum_thread_engagements_set_updated_at
        before update on forum_thread_engagements
        for each row execute function set_updated_at();
    end if;
end $$;

commit;
