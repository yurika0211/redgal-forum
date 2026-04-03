begin;

create table if not exists forum_level_configs (
    level integer primary key,
    min_exp integer not null,
    title_name varchar(50),
    privileges jsonb,
    check (level > 0),
    check (min_exp >= 0)
);

create unique index if not exists ux_forum_level_configs_min_exp
    on forum_level_configs (min_exp);

create table if not exists forum_user_levels (
    user_id bigint primary key references users(id) on delete cascade,
    current_level integer not null default 1 references forum_level_configs(level),
    total_exp integer not null default 0,
    updated_at timestamptz not null default now(),
    check (total_exp >= 0)
);

create table if not exists forum_exp_action_logs (
    log_id bigserial primary key,
    user_id bigint not null references users(id) on delete cascade,
    action_type varchar(50) not null,
    exp_delta integer not null,
    target_id bigint,
    action_date date not null default current_date,
    created_at timestamptz not null default now()
);

create index if not exists idx_forum_exp_action_logs_user_created
    on forum_exp_action_logs (user_id, created_at desc);

create index if not exists idx_forum_exp_action_logs_action_date
    on forum_exp_action_logs (action_type, action_date desc);

create unique index if not exists ux_forum_exp_action_logs_sign_in_daily
    on forum_exp_action_logs (user_id, action_type, action_date)
    where action_type = 'SIGN_IN';

insert into forum_level_configs (level, min_exp, title_name, privileges) values
    (1, 0, '初来乍到', '{"can_upload_img": false, "daily_post_limit": 5}'::jsonb),
    (2, 15, '常驻旅人', '{"can_upload_img": true, "daily_post_limit": 10}'::jsonb),
    (3, 40, '夜谈熟客', '{"can_upload_img": true, "daily_post_limit": 15}'::jsonb),
    (4, 80, '剧情考据组', '{"can_upload_img": true, "daily_post_limit": 20}'::jsonb),
    (5, 140, '长帖记录者', '{"can_upload_img": true, "daily_post_limit": 25}'::jsonb),
    (6, 220, '版面熟面孔', '{"can_upload_img": true, "daily_post_limit": 30}'::jsonb),
    (7, 320, '活动常客', '{"can_upload_img": true, "daily_post_limit": 40}'::jsonb),
    (8, 450, '资深同好', '{"can_upload_img": true, "daily_post_limit": 50}'::jsonb)
on conflict (level) do update
set min_exp = excluded.min_exp,
    title_name = excluded.title_name,
    privileges = excluded.privileges;

do $$
begin
    if not exists (
        select 1
        from pg_trigger
        where tgname = 'trg_forum_user_levels_set_updated_at'
    ) then
        create trigger trg_forum_user_levels_set_updated_at
        before update on forum_user_levels
        for each row execute function set_updated_at();
    end if;
end $$;

commit;
