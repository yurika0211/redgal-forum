do $$
begin
    if exists (select 1 from pg_type where typname = 'site_block_type')
       and not exists (
           select 1
           from pg_enum e
           join pg_type t on t.oid = e.enumtypid
           where t.typname = 'site_block_type'
             and e.enumlabel = 'portal_notice'
       ) then
        alter type site_block_type add value 'portal_notice';
    end if;
end $$;

insert into site_content_blocks (
    block_type, slug, path, kicker, label, title, description, body, sort_order, is_active
)
select
    'portal_notice'::site_block_type,
    'welcome-announcement',
    null,
    '公告',
    '置顶',
    '站点公告与活动提醒开始接入后台发布',
    '管理员可在管理界面直接发布公告，前台会按公告流展示。',
    '后续会继续补充置顶、定时与归档规则。',
    10,
    true
where not exists (
    select 1
    from site_content_blocks
    where block_type = 'portal_notice'::site_block_type
      and slug = 'welcome-announcement'
);
