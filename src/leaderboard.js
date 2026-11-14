/* =============================================================
 * 기록 저장, 닉네임, 리더보드 (기획서 5장)
 *
 * 지금은 이 기기(localStorage)에만 저장합니다.
 * 서버를 붙일 때는 Records.add / Records.board 안쪽만 바꾸면 됩니다
 * (SECRETS.LEADERBOARD_URL이 비어 있으면 지금처럼 기기 기록으로 동작해야 함).
 * ============================================================= */

/* localStorage 감싸기: 사생활 보호 모드 등에서 실패해도 게임은 계속 돌아가게 */
const Store = (() => {
  const PREFIX = 'dazim:';
  return {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(PREFIX + key);
        return raw == null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch (e) { /* 저장 못 해도 진행 */ }
    },
    remove(key) {
      try { localStorage.removeItem(PREFIX + key); } catch (e) { /* 무시 */ }
    }
  };
})();

const Records = (() => {
  const C = CONFIG;
  const DAY_MS = 24 * 60 * 60 * 1000;
  const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: C.TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' });

  /* ---------- 날짜 (한국 시간 기준) ---------- */
  function dayKey(ts) { return dayFmt.format(new Date(ts)); }          // "2026-11-14"
  function monthKey(ts) { return dayKey(ts).slice(0, 7); }              // "2026-11"
  function prevMonthKey(ts) {
    const [y, m] = monthKey(ts).split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 2, 1));
    return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0');
  }
  function lastDays(n, ts) {
    const out = [];
    for (let i = 0; i < n; i++) out.push(dayKey(ts - i * DAY_MS));
    return out;
  }

  /* ---------- 닉네임 (기획서 5-2) ---------- */
  function nick() { return Store.get('nick', null); }
  function nickText(n) { n = n || nick(); return n ? n.name + '#' + n.tag : ''; }
  function ensureNick() {
    const had = nick();
    if (had) return { nick: had, created: false };
    const N = C.NICKNAME;
    const prefix = N.autoPrefixes[Math.floor(Math.random() * N.autoPrefixes.length)];
    const tag = String(Math.floor(Math.random() * Math.pow(10, N.tagDigits))).padStart(N.tagDigits, '0');
    const made = { name: prefix + ' 마늘', tag };
    Store.set('nick', made);
    return { nick: made, created: true };
  }
  /* 문제가 있으면 안내 문구를, 괜찮으면 null을 돌려줌 */
  function checkNickName(name) {
    const N = C.NICKNAME;
    const len = [...name].length;
    if (len < N.minLength || len > N.maxLength) return N.minLength + '~' + N.maxLength + '자로 지어 주세요';
    if (name.includes('#')) return '#은 쓸 수 없어요';
    const lower = name.toLowerCase().replace(/\s/g, '');
    if (N.bannedWords.some(w => w && lower.includes(String(w).toLowerCase()))) return '쓸 수 없는 말이 들어 있어요';
    return null;
  }
  function setNickName(raw) {
    const name = String(raw || '').trim().replace(/\s+/g, ' ');
    const err = checkNickName(name);
    if (err) return err;
    const cur = ensureNick().nick;
    Store.set('nick', { name, tag: cur.tag });
    return null;
  }

  /* ---------- 판 기록 ---------- */
  function all() { return Store.get('records', []); }
  function add(rec) {
    const now = Date.now();
    const full = Object.assign({ id: now.toString(36) + Math.random().toString(36).slice(2, 6), at: now, day: dayKey(now), month: monthKey(now), menu: null }, rec);
    const list = all();
    list.push(full);
    Store.set('records', list);
    return full;
  }
  function update(id, patch) {
    const list = all();
    const r = list.find(x => x.id === id);
    if (r) { Object.assign(r, patch); Store.set('records', list); }
  }
  function clearAll() { Store.remove('records'); }

  /* ---------- 리더보드 (기획서 5-1) ----------
   * 기기 기록만 있을 때는 이 기기의 판 기록을 점수순으로 보여 줌.
   * 동점이면 먼저 기록한 판이 위. 0점은 올리지 않음. */
  function ranked(month) {
    return all()
      .filter(r => r.month === month && (!C.LEADERBOARD.hideZeroScore || r.score > 0))
      .sort((a, b) => b.score - a.score || a.at - b.at);
  }
  function rankOf(rec) {
    const i = ranked(rec.month).findIndex(r => r.id === rec.id);
    return i < 0 ? null : i + 1;
  }
  function board(ts) {
    const list = ranked(monthKey(ts));
    const name = nickText();
    const row = (r, i) => ({ rank: i + 1, nick: name || '나', score: r.score, continued: !!r.continued });
    return {
      month: monthKey(ts),
      top: list.slice(0, C.LEADERBOARD.topN).map(row),
      me: list.length ? row(list[0], 0) : null,
      fame: ranked(prevMonthKey(ts)).slice(0, C.LEADERBOARD.hallOfFameCount).map(row)
    };
  }

  /* ---------- 최근 7일 ---------- */
  function recent(ts) {
    const days = lastDays(C.HISTORY.days, ts);
    const list = all();
    return days.map(d => ({ day: d, runs: list.filter(r => r.day === d).sort((a, b) => b.at - a.at) }));
  }

  return { dayKey, monthKey, nick, nickText, ensureNick, checkNickName, setNickName, add, update, clearAll, rankOf, board, recent };
})();
