-- ---------------------------------------------------------------------------
-- 0028 — demo login that never touches email
--
-- 0027 tried the polite route: sign the number up as a synthetic email and
-- stamp it confirmed. Two walls, both discovered by running it:
--
--   GoTrue validates the domain's DNS at sign-up, and the synthetic domain has
--   none — "Email address … is invalid".
--
--   Every sign-up queues a confirmation email, and the built-in SMTP allows a
--   couple per hour. The second demo login of the hour would have failed on
--   the mail limit alone.
--
-- So the account is made in SQL instead, where neither wall exists: a row in
-- auth.users with a bcrypt password and confirmation already stamped, plus the
-- identity row GoTrue expects. Password sign-in then works normally, and no
-- email is ever composed. `handle_new_user` fires on the insert like any
-- other, so the profile row appears the same way it does for a real learner.
--
-- STILL A DEMO. The password is derived from the number, so possession of the
-- number is not proven — anyone typing the same digits shares the account.
-- That is the requested behaviour until the SMS provider is paid for.
--
-- REMOVE WHEN REAL OTP ARRIVES:
--   drop function if exists demo_phone_login(text);
--   delete from auth.users where email like '%@demo.adhyapak.app';
-- ---------------------------------------------------------------------------

begin;

drop function if exists confirm_demo_user(text);

/**
 * Ensures the account for a demo phone number exists, and returns its email.
 *
 * `security definer` because it writes auth.users, and callable by `anon`
 * because it runs before there is any session. The blast radius is bounded by
 * construction: it can only ever create rows whose email is derived from ten
 * digits at the demo domain, never touch an existing non-demo row, and never
 * choose its own password — so the worst a caller can do is create demo
 * accounts, which is what it is for.
 */
create or replace function demo_phone_login(p_phone text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_digits text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_local  text;
  v_email  text;
  v_id     uuid;
begin
  -- The same normalisation the client's toE164India applies: strip a 91
  -- country code or a trunk zero, then insist on a plausible mobile.
  if length(v_digits) > 10 and v_digits like '91%' then
    v_digits := substring(v_digits from 3);
  elsif v_digits like '0%' then
    v_digits := substring(v_digits from 2);
  end if;
  if v_digits !~ '^[6-9][0-9]{9}$' then
    raise exception 'not a valid mobile number';
  end if;

  v_local := 'p91' || v_digits;
  v_email := v_local || '@demo.adhyapak.app';

  select id into v_id from auth.users where email = v_email;
  if v_id is null then
    v_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
      v_email, crypt('demo-+91' || v_digits || '-adhyapak', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('name', '+91 ' || v_digits, 'phone', '+91' || v_digits),
      now(), now()
    );

    -- GoTrue resolves password sign-ins through the identity row.
    insert into auth.identities (
      id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_id, v_id::text, 'email',
      jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
      now(), now(), now()
    );
  end if;

  return v_email;
end;
$$;

revoke all on function demo_phone_login(text) from public;
grant execute on function demo_phone_login(text) to anon, authenticated;

commit;
