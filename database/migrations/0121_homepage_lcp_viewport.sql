alter table public.web_vitals add column narrow_viewport boolean
    check (narrow_viewport is null or (metric = 'LCP' and route = '/'));

create index idx_web_vitals_narrow_home_lcp_created on public.web_vitals (created_at)
    where narrow_viewport is true and metric = 'LCP' and route = '/';
