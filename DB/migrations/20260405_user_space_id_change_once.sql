alter table users
    add column if not exists username_change_count integer not null default 0;

