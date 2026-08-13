-- Server-side grading.
--
-- The client never decides its own score. It saves answers as it goes, then
-- calls submit_attempt, which marks the paper against the answer key inside the
-- database and computes the rank against every other submitted attempt on that
-- test. That also removes the simulated percentile the offline build used.

create or replace function submit_attempt(p_attempt_id uuid)
returns table (
  score numeric, max_score numeric, percentage numeric,
  correct int, incorrect int, skipped int, accuracy numeric,
  total_time_ms bigint, rank int, total_candidates int,
  percentile numeric, qualified boolean, cutoff numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt   attempts%rowtype;
  v_test      tests%rowtype;
  v_cutoff    numeric := 60;
  v_question_ids text[];
  v_correct   int := 0;
  v_incorrect int := 0;
  v_skipped   int := 0;
  v_total     int := 0;
  v_time      bigint := 0;
  v_score     numeric := 0;
  v_max       numeric := 0;
  v_pct       numeric := 0;
  v_acc       numeric := 0;
  v_rank      int := 1;
  v_cohort    int := 1;
  v_percentile numeric := 0;
begin
  select * into v_attempt from attempts where id = p_attempt_id;
  if not found then
    raise exception 'attempt % not found', p_attempt_id;
  end if;
  if v_attempt.user_id <> auth.uid() then
    raise exception 'not your attempt';
  end if;
  if v_attempt.submitted_at is not null then
    raise exception 'attempt already submitted';
  end if;

  select * into v_test from tests where id = v_attempt.test_id;

  -- Section order defines the paper; a question outside it is not marked.
  select coalesce(array_agg(qid), '{}')
    into v_question_ids
  from (
    select unnest(ts.question_ids) as qid
    from test_sections ts
    where ts.test_id = v_test.id
    order by ts.sort_order
  ) ordered;

  v_total := coalesce(array_length(v_question_ids, 1), 0);
  v_max   := v_total * v_test.marks_per_question;

  select
    count(*) filter (where aa.selected_index is not null
                       and aa.selected_index = q.correct_index),
    count(*) filter (where aa.selected_index is not null
                       and aa.selected_index <> q.correct_index),
    coalesce(sum(aa.time_spent_ms), 0)
  into v_correct, v_incorrect, v_time
  from questions q
  left join attempt_answers aa
    on aa.question_id = q.id and aa.attempt_id = p_attempt_id
  where q.id = any(v_question_ids);

  v_skipped := v_total - (v_correct + v_incorrect);

  -- Indian teaching exams never carry a negative total forward.
  v_score := greatest(0,
    v_correct * v_test.marks_per_question - v_incorrect * v_test.negative_marking);
  v_pct := case when v_max > 0 then round((v_score / v_max) * 100, 2) else 0 end;
  v_acc := case when (v_correct + v_incorrect) > 0
                then round((v_correct::numeric / (v_correct + v_incorrect)) * 100, 2)
                else 0 end;

  if v_test.paper_id is not null then
    select cutoff_general into v_cutoff from exam_papers where id = v_test.paper_id;
  end if;
  v_cutoff := coalesce(v_cutoff, 60);

  update attempts set
    submitted_at = now(),
    score = v_score, max_score = v_max, percentage = v_pct,
    correct = v_correct, incorrect = v_incorrect, skipped = v_skipped,
    accuracy = v_acc, total_time_ms = v_time,
    qualified = (v_pct >= v_cutoff)
  where id = p_attempt_id;

  -- Real cohort: every submitted attempt on this test, this learner included.
  select count(*) into v_cohort
    from attempts a where a.test_id = v_test.id and a.submitted_at is not null;
  select count(*) + 1 into v_rank
    from attempts a
    where a.test_id = v_test.id
      and a.submitted_at is not null
      and a.score > v_score;

  v_cohort := greatest(v_cohort, 1);
  v_percentile := case
    when v_cohort > 1 then round(((v_cohort - v_rank)::numeric / (v_cohort - 1)) * 100, 2)
    else 100
  end;

  update attempts set rank = v_rank, percentile = v_percentile where id = p_attempt_id;

  -- Submitting a paper counts as practising today.
  insert into activity_days (user_id, day)
  values (v_attempt.user_id, current_date)
  on conflict do nothing;

  return query select
    v_score, v_max, v_pct, v_correct, v_incorrect, v_skipped, v_acc,
    v_time, v_rank, v_cohort, v_percentile, (v_pct >= v_cutoff), v_cutoff;
end;
$$;

-- Per-subject breakdown for the analysis screen, marked server-side too.
create or replace function attempt_subject_scores(p_attempt_id uuid)
returns table (
  subject_id text, attempted int, correct int, incorrect int,
  skipped int, score numeric, max_score numeric, accuracy numeric, time_spent_ms bigint
)
language sql
security definer
set search_path = public
as $$
  with paper as (
    select unnest(ts.question_ids) as qid, t.marks_per_question, t.negative_marking
    from attempts a
    join tests t on t.id = a.test_id
    join test_sections ts on ts.test_id = t.id
    where a.id = p_attempt_id and a.user_id = auth.uid()
  )
  select
    q.subject_id,
    count(*) filter (where aa.selected_index is not null)::int,
    count(*) filter (where aa.selected_index = q.correct_index)::int,
    count(*) filter (where aa.selected_index is not null
                      and aa.selected_index <> q.correct_index)::int,
    count(*) filter (where aa.selected_index is null)::int,
    greatest(0,
      count(*) filter (where aa.selected_index = q.correct_index) * max(p.marks_per_question)
      - count(*) filter (where aa.selected_index is not null
                          and aa.selected_index <> q.correct_index) * max(p.negative_marking)),
    (count(*) * max(p.marks_per_question)),
    case when count(*) filter (where aa.selected_index is not null) > 0
      then round(
        count(*) filter (where aa.selected_index = q.correct_index)::numeric
        / count(*) filter (where aa.selected_index is not null) * 100, 2)
      else 0 end,
    coalesce(sum(aa.time_spent_ms), 0)::bigint
  from paper p
  join questions q on q.id = p.qid
  left join attempt_answers aa on aa.question_id = q.id and aa.attempt_id = p_attempt_id
  group by q.subject_id;
$$;

-- Topic accuracy, so "weak topics" reflects this learner's real history
-- across every attempt rather than one paper.
create or replace function my_topic_accuracy()
returns table (topic_id text, subject_id text, attempted int, correct int, accuracy numeric)
language sql
security definer
set search_path = public
as $$
  select
    q.topic_id,
    q.subject_id,
    count(*)::int,
    count(*) filter (where aa.selected_index = q.correct_index)::int,
    round(count(*) filter (where aa.selected_index = q.correct_index)::numeric
          / greatest(count(*), 1) * 100, 2)
  from attempt_answers aa
  join attempts a on a.id = aa.attempt_id
  join questions q on q.id = aa.question_id
  where a.user_id = auth.uid()
    and a.submitted_at is not null
    and aa.selected_index is not null
  group by q.topic_id, q.subject_id;
$$;

-- Keep the difficulty signal on each question honest as attempts accumulate.
create or replace function refresh_question_accuracy()
returns void
language sql
security definer
set search_path = public
as $$
  update questions q set accuracy = stats.acc
  from (
    select aa.question_id,
           round(count(*) filter (where aa.selected_index = qq.correct_index)::numeric
                 / greatest(count(*), 1), 3) as acc
    from attempt_answers aa
    join attempts a on a.id = aa.attempt_id and a.submitted_at is not null
    join questions qq on qq.id = aa.question_id
    where aa.selected_index is not null
    group by aa.question_id
    having count(*) >= 20
  ) stats
  where q.id = stats.question_id;
$$;
