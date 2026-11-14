/* =============================================================
 * 게임 상태: 레벨, 단계, 점수, 타이머 (기획서 2~3장)
 *
 * 여기서는 상태만 바꾸고, 화면은 View.xxx()에 맡깁니다.
 * 숫자는 모두 CONFIG에서 가져옵니다.
 *
 * phase 흐름
 *   home → intro → count → play → clear → intro … → result
 *                                └→ fail → (공유) → intro / result
 *   play 중 화면을 벗어나면 paused → 돌아오면 3·2·1 후 이어서
 * ============================================================= */

const Game = (() => {
  const C = CONFIG;
  const LEVELS = C.LEVELS;
  const MS = 1000;

  const S = {
    phase: 'home',
    run: null,        // 지금 판
    lv: null,         // 지금 레벨
    record: null,     // 결과 화면에 띄운 판 기록
    timers: [],
    raf: 0,
    resumeTo: null    // 'level' = 레벨 처음부터, 'play' = 하던 곳부터
  };

  /* ---------- 타이머 ---------- */
  function later(seconds, fn) { S.timers.push(setTimeout(fn, seconds * MS)); }
  function clearTimers() {
    S.timers.forEach(clearTimeout);
    S.timers = [];
    cancelAnimationFrame(S.raf);
  }

  /* ---------- 하루 판 수 (기획서 2장, 3-4) ---------- */
  function playsUsed() {
    const p = Store.get('plays', null);
    return p && p.day === Records.dayKey(Date.now()) ? p.used : 0;
  }
  function plays() {
    const unlimited = !!C.DEMO.disableDailyLimit;
    return { unlimited, total: C.DAILY_PLAYS, left: unlimited ? C.DAILY_PLAYS : Math.max(0, C.DAILY_PLAYS - playsUsed()) };
  }
  function usePlay() {
    if (C.DEMO.disableDailyLimit) return;
    Store.set('plays', { day: Records.dayKey(Date.now()), used: playsUsed() + 1 });
  }

  /* ---------- 화면 ---------- */
  function home() {
    clearTimers();
    S.phase = 'home'; S.run = null;
    View.overlay(null);
    View.show('home');
    View.renderHome({ plays: plays(), nick: Records.nickText() });
  }
  function showEnd() {
    clearTimers();
    S.phase = 'end';
    View.overlay(null);
    View.show('end');
    View.renderEnd({ plays: plays() });
  }

  /* ---------- 판 시작 ---------- */
  function start() {
    const p = plays();
    if (!p.unlimited && p.left <= 0) return showEnd();
    usePlay();
    S.run = {
      index: 0,
      score: 0,
      levelScores: [],
      anger: C.ANGER.start,
      cleared: 0,
      continued: false,
      continuesLeft: C.CONTINUE.perRun
    };
    S.record = null;
    View.blurAll();
    View.show('play');
    startLevel();
  }

  function level() { return LEVELS[S.run.index]; }

  function startLevel() {
    clearTimers();
    S.lv = { taps: 0, stage: 0, elapsedBefore: 0, startedAt: 0, tapTimes: [] };
    const lv = level();
    View.renderLevel({ level: lv, index: S.run.index, score: S.run.score, anger: S.run.anger });
    S.phase = 'intro';
    View.overlay('intro', { level: lv });
    later(C.TIMING.introPanelSeconds, () => countdown('준비!', beginPlay));
  }

  /* 3·2·1 (이 동안 시간은 안 감) */
  function countdown(note, done) {
    S.phase = 'count';
    let n = C.TIMING.countdownFrom;
    const step = () => {
      if (n <= 0) { View.overlay(null); done(); return; }
      View.overlay('count', { n, note });
      n -= 1;
      later(C.TIMING.countStepSeconds, step);
    };
    step();
  }

  function beginPlay() {
    S.phase = 'play';
    S.lv.startedAt = performance.now();
    loop();
  }

  function elapsed() {
    const lv = S.lv;
    return lv.elapsedBefore + (S.phase === 'play' ? (performance.now() - lv.startedAt) / MS : 0);
  }

  function loop() {
    if (S.phase !== 'play') return;
    const limit = level().timeLimit;
    const t = elapsed();
    if (t >= limit) { View.renderTime(0, limit); fail(); return; }
    View.renderTime(limit - t, limit);
    S.raf = requestAnimationFrame(loop);
  }

  /* ---------- 다지기 ---------- */
  function tap() {
    if (S.phase !== 'play') return;
    const lv = level();
    const now = performance.now();
    if (elapsed() >= lv.timeLimit) { fail(); return; }

    // 매크로 방지: 최근 1초 동안 maxTapsPerSecond번을 넘으면 무시 (기획서 3-4)
    S.lv.tapTimes = S.lv.tapTimes.filter(t => now - t < MS);
    if (S.lv.tapTimes.length >= C.ANTI_MACRO.maxTapsPerSecond) return;
    S.lv.tapTimes.push(now);

    S.lv.taps += 1;
    const ratio = S.lv.taps / lv.taps;
    let stage = 0;
    C.GARLIC_STAGES.forEach((s, i) => { if (ratio >= s.at) stage = i; });
    const stageChanged = stage !== S.lv.stage;
    S.lv.stage = stage;
    View.renderTap({ level: lv, taps: S.lv.taps, stage, stageChanged });

    if (S.lv.taps >= lv.taps) clear();
  }

  /* ---------- 레벨 클리어 (기획서 3-1, 3-2) ---------- */
  function clear() {
    const lv = level();
    const t = Math.max(elapsed(), Number.EPSILON);
    S.phase = 'clear';
    cancelAnimationFrame(S.raf);

    const speed = lv.taps / t;
    const points = Math.round(speed * C.SCORE.perLevelBase * lv.level);
    const run = S.run;
    run.levelScores[run.index] = points;
    run.score += points;
    run.anger = Math.max(0, run.anger - lv.relief);
    run.cleared = lv.level;

    const last = run.index === LEVELS.length - 1;
    const bonus = last ? C.SCORE.allClearBonus : 0;
    run.score += bonus;

    View.renderScore(run.score);
    View.renderAnger(run.anger);
    View.overlay('clear', { level: lv, index: run.index, points, bonus, next: last ? null : LEVELS[run.index + 1] });

    later(C.TIMING.clearPopupSeconds, () => {
      if (last) { finish(); return; }
      run.index += 1;
      startLevel();
    });
  }

  /* ---------- FAIL과 이어하기 (기획서 3-3) ---------- */
  function fail() {
    const lv = level();
    S.phase = 'fail';
    clearTimers();
    const taps = S.lv.taps;
    // 지금 속도로 끝까지 쳤다면 얼마나 더 걸렸을지
    const short = taps > 0 ? lv.timeLimit * lv.taps / taps - lv.timeLimit : null;
    const canContinue = S.run.continuesLeft > 0;
    View.overlay('fail', { level: lv, index: S.run.index, taps, short, canContinue, continuesLeft: S.run.continuesLeft });
    if (!canContinue) later(C.TIMING.failToResultSeconds, finish);
  }

  async function continueRun() {
    if (S.phase !== 'fail' || S.run.continuesLeft <= 0) return;
    S.phase = 'sharing'; // 공유 창 때문에 화면을 벗어나도 일시정지하지 않음
    const lv = level();
    const res = await Share.share(Share.continueText({ level: lv.level, score: S.run.score }));
    if (res.method === 'copy') View.toast('링크를 복사했어요. 친구에게 붙여 넣어 주세요');
    if (!res.ok) { S.phase = 'fail'; return; }
    S.run.continued = true;
    S.run.continuesLeft -= 1;
    startLevel();
  }

  function giveUp() {
    if (S.phase !== 'fail') return;
    finish();
  }

  /* ---------- 일시정지 (기획서 3-4 앱 이탈) ---------- */
  function pause() {
    if (S.phase === 'play') {
      S.lv.elapsedBefore = elapsed();
      clearTimers();
      S.phase = 'paused';
      S.resumeTo = 'play';
    } else if (S.phase === 'intro' || S.phase === 'count') {
      clearTimers();
      View.overlay(null);
      S.phase = 'paused';
      S.resumeTo = S.lv.elapsedBefore > 0 ? 'play' : 'level';
    } else if (S.phase === 'clear') {
      // 클리어 연출 중에 나가면 다음 레벨은 돌아온 뒤에 시작
      clearTimers();
      View.overlay(null);
      if (S.run.index === LEVELS.length - 1) { finish(); return; }
      S.run.index += 1;
      S.phase = 'paused';
      S.resumeTo = 'level';
    }
  }

  function resume() {
    if (S.phase !== 'paused' || document.hidden) return;
    if (S.resumeTo === 'level') startLevel();
    else countdown('다시 시작!', beginPlay);
  }

  function quit() {
    if (!S.run) return home();
    const wasPlaying = S.phase === 'play' || S.phase === 'intro' || S.phase === 'count';
    pause();
    if (window.confirm('그만하고 홈으로 갈까요?\n이번 판은 돌려받을 수 없어요.')) { home(); return; }
    if (wasPlaying) resume();
  }

  /* ---------- 결과 (기획서 2장, 6장 ⑥) ---------- */
  function reliefPercent(run) {
    return Math.min(100, Math.round((C.ANGER.start - run.anger) / C.ANGER.start * 100));
  }

  function resultData() {
    const run = S.run, rec = S.record;
    const relief = reliefPercent(run);
    const metaText = (run.cleared ? 'LV' + run.cleared + '까지 · ' + run.cleared + '쪽 다짐' : 'LV1에서 멈춤') + ' · 화 ' + relief + '% 해소';
    const menu = rec.menu ? findMenu(rec.menu) : null;
    return {
      score: run.score, relief, metaText,
      allClear: run.cleared === LEVELS.length,
      continued: run.continued,
      nick: Records.nickText(),
      nickCreated: S.nickCreated,
      rank: Records.rankOf(rec),
      menu: menu && menu.menu, menuGroup: menu && menu.group.label,
      plays: plays()
    };
  }

  function finish() {
    clearTimers();
    View.overlay(null);
    S.phase = 'result';
    const run = S.run;
    const made = Records.ensureNick();
    S.nickCreated = made.created;
    S.record = Records.add({
      nick: Records.nickText(made.nick),
      score: run.score,
      level: run.cleared,
      continued: run.continued,
      relief: reliefPercent(run)
    });
    View.show('result');
    View.renderResult(resultData());
  }

  /* ---------- 오늘의 저녁 (기획서 4장) ---------- */
  function groupFor(levelReached) {
    return C.MENU_GROUPS.find(g => levelReached >= g.minLevel && levelReached <= g.maxLevel) || C.MENU_GROUPS[0];
  }
  function findMenu(name) {
    for (const group of C.MENU_GROUPS) {
      const menu = group.menus.find(m => m.name === name);
      if (menu) return { group, menu };
    }
    return null;
  }
  function revealDinner() {
    if (S.phase !== 'result' || !S.record || S.record.menu) return;
    const group = groupFor(S.run.cleared);
    const lastMenu = Store.get('lastMenu', null);
    const pool = group.menus.filter(m => m.name !== lastMenu);
    const pick = (pool.length ? pool : group.menus)[Math.floor(Math.random() * (pool.length || group.menus.length))];
    S.record.menu = pick.name;
    Records.update(S.record.id, { menu: pick.name });
    Store.set('lastMenu', pick.name);
    View.renderDinner(pick, group.label);
  }

  /* ---------- 결과 공유, 이미지 저장 ---------- */
  async function shareResult() {
    if (!S.record) return;
    const d = resultData();
    const res = await Share.share(Share.resultText({ score: d.score.toLocaleString('ko-KR'), relief: d.relief, menu: d.menu && d.menu.name, level: S.run.cleared }));
    if (res.method === 'copy') View.toast('링크를 복사했어요. 친구에게 붙여 넣어 주세요');
  }

  async function saveImage() {
    if (!S.record) return;
    const d = resultData();
    const rankText = d.rank ? '이번 달 랭킹 ' + d.rank + '위' : '';
    const ok = await Share.saveImage({
      score: d.score, metaText: d.metaText, rankText, nick: d.nick,
      menu: d.menu && d.menu.name, menuGroup: d.menuGroup, menuPs: d.menu && d.menu.ps,
      menuArtSrc: d.menu ? await View.gfxSource(d.menu.image) : null
    });
    View.toast(ok ? '이미지를 저장했어요' : '이미지를 만들지 못했어요');
  }

  function retry() {
    const p = plays();
    if (!p.unlimited && p.left <= 0) return showEnd();
    start();
  }

  /* ---------- 리더보드, 기록, 닉네임 ---------- */
  function openBoard() {
    const b = Records.board(Date.now());
    b.nick = Records.nickText();
    View.renderBoard(b);
  }
  function openHistory() { View.renderHistory(Records.recent(Date.now())); }
  function clearHistory() {
    if (!window.confirm('이 기기에 저장된 기록을 모두 지울까요?\n최근 7일 기록과 랭킹 기록이 함께 지워져요.')) return;
    Records.clearAll();
    View.closeSheets();
    View.toast('기록을 지웠어요');
  }
  function editNick() { View.openNick(Records.ensureNick().nick); }
  function saveNick(name) {
    const err = Records.setNickName(name);
    if (err) { View.nickError(err); return; }
    View.closeNick();
    View.toast('닉네임을 바꿨어요');
    const nick = Records.nickText();
    if (S.phase === 'home') View.renderHome({ plays: plays(), nick });
    if (S.phase === 'result') View.renderResult(resultData());
    if (document.getElementById('board').classList.contains('open')) openBoard();
  }
  function resetPlays() {
    Store.remove('plays');
    View.toast('오늘 판 수를 다시 채웠어요');
    View.renderHome({ plays: plays(), nick: Records.nickText() });
  }

  function init() {
    View.init(api);
    Share.preload();
    home();
  }

  const api = {
    start, tap, quit, pause, resume, continueRun, giveUp, revealDinner, shareResult, saveImage, retry, home,
    openBoard, openHistory, clearHistory, editNick, saveNick, resetPlays,
    get state() { return S; } // 개발자 도구에서 확인용
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  return api;
})();
