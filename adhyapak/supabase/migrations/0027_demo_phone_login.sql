-- ---------------------------------------------------------------------------
-- 0027 — demo phone login: any number gets in
--
-- TEMPORARY, AND OPENLY SO. Real phone OTP needs the SMS provider switched on
-- in the dashboard, which costs money per message. Until then the login screen
-- still asks for a mobile number — that is the product — but the number is not
-- verified: it becomes a synthetic account `p<digits>@demo.adhyapak.app` with a
-- password derived from it, created on first use and signed into thereafter.
--
-- The one server-side piece is confirmation. The project requires email
-- confirmation, and a synthetic address has no inbox, so sign-up alone leaves
-- an account nobody can enter. `confirm_demo_user` stamps it confirmed — for
-- the demo domain and nothing else, which is the entire check: a real email
-- can never pass through here, so nobody can use this to skip confirming an
-- address they do not own.
--
-- Callable by `anon` on purpose: it has to run between sign-up and the first
-- sign-in, when there is no session yet.
--
-- REMOVE WHEN REAL OTP ARRIVES:
--   drop function if exists confirm_demo_user(text);
--   delete from auth.users where email like '%@demo.adhyapak.app';
-- ---------------------------------------------------------------------------

begin;

create or replace function confirm_demo_user(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_email is null or p_email not like '%@demo.adhyapak.app' then
    raise exception 'not a demo account';
  end if;
  update auth.users
     set email_confirmed_at = coalesce(email_confirmed_at, now())
   where email = lower(p_email);
end;
$$;

grant execute on function confirm_demo_user(text) to anon, authenticated;

commit;
