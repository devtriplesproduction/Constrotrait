insert into storage.buckets (id, name, public) values ('medical-certificates', 'medical-certificates', true) on conflict do nothing;
