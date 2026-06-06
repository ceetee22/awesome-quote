-- 09_accepted_at.sql
-- Adds accepted_at to jobs, backfills from updated_at/created_at for all
-- post-accepted statuses, and adds a trigger to stamp it on acceptance.
-- Already applied to the live database — do not re-run.

alter table jobs add column if not exists accepted_at timestamptz;

update jobs
set accepted_at = coalesce(updated_at, created_at)
where accepted_at is null
  and status in ('accepted', 'ordered', 'scheduled', 'completed', 'invoiced');

create or replace function set_accepted_at()
returns trigger as $$
begin
  if new.status = 'accepted' and new.accepted_at is null then
    new.accepted_at := now();
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_set_accepted_at on jobs;
create trigger trg_set_accepted_at
  before insert or update on jobs
  for each row execute function set_accepted_at();
