begin;

create table if not exists user_friend_requests (
    id bigserial primary key,
    requester_id bigint not null references users(id),
    receiver_id bigint not null references users(id),
    status varchar(16) not null default 'pending',
    message text,
    reviewed_by bigint references users(id),
    reviewed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,
    check (requester_id <> receiver_id),
    check (status in ('pending', 'approved', 'rejected', 'cancelled'))
);

create index if not exists idx_user_friend_requests_requester_status
    on user_friend_requests (requester_id, status, created_at desc)
    where deleted_at is null;

create index if not exists idx_user_friend_requests_receiver_status
    on user_friend_requests (receiver_id, status, created_at desc)
    where deleted_at is null;

create unique index if not exists ux_user_friend_requests_pending_pair
    on user_friend_requests (
        least(requester_id, receiver_id),
        greatest(requester_id, receiver_id)
    )
    where deleted_at is null and status = 'pending';

create unique index if not exists ux_user_friend_requests_approved_pair
    on user_friend_requests (
        least(requester_id, receiver_id),
        greatest(requester_id, receiver_id)
    )
    where deleted_at is null and status = 'approved';

do $$
begin
    if not exists (
        select 1
        from pg_trigger
        where tgname = 'trg_user_friend_requests_set_updated_at'
    ) then
        create trigger trg_user_friend_requests_set_updated_at
        before update on user_friend_requests
        for each row execute function set_updated_at();
    end if;
end
$$;

commit;
