/* =============================================================
 * 화면 반영 (상태 → DOM), 그래픽 불러오기, 입력, 효과음
 *
 * game.js가 View.xxx()를 불러서 화면을 바꿉니다.
 * 보이는 모습은 style.css의 클래스와 src/assets/images/ 그래픽이 정합니다.
 * ============================================================= */

const View = (() => {
  const C = CONFIG;
  const $ = id => document.getElementById(id);
  let G = null;           // Game
  let toastTimer = 0;

  /* ---------- 그래픽 ----------
   * 1) src/assets/images/<이름>.svg|webp|png 가 있으면 그 파일
   * 2) 없으면 index.html 안의 임시 그래픽(<symbol>)
   * 3) 그것도 없으면 이름 글자 */
  const SPRITES = {
    'tool-auto-mixer-back': 'sym-blend-back', 'tool-auto-mixer-front': 'sym-blend-front', 'tool-auto-mixer': 'sym-blend-lid',
    'tool-hand-mixer-back': 'sym-chop-back',  'tool-hand-mixer-front': 'sym-chop-front',  'tool-hand-mixer': 'sym-chop-lid',
    'tool-mortar-back': 'sym-mortar-back',    'tool-mortar-front': 'sym-mortar-front',    'tool-mortar': 'sym-pestle',
    'tool-knife-back': 'sym-board', 'tool-knife': 'sym-knife',
    'tool-fist-back': 'sym-board',  'tool-fist': 'sym-fist',
    'tool-fork-back': 'sym-board',  'tool-fork': 'sym-fork'
  };
  const found = {};       // 이름 → 파일 주소(있음) | false(없음)
  const probing = {};     // 이름 → Promise

  function spriteId(name) {
    if (SPRITES[name]) return SPRITES[name];
    if (/^mascot-/.test(name)) return 'sym-mascot';
    const g = name.match(/^garlic-stage(\d+)$/);
    if (g) return 'sym-g' + g[1];
    if (/^menu-/.test(name)) return 'sym-' + name;
    return null;
  }

  function probe(name) {
    if (name in found) return Promise.resolve(found[name]);
    if (probing[name]) return probing[name];
    const exts = C.ASSETS.extensions.slice();
    probing[name] = new Promise(resolve => {
      const next = () => {
        if (!exts.length) { found[name] = false; return resolve(false); }
        const src = C.ASSETS.imageDir + name + '.' + exts.shift();
        const img = new Image();
        img.onload = () => { found[name] = src; resolve(src); };
        img.onerror = next;
        img.src = src;
      };
      next();
    });
    return probing[name];
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function paint(el, name, label) {
    if (found[name]) { el.innerHTML = '<img src="' + esc(found[name]) + '" alt="" draggable="false">'; return; }
    const sym = spriteId(name);
    if (sym && document.getElementById(sym)) { el.innerHTML = '<svg aria-hidden="true"><use href="#' + sym + '"/></svg>'; return; }
    el.innerHTML = label && C.ASSETS.fallbackToText ? '<span class="gfx-text">' + esc(label) + '</span>' : '';
  }

  /* el 칸에 name 그래픽을 넣음. label은 그래픽이 하나도 없을 때 띄울 이름 */
  function setGfx(el, name, label) {
    if (!el) return;
    if (!name) { el.innerHTML = ''; el.dataset.gfx = ''; return; }
    if (el.dataset.gfx === name && el.firstChild) return;
    el.dataset.gfx = name;
    paint(el, name, label);
    if (!(name in found)) probe(name).then(src => { if (src && el.dataset.gfx === name) paint(el, name, label); });
  }

  /* 이미지 저장용: 파일이 있으면 그 주소, 없으면 임시 그래픽을 SVG 데이터로 */
  async function gfxSource(name) {
    const src = await probe(name);
    if (src) return src;
    const sym = document.getElementById(spriteId(name) || '');
    if (!sym) return null;
    const vb = sym.getAttribute('viewBox');
    const size = vb.split(/\s+/);
    const defs = document.querySelector('svg.sprite defs');
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '" width="' + size[2] + '" height="' + size[3] + '">' +
      (defs ? defs.outerHTML : '') + sym.innerHTML + '</svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function toolLayers(comp, lv) {
    comp.dataset.tool = lv.key;
    setGfx(comp.querySelector('.layer.base'), lv.image + '-back');
    setGfx(comp.querySelector('.layer.front'), lv.image + '-front');
    setGfx(comp.querySelector('.layer.tool'), lv.image, lv.name);
  }

  /* ---------- 효과음 ---------- */
  const Sound = (() => {
    const cache = {};
    let ctx = null;
    let on = Store.get('sound', true);
    function tone() {
      const T = C.SOUND.fallbackTone;
      try {
        ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'triangle';
        o.frequency.value = T.freq;
        g.gain.setValueAtTime(T.volume, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(T.volume / 100, ctx.currentTime + T.seconds);
        o.connect(g).connect(ctx.destination);
        o.start();
        o.stop(ctx.currentTime + T.seconds);
      } catch (e) { /* 소리 없이 진행 */ }
    }
    function load(name) {
      if (cache[name] !== undefined) return cache[name];
      const a = new Audio(C.ASSETS.soundDir + name + '.' + C.SOUND.ext);
      a.preload = 'auto';
      a.addEventListener('error', () => { cache[name] = false; });
      cache[name] = a;
      return a;
    }
    return {
      get on() { return on; },
      toggle() { on = !on; Store.set('sound', on); return on; },
      preload(names) { names.forEach(load); },
      play(name, fallback) {
        if (!on) return;
        const a = load(name);
        if (a && a.readyState >= 2) {
          try { a.currentTime = 0; a.play().catch(() => {}); } catch (e) { /* 무시 */ }
        } else if (fallback) tone();
      }
    };
  })();

  /* ---------- 공통 ---------- */
  function show(screen) {
    $('app').dataset.screen = screen;
    closeSheets();
  }

  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), C.TIMING.toastSeconds * 1000);
  }

  function restartClass(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth; // 애니메이션을 처음부터 다시
    el.classList.add(cls);
  }

  function setBar(el, ratio) {
    el.style.setProperty('--p', Math.max(0, Math.min(1, ratio)));
  }

  function playsText(p) {
    return p.unlimited ? '시연 모드 · 판 수 제한 없음' : '오늘 ' + p.left + '/' + p.total + '판 남음';
  }

  /* 받침 있는 숫자/글자 뒤에는 '으로', 없거나 ㄹ이면 '로' */
  function ro(word) {
    const last = String(word).slice(-1);
    if (/[0-9]/.test(last)) return '036'.includes(last) ? '으로' : '로';
    const code = last.charCodeAt(0) - 0xAC00;
    if (code < 0 || code > 11171) return '로';
    const jong = code % 28;
    return jong === 0 || jong === 8 ? '로' : '으로';
  }

  /* ---------- ① 홈 ---------- */
  function renderHome(d) {
    $('homeTitle').textContent = C.GAME_NAME;
    $('homeSub').textContent = C.TEXT.tagline;
    const plays = $('homePlays');
    plays.innerHTML = '<i></i>' + esc(playsText(d.plays));
    plays.classList.toggle('empty', !d.plays.unlimited && d.plays.left === 0);
    $('resetPlays').hidden = !C.DEMO.showResetButton;
    $('homeNick').hidden = !d.nick;
    $('homeNickName').textContent = d.nick || '';
  }

  /* ---------- ③ 플레이 ---------- */
  function renderDots(index, failed) {
    const box = $('lvDots');
    if (box.children.length !== C.LEVELS.length) box.innerHTML = C.LEVELS.map(() => '<span></span>').join('');
    [...box.children].forEach((s, i) => {
      s.className = i < index ? 'done' : i === index ? (failed ? 'fail' : 'now') : '';
    });
  }

  function renderLevel(d) {
    const lv = d.level;
    $('lvName').textContent = 'LV' + lv.level + ' ' + lv.name;
    renderScore(d.score);
    renderDots(d.index, false);
    const stage = $('stage');
    stage.classList.remove('hit', 'done');
    toolLayers(stage, lv);
    stage.setAttribute('aria-label', lv.name + '로 마늘 패기 (탭 또는 스페이스바)');
    renderGarlic(0, false);
    $('fx').innerHTML = '';
    $('prog').textContent = '0/' + lv.taps;
    setBar($('progBar'), 0);
    renderTime(lv.timeLimit, lv.timeLimit);
    renderAnger(d.anger);
  }

  function renderGarlic(stageIndex, animate) {
    const st = C.GARLIC_STAGES[stageIndex];
    const target = $('target');
    setGfx(target.querySelector('.gfx'), st.image, st.name);
    $('stageName').textContent = st.name;
    if (animate) restartClass(target, 'changed');
  }

  function renderScore(score) { $('score').textContent = score.toLocaleString('ko-KR') + '점'; }

  function renderTime(left, limit) {
    $('timeNum').textContent = Math.max(0, left).toFixed(1) + '초';
    setBar($('timeBar'), left / limit);
    $('timeRow').classList.toggle('low', left / limit < C.TIMING.lowTimeRatio);
  }

  function renderAnger(anger) {
    $('angerNum').textContent = Math.max(0, Math.round(anger));
    setBar($('angerBar'), anger / C.ANGER.start);
  }

  function renderTap(d) {
    const lv = d.level;
    const stage = $('stage');
    $('prog').textContent = d.taps + '/' + lv.taps;
    setBar($('progBar'), d.taps / lv.taps);
    if (d.stageChanged) renderGarlic(d.stage, true);
    restartClass(stage, 'hit');
    if (lv.shake) restartClass($('s-play'), 'shake-' + lv.shake);
    if (d.taps >= lv.taps) stage.classList.add('done');

    const fx = $('fx');
    const words = lv.sound.split(' ');
    const pop = document.createElement('span');
    pop.className = 'pop';
    pop.textContent = words[(d.taps - 1) % words.length];
    pop.style.setProperty('--rx', Math.random());
    pop.style.setProperty('--ry', Math.random());
    fx.appendChild(pop);
    for (let i = 0; i < C.FX.crumbsPerTap; i++) {
      const c = document.createElement('i');
      c.className = 'crumb';
      c.style.setProperty('--rx', Math.random());
      c.style.setProperty('--ry', Math.random());
      fx.appendChild(c);
    }
    Sound.play('sfx-' + lv.key, true);
  }

  /* ---------- 겹침 화면 ---------- */
  function overlay(panel, d) {
    const o = $('overlay');
    if (!panel) { delete o.dataset.panel; return; }
    if (panel === 'intro') {
      const lv = d.level;
      $('introLevel').textContent = 'LEVEL ' + lv.level;
      toolLayers($('introMini'), lv);
      $('introTool').textContent = '도구: ' + lv.name;
      $('introTime').textContent = lv.timeLimit.toFixed(1) + '초 안에!';
      $('introTaste').textContent = lv.taste;
    }
    if (panel === 'count') {
      const n = $('countNum');
      n.textContent = d.n;
      restartClass(n, 'num');
      $('countNote').textContent = d.note;
      Sound.play('sfx-countdown', false);
    }
    if (panel === 'clear') {
      $('clearTitle').textContent = 'LV' + d.level.level + ' CLEAR!';
      $('clearPts').textContent = '+' + d.points.toLocaleString('ko-KR') + '점';
      $('clearBonus').hidden = !d.bonus;
      $('clearBonus').textContent = '6쪽 완주 보너스 +' + (d.bonus || 0).toLocaleString('ko-KR') + '점';
      $('clearNext').textContent = d.next ? '다음: LV' + d.next.level + ' ' + d.next.name : '오늘의 마늘을 다 다졌어요!';
      renderDots(d.index + 1, false);
      Sound.play('sfx-clear', false);
    }
    if (panel === 'fail') {
      $('failLv').textContent = 'LV' + d.level.level + ' ' + d.level.name;
      const left = d.level.taps - d.taps;
      $('failShort').textContent = d.short != null
        ? d.short.toFixed(1) + '초 모자람 · ' + left + '번 더 쳐야 했어요'
        : '한 번도 못 쳤어요. 마늘을 터치해 보세요';
      $('continueBtn').hidden = !d.canContinue;
      $('continueLeft').hidden = !d.canContinue;
      $('continueLeft').textContent = '남은 기회 ' + d.continuesLeft + ' · 실패한 레벨부터, 점수는 그대로';
      $('giveUpBtn').textContent = d.canContinue ? '결과 보기' : '결과 보러 가는 중…';
      renderDots(d.index, true);
      Sound.play('sfx-fail', false);
    }
    o.dataset.panel = panel;
  }

  /* ---------- ⑥ 결과 ---------- */
  function renderResult(d) {
    setGfx(document.querySelector('#s-result .chef .gfx'), 'mascot-happy');
    $('resScore').textContent = d.score.toLocaleString('ko-KR');
    $('resMeta').textContent = d.metaText;
    const badges = [];
    if (d.allClear) badges.push('<span class="badge gold">🏆 6쪽 완주</span>');
    if (d.continued) badges.push('<span class="badge">♻ 이어하기</span>');
    if (d.nickCreated) badges.push('<span class="badge">🎉 첫 기록</span>');
    $('resBadges').innerHTML = badges.join('');
    renderRank(d);
    $('dinnerWrap').hidden = !!d.menu;
    $('dinnerCard').hidden = !d.menu;
    if (d.menu) renderDinner(d.menu, d.menuGroup);
    $('resLeft').textContent = playsText(d.plays);
    $('resultCard').querySelector('.scroll').scrollTop = 0;
  }

  function renderRank(d) {
    const nick = '<b>' + esc(d.nick) + '</b>';
    let html;
    if (!d.rank) html = '0점 기록은 랭킹에 올라가지 않아요 · ' + nick;
    else if (d.nickCreated) html = '이번 달 랭킹 ' + d.rank + '위에 ' + nick + ro(d.nick) + ' 올라갔어요';
    else html = '이번 달 랭킹 ' + d.rank + '위 · ' + nick;
    $('resRank').innerHTML = html;
  }

  function renderDinner(menu, group) {
    $('dinnerWrap').hidden = true;
    $('dinnerCard').hidden = false;
    $('menuGroup').textContent = group;
    $('menuName').textContent = menu.name;
    setGfx($('menuGfx'), menu.image, menu.name);
    $('menuPs').textContent = menu.ps;
  }

  /* ---------- ⑧ 오늘 끝 ---------- */
  function renderEnd(d) {
    setGfx(document.querySelector('#s-end .end-hero .gfx'), 'mascot-sleep');
    $('endPlays').textContent = d.plays.unlimited ? '시연 모드' : d.plays.left + '/' + d.plays.total + '판';
  }

  /* ---------- 시트 ---------- */
  function openSheet(id, dimId) { $(id).classList.add('open'); $(dimId).classList.add('open'); }
  function closeSheets() {
    ['board', 'sheet', 'boardDim', 'sheetDim'].forEach(id => $(id).classList.remove('open'));
  }

  function rankRow(r, me) {
    return '<li' + (me ? ' class="me"' : '') + '><span class="rk">' + r.rank + '</span><span class="nm">' + esc(r.nick) +
      (r.continued ? '<span class="re" title="이어하기 기록">♻</span>' : '') + '</span><span class="sc">' + r.score.toLocaleString('ko-KR') + '</span></li>';
  }

  function renderBoard(d) {
    const month = Number(d.month.split('-')[1]);
    $('boardTitle').textContent = '이번 달 랭킹 · ' + month + '월';
    $('boardList').innerHTML = d.top.length ? d.top.map(r => rankRow(r, false)).join('') : '<li class="empty">이번 달 기록이 아직 없어요. 한 판 다져 보세요!</li>';
    $('boardMe').innerHTML = d.me ? rankRow(d.me, true) : '<li class="empty">아직 순위가 없어요</li>';
    $('fameList').innerHTML = d.fame.length ? d.fame.map(r => rankRow(r, false)).join('') : '<li class="empty">지난달 기록이 없어요</li>';
    $('boardNick').hidden = !d.nick;
    $('boardNickName').textContent = d.nick || '';
    openSheet('board', 'boardDim');
  }

  function renderHistory(days) {
    const fmt = d => { const p = d.split('-'); return Number(p[1]) + '월 ' + Number(p[2]) + '일'; };
    let runs = 0, best = 0;
    $('days').innerHTML = days.map((d, i) => {
      runs += d.runs.length;
      d.runs.forEach(r => { best = Math.max(best, r.score); });
      const head = '<div class="day-head">' + fmt(d.day) + (i === 0 ? ' · 오늘' : '') + '<span>' + d.runs.length + '판</span></div>';
      const body = d.runs.length
        ? d.runs.map(r => '<div class="run"><span class="lv">' + (r.level ? 'LV' + r.level : 'LV1 실패') + '</span><span class="mn">' + esc(r.menu || '메뉴 안 봄') + (r.continued ? ' ♻' : '') + '</span><span class="sc">' + r.score.toLocaleString('ko-KR') + '점</span></div>').join('')
        : '<div class="none">기록 없음</div>';
      return '<div class="day">' + head + body + '</div>';
    }).join('');
    $('weekSum').textContent = runs ? C.HISTORY.days + '일 동안 ' + runs + '판 · 최고 ' + best.toLocaleString('ko-KR') + '점' : '최근 ' + C.HISTORY.days + '일 동안 기록이 없어요';
    $('clearHistory').hidden = !runs;
    openSheet('sheet', 'sheetDim');
  }

  /* ---------- 닉네임 모달 ---------- */
  function openNick(nick) {
    $('nickInput').value = nick.name;
    $('nickInput').maxLength = C.NICKNAME.maxLength;
    $('nickTag').textContent = '#' + nick.tag;
    $('nickErr').textContent = '';
    $('nickModal').classList.add('open');
    setTimeout(() => $('nickInput').focus(), 0);
  }
  function closeNick() { $('nickModal').classList.remove('open'); }
  function nickError(msg) { $('nickErr').textContent = msg; }

  /* ---------- 입력 연결 ---------- */
  function bind() {
    const on = (id, fn) => $(id).addEventListener('click', fn);
    on('startBtn', () => G.start());
    on('homeBoard', () => G.openBoard());
    on('homeHistory', () => G.openHistory());
    on('resetPlays', () => G.resetPlays());
    on('homeNickEdit', () => G.editNick());
    on('quitBtn', () => G.quit());
    on('continueBtn', () => G.continueRun());
    on('giveUpBtn', () => G.giveUp());
    on('dinnerBtn', () => G.revealDinner());
    on('saveBtn', () => G.saveImage());
    on('shareBtn', () => G.shareResult());
    on('resBoard', () => G.openBoard());
    on('retryBtn', () => G.retry());
    on('resNickEdit', () => G.editNick());
    on('endBoard', () => G.openBoard());
    on('endHome', () => G.home());
    on('closeBoard', closeSheets);
    on('boardDim', closeSheets);
    on('boardNickEdit', () => G.editNick());
    on('closeSheet', closeSheets);
    on('sheetDim', closeSheets);
    on('clearHistory', () => G.clearHistory());
    on('nickCancel', closeNick);
    $('nickForm').addEventListener('submit', e => { e.preventDefault(); G.saveNick($('nickInput').value); });
    $('nickModal').addEventListener('click', e => { if (e.target === $('nickModal')) closeNick(); });

    on('soundBtn', () => {
      const now = Sound.toggle();
      $('app').dataset.sound = now ? 'on' : 'off';
      $('soundBtn').setAttribute('aria-pressed', String(now));
    });
    $('app').dataset.sound = Sound.on ? 'on' : 'off';

    /* 마늘 터치: pointerdown이 가장 빠름. 확대·스크롤 막기 */
    $('stage').addEventListener('pointerdown', e => { e.preventDefault(); G.tap(); });
    $('stage').addEventListener('contextmenu', e => e.preventDefault());

    /* PC 스페이스바: 누르고 있기(repeat)는 1번만. 플레이 중에는 버튼이 눌리지 않게 막음 */
    const playing = () => $('app').dataset.screen === 'play';
    document.addEventListener('keydown', e => {
      if (e.code !== 'Space' && e.key !== ' ') return;
      if (!playing()) return;
      e.preventDefault();
      if (e.repeat) return;
      G.tap();
    });
    document.addEventListener('keyup', e => {
      if ((e.code === 'Space' || e.key === ' ') && playing()) e.preventDefault();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { closeSheets(); closeNick(); }
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) G.pause(); else G.resume();
    });
    window.addEventListener('pagehide', () => G.pause());
  }

  function init(game) {
    G = game;
    document.querySelectorAll('.gfx[data-gfx]').forEach(el => { const n = el.dataset.gfx; el.dataset.gfx = ''; setGfx(el, n); });
    bind();
    Sound.preload(C.LEVELS.map(l => 'sfx-' + l.key).concat(['sfx-clear', 'sfx-fail', 'sfx-countdown']));
    // 첫 레벨 그래픽은 미리 찾아 둠
    C.GARLIC_STAGES.forEach(s => probe(s.image));
  }

  return {
    init, show, toast, renderHome, renderLevel, renderGarlic, renderScore, renderTime, renderAnger, renderTap,
    overlay, renderResult, renderDinner, renderEnd, renderBoard, renderHistory, closeSheets,
    openNick, closeNick, nickError, gfxSource, blurAll: () => document.activeElement && document.activeElement.blur && document.activeElement.blur()
  };
})();
