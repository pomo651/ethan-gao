-- Shared stats for /game (Blindfold Coin Puzzle).
-- The browser only calls record_coin_attempt(); the table itself is not readable or writable by anon.
--
-- "You beat X%": among all other players, the share who either have not won yet
-- or needed more tries for their first win than you did.

create schema if not exists coin_game;

create table coin_game.attempts (
  id          bigint generated always as identity primary key,
  player      uuid        not null,
  attempt_no  int         not null,
  won         boolean     not null,
  created_at  timestamptz not null default now(),
  unique (player, attempt_no)
);
alter table coin_game.attempts enable row level security;  -- no policies: direct access denied

create or replace function public.record_coin_attempt(p_player uuid, p_won boolean)
returns json
language plpgsql
security definer
set search_path = coin_game, public
as $$
declare
  v_no      int;
  v_first   int;
  v_players int;
  v_beaten  int;
begin
  -- Basic abuse guard: at most 30 attempts per player per minute.
  if (select count(*) from attempts where player = p_player and created_at > now() - interval '1 minute') >= 30 then
    raise exception 'slow down';
  end if;

  select coalesce(max(attempt_no), 0) + 1 into v_no from attempts where player = p_player;
  insert into attempts (player, attempt_no, won) values (p_player, v_no, p_won);

  with per_player as (
    select player, min(attempt_no) filter (where won) as first_win
    from attempts group by player
  )
  select
    (select first_win from per_player where player = p_player),
    count(*),
    count(*) filter (where player <> p_player and (first_win is null or first_win > (select first_win from per_player where player = p_player)))
  into v_first, v_players, v_beaten
  from per_player;

  return json_build_object(
    'attempt', v_no,
    'players', v_players,
    'first_win_try', v_first,
    'percentile', case when v_first is null or v_players <= 1 then null
                       else round(100.0 * v_beaten / (v_players - 1), 1) end
  );
end;
$$;

revoke all on function public.record_coin_attempt(uuid, boolean) from public;
grant execute on function public.record_coin_attempt(uuid, boolean) to anon;
