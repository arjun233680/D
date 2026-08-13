-- Onboarding state.
--
-- The goal a learner picks at sign-up is not a cosmetic preference: it selects
-- their subjects, batches, mock tests and the cut-off their scores are judged
-- against. Recording when it was set lets the app tell a fresh account from one
-- that has simply signed out.

alter table profiles
  add column if not exists onboarded_at timestamptz,
  add column if not exists preferred_language text
    default 'hi' check (preferred_language in ('en', 'hi'));

-- The home feed filters almost everything by the learner's goal.
create index if not exists profiles_goal_idx on profiles(goal_exam_id);

-- Marks onboarding complete and stores the chosen goal in one call, so the
-- client cannot end up signed in with no goal set.
create or replace function set_goal(p_exam_id text, p_paper_id text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;

  update profiles
     set goal_exam_id = p_exam_id,
         target_paper_id = p_paper_id,
         onboarded_at = coalesce(onboarded_at, now())
   where id = auth.uid();
end;
$$;
