begin;

create index if not exists idx_user_bangumi_collections_user_updated
    on user_bangumi_collections (user_id, updated_at desc, id desc);

create index if not exists idx_user_bangumi_collections_user_visibility_updated
    on user_bangumi_collections (user_id, display_visibility, updated_at desc, id desc);

commit;
