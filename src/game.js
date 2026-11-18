/* =============================================================
 * 게임 상태: 레벨, 단계, 점수, 콤보, 타이머 (기획서 2~3장, v1.3)
 *
 * 여기서는 상태만 바꾸고, 화면은 View.xxx()에 맡깁니다.
 * 숫자는 모두 CONFIG에서 가져옵니다.
 *
 * phase 흐름
 *   home → mission → play → score → mission … → result
 *                      └→ fail → (공유) → mission / result
 *   화면을 벗어나면 paused → 돌아오면 3·2·1 후 이어서 (기획서 3-5)
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
    menu: null,       // 결과 화면의 메뉴 { menu, group }
    timers: [],
    raf: 0,
    resumeTo: null,   // 'level' = 미션 팝업부터, 'play' = 하던 곳부터
    popupAt: 0,       // 미션·점수 팝업이 뜬 시각
    popupNext: null,  // 팝업이 끝나면 할 일 (시간이 다 되거나 탭하면 실행)
    nickCreated: false
  };

  /* ---------- 타이머 ---------- */
  function later(seconds, fn) { S.timers.push(setTimeout(fn, seconds * MS)); }

  /* 미션·점수 팝업: seconds 뒤 자동으로, 또는 탭하면 바로 next 실행 (v1.4) */
  function popup(seconds, next) {
    S.popupAt = performance.now();
    S.popupNext = next;
    later(seconds, runPopupNext);
  }
  function runPopupNext() {
    const next = S.popupNext;
    S.popupNext = null;
    if (next) next();
  }
  function skipPopup() {
    if (S.phase !== 'mission' && S.phase !== 'score') return;
    if (!S.popupNext || performance.now() - S.popupAt < C.TIMING.popupSkipGuardSeconds * MS) return;
    clearTimers();
    runPopupNext();
  }
  function clearTimers() {
    S.timers.forEach(clearTimeout);
    S.timers = [];
    cancelAnimationFrame(S.raf);
  }

  /* ---------- 하루 판 수 (기획서 2장, 3-5) ---------- */
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
    View.renderHome({ plays: plays(), nick: Records.nickText(), hasBoard: Records.hasBoard(Date.now()) });
  }
  function showEnd() {
    clearTimers();
    S.phase = 'end';
    View.overlay(null);
    View.show('end');
    View.renderEnd({ plays: plays(), hasBoard: Records.hasBoard(Date.now()) });
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
      continuesLeft: C.CONTINUE.perRun,
      combo: 0,             // 레벨이 바뀌어도 이어짐
      comboGap: 0,          // 마지막 탭 뒤로 플레이 중에 흐른 시간 (팝업 동안은 안 셈)
      crits: 0
    };
    S.record = null;
    S.menu = null;
    View.blurAll();
    View.show('play');
    View.renderCombo(comboView(false));
    startLevel();
  }

  function level() { return LEVELS[S.run.index]; }

  /* 미션 팝업 → 자동으로 플레이 시작 (기획서 3-5) */
  function startLevel() {
    clearTimers();
    S.lv = { taps: 0, stage: 0, elapsedBefore: 0, startedAt: 0, tapTimes: [], lastTapAt: 0, bestTier: 0, crits: 0 };
    const lv = level();
    View.renderLevel({ level: lv, index: S.run.index, score: S.run.score, anger: S.run.anger });
    S.phase = 'mission';
    View.overlay('mission', { level: lv, seconds: C.TIMING.missionPopupSeconds });
    popup(C.TIMING.missionPopupSeconds, () => { View.overlay(null); beginPlay(); });
  }

  /* 3·2·1 (앱을 벗어났다 돌아왔을 때만) */
  function countdown(done) {
    S.phase = 'count';
    let n = C.TIMING.countdownFrom;
    const step = () => {
      if (n <= 0) { View.overlay(null); done(); return; }
      View.overlay('count', { n, note: '다시 시작!' });
      n -= 1;
      later(C.TIMING.countStepSeconds, step);
    };
    step();
  }

  function beginPlay() {
    S.phase = 'play';
    const now = performance.now();
    S.lv.startedAt = now;
    S.lv.lastTapAt = now - S.run.comboGap * MS; // 팝업 동안 멈춘 시간은 콤보 간격에 안 넣음
    loop();
  }

  function elapsed() {
    const lv = S.lv;
    return lv.elapsedBefore + (S.phase === 'play' ? (performance.now() - lv.startedAt) / MS : 0);
  }

  /* ---------- 콤보 (기획서 3-3) ---------- */
  function tierIndex(combo) {
    let i = 0;
    C.COMBO.tiers.forEach((t, k) => { if (combo >= t.min) i = k; });
    return i;
  }
  function comboView(bumped, tierUp) {
    const combo = S.run ? S.run.combo : 0;
    const i = tierIndex(combo);
    const tier = C.COMBO.tiers[i];
    return { combo, mult: tier.mult, fx: tier.fx, bumped: !!bumped, tierUp: !!tierUp };
  }
  function breakCombo() {
    if (!S.run || S.run.combo === 0) return;
    S.run.combo = 0;
    View.renderCombo(comboView(false));
  }
  function freezeComboGap() {
    if (S.phase === 'play') S.run.comboGap = (performance.now() - S.lv.lastTapAt) / MS;
  }

  function loop() {
    if (S.phase !== 'play') return;
    const limit = level().timeLimit;
    const t = elapsed();
    if (t >= limit) { View.renderTime(0, limit); fail(); return; }
    View.renderTime(limit - t, limit);
    if (S.run.combo > 0 && performance.now() - S.lv.lastTapAt > C.COMBO.gapSeconds * MS) breakCombo();
    S.raf = requestAnimationFrame(loop);
  }

  /* ---------- 다지기 ---------- */
  function tap() {
    if (S.phase === 'mission' || S.phase === 'score') { skipPopup(); return; }
    if (S.phase !== 'play') return;
    const lv = level();
    const run = S.run;
    const now = performance.now();
    if (elapsed() >= lv.timeLimit) { fail(); return; }

    // 매크로 방지: 최근 1초 동안 maxTapsPerSecond번을 넘으면 무시하고 콤보도 끊음 (기획서 3-5)
    S.lv.tapTimes = S.lv.tapTimes.filter(t => now - t < MS);
    if (S.lv.tapTimes.length >= C.ANTI_MACRO.maxTapsPerSecond) { breakCombo(); return; }
    S.lv.tapTimes.push(now);

    // 콤보: 탭 사이가 gapSeconds 이내면 이어짐
    const before = tierIndex(run.combo);
    run.combo = now - S.lv.lastTapAt <= C.COMBO.gapSeconds * MS ? run.combo + 1 : 1;
    S.lv.lastTapAt = now;
    const tier = tierIndex(run.combo);
    S.lv.bestTier = Math.max(S.lv.bestTier, tier);

    // 크리티컬: 확률로 터지고, 그 탭은 tapValue탭으로 인정
    const critical = Math.random() < C.CRITICAL.chance;
    if (critical) { S.lv.crits += 1; run.crits += 1; }
    S.lv.taps = Math.min(lv.taps, S.lv.taps + (critical ? C.CRITICAL.tapValue : 1));

    const ratio = S.lv.taps / lv.taps;
    let stage = 0;
    C.GARLIC_STAGES.forEach((s, i) => { if (ratio >= s.at) stage = i; });
    const stageChanged = stage !== S.lv.stage;
    S.lv.stage = stage;

    View.renderTap({ level: lv, taps: S.lv.taps, stage, stageChanged, critical });
    View.renderCombo(comboView(true, tier > before));

    if (S.lv.taps >= lv.taps) clear();
  }

  /* ---------- 레벨 클리어 (기획서 3-1, 3-2) ---------- */
  function clear() {
    const lv = level();
    const t = Math.max(elapsed(), Number.EPSILON);
    freezeComboGap();
    S.phase = 'score';
    cancelAnimationFrame(S.raf);

    const speed = lv.taps / t;
    const mult = C.COMBO.tiers[S.lv.bestTier].mult;
    const critBonus = S.lv.crits * C.CRITICAL.bonusPerLevel * lv.level;
    const points = Math.round(speed * C.SCORE.perLevelBase * lv.level * mult + critBonus);
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
    View.overlay('score', { level: lv, index: run.index, points, bonus, seconds: C.TIMING.scorePopupSeconds });

    popup(C.TIMING.scorePopupSeconds, () => {
      if (last) { finish(); return; }
      run.index += 1;
      startLevel();
    });
  }

  /* ---------- FAIL과 이어하기 (기획서 3-4) ---------- */
  function fail() {
    const lv = level();
    S.phase = 'fail';
    clearTimers();
    S.run.combo = 0;
    S.run.comboGap = 0;
    View.renderCombo(comboView(false));
    const canContinue = S.run.continuesLeft > 0;
    // 실패해도 여기까지 깬 레벨 기준으로 메뉴를 바로 보여 줌. 같은 레벨에서 끝나면 결과 화면도 이 메뉴 (v1.4)
    if (!S.menu || S.menu.level !== S.run.cleared) S.menu = pickMenu(S.run.cleared);
    View.overlay('fail', { level: lv, index: S.run.index, canContinue, continuesLeft: S.run.continuesLeft, menu: S.menu.menu });
    if (!canContinue) later(C.TIMING.failToResultSeconds, finish);
  }

  function shareToast(res) {
    if (res.method === 'copy') View.toast(C.SHARE.copiedToast);
    if (res.method === 'manual') View.toast(C.SHARE.manualToast);
  }

  async function continueRun() {
    if (S.phase !== 'fail' || S.run.continuesLeft <= 0) return;
    S.phase = 'sharing'; // 공유 바텀시트 때문에 화면을 벗어나도 일시정지하지 않음
    const lv = level();
    const res = await Share.share(Share.continueText({ level: lv.level, score: S.run.score, menu: S.menu ? S.menu.menu.name : '' }));
    shareToast(res);
    if (!res.ok) { S.phase = 'fail'; return; }
    S.run.continued = true;
    S.run.continuesLeft -= 1;
    startLevel();
  }

  function giveUp() {
    if (S.phase !== 'fail') return;
    finish();
  }

  /* ---------- 일시정지 (기획서 3-5 앱 이탈) ---------- */
  function pause() {
    if (S.phase === 'play') {
      freezeComboGap();
      S.lv.elapsedBefore = elapsed();
      clearTimers();
      S.phase = 'paused';
      S.resumeTo = 'play';
    } else if (S.phase === 'count') {
      clearTimers();
      View.overlay(null);
      S.phase = 'paused';
    } else if (S.phase === 'mission') {
      clearTimers();
      View.overlay(null);
      S.phase = 'paused';
      S.resumeTo = 'level';
    } else if (S.phase === 'score') {
      // 점수 팝업 중에 나가면 다음 레벨은 돌아온 뒤 미션 팝업부터
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
    else countdown(beginPlay);
  }

  function quit() {
    if (!S.run) return home();
    const wasPlaying = ['play', 'mission', 'count'].includes(S.phase);
    pause();
    if (window.confirm('그만하고 홈으로 갈까요?\n이번 판은 돌려받을 수 없어요.')) { home(); return; }
    if (wasPlaying) resume();
  }

  /* ---------- 결과 (기획서 2장, 4장, 6장) ---------- */
  function reliefPercent(run) {
    return Math.min(100, Math.round((C.ANGER.start - run.anger) / C.ANGER.start * 100));
  }

  /* 오늘의 저녁: 결과 화면이 열리면 바로 뽑음. 직전 판 메뉴는 뺌 (기획서 4장) */
  function pickMenu(levelReached) {
    const group = C.MENU_GROUPS.find(g => levelReached >= g.minLevel && levelReached <= g.maxLevel) || C.MENU_GROUPS[0];
    const lastMenu = Store.get('lastMenu', null);
    const pool = group.menus.filter(m => m.name !== lastMenu);
    const list = pool.length ? pool : group.menus;
    const menu = list[Math.floor(Math.random() * list.length)];
    Store.set('lastMenu', menu.name);
    return { group, menu, level: levelReached };
  }

  function resultData() {
    const run = S.run, rec = S.record;
    const relief = reliefPercent(run);
    const metaText = (run.cleared ? 'LV' + run.cleared : 'LV1 실패') + ' · 화 ' + relief + '% 해소';
    return {
      score: run.score, relief, metaText,
      allClear: run.cleared === LEVELS.length,
      continued: run.continued,
      crits: run.crits,
      nick: Records.nickText(),
      nickCreated: S.nickCreated,
      rank: Records.rankOf(rec),
      menu: S.menu.menu, menuGroup: S.menu.group.label,
      plays: plays(),
      hasBoard: Records.hasBoard(Date.now())
    };
  }

  function finish() {
    clearTimers();
    View.overlay(null);
    S.phase = 'result';
    const run = S.run;
    const made = Records.ensureNick();
    S.nickCreated = made.created;
    if (!S.menu || S.menu.level !== run.cleared) S.menu = pickMenu(run.cleared);
    S.record = Records.add({
      nick: Records.nickText(made.nick),
      score: run.score,
      level: run.cleared,
      continued: run.continued,
      relief: reliefPercent(run),
      menu: S.menu.menu.name
    });
    View.show('result');
    View.renderResult(resultData());
  }

  /* ---------- 결과 공유, 메뉴 카드 저장 ---------- */
  async function shareResult() {
    if (!S.record) return;
    const d = resultData();
    const res = await Share.share(Share.resultText({ score: d.score.toLocaleString('ko-KR'), relief: d.relief, menu: d.menu.name, level: S.run.cleared }));
    shareToast(res);
  }

  async function saveImage() {
    if (!S.record) return;
    const d = resultData();
    const ok = await Share.saveImage({
      score: d.score, metaText: d.metaText, nick: d.nick,
      menu: d.menu.name, menuGroup: d.menuGroup, menuPs: d.menu.ps,
      menuArtSrc: await View.gfxSource(d.menu.image)
    });
    View.toast(ok ? '메뉴 카드를 저장했어요' : '이미지를 만들지 못했어요');
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
    if (S.phase === 'home') home();
  }
  function editNick() { View.openNick(Records.ensureNick().nick); }
  function saveNick(name) {
    const err = Records.setNickName(name);
    if (err) { View.nickError(err); return; }
    View.closeNick();
    View.toast('닉네임을 바꿨어요');
    if (S.phase === 'home') home();
    if (S.phase === 'result') View.renderResult(resultData());
    if (document.getElementById('board').classList.contains('open')) openBoard();
  }
  function resetPlays() {
    Store.remove('plays');
    View.toast('오늘 판 수를 다시 채웠어요');
    home();
  }

  function init() {
    View.init(api);
    home();
  }

  const api = {
    start, tap, skipPopup, quit, pause, resume, continueRun, giveUp, shareResult, saveImage, retry, home,
    openBoard, openHistory, clearHistory, editNick, saveNick, resetPlays,
    get state() { return S; } // 개발자 도구에서 확인용
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  return api;
})();
