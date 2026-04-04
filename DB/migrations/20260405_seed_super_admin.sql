begin;

insert into roles (code, name, description) values
    ('admin', '管理员', '拥有大部分站点管理权限的管理员'),
    ('super_admin', '超级管理员', '掌握全站最高权限的超级管理员')
on conflict (code) do nothing;

insert into users (
    username,
    password_hash,
    school_email,
    nickname,
    signature,
    bio,
    status,
    email_verified_at,
    profile_visibility
)
select
    'shiokou',
    'scaffold:shiokou0408',
    'shiokou@example.local',
    'shiokou',
    'System Super Admin',
    '默认超级管理员账号',
    'active'::user_status,
    now(),
    'public'::visibility_level
where not exists (
    select 1
    from users
    where lower(users.username) = lower('shiokou')
      and users.deleted_at is null
);

update users
set
    password_hash = 'scaffold:shiokou0408',
    status = 'active'::user_status,
    email_verified_at = coalesce(email_verified_at, now()),
    deleted_at = null
where lower(username) = lower('shiokou');

insert into user_roles (user_id, role_id)
select u.id, r.id
from users u
join roles r on r.code in ('member', 'admin', 'super_admin')
where lower(u.username) = lower('shiokou')
  and u.deleted_at is null
on conflict do nothing;

commit;
