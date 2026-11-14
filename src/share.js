/* =============================================================
 * 공유와 이미지 저장 (기획서 3-3, 8장)
 *
 * 공유 순서: 카카오톡(키가 있을 때) → 기기 기본 공유 창 → 링크 복사
 * 공유 창을 열기만 해도 성공으로 칩니다(기획서 3-3: 실제 전송은 확인할 수 없음).
 * 이미지 저장만 <canvas>를 씁니다(기획서 7-1 예외).
 * ============================================================= */

const Share = (() => {
  const S = CONFIG.SHARE;
  let kakaoReady = null;

  function kakaoKey() {
    return (typeof SECRETS !== 'undefined' && SECRETS && SECRETS.KAKAO_JS_KEY) || '';
  }
  function siteUrl() {
    return location.origin + location.pathname.replace(/index\.html$/, '');
  }
  function absolute(path) { return new URL(path, siteUrl()).href; }
  function fill(tpl, data) { return tpl.replace(/\{(\w+)\}/g, (_, k) => (data[k] == null ? '' : data[k])); }

  /* 카카오 SDK는 키가 있을 때만 불러옴 */
  function loadKakao() {
    const key = kakaoKey();
    if (!key) return Promise.resolve(false);
    if (kakaoReady) return kakaoReady;
    kakaoReady = new Promise(resolve => {
      const s = document.createElement('script');
      s.src = S.kakaoSdkUrl;
      s.crossOrigin = 'anonymous';
      s.onload = () => {
        try { if (!window.Kakao.isInitialized()) window.Kakao.init(key); resolve(true); } catch (e) { resolve(false); }
      };
      s.onerror = () => resolve(false);
      document.head.appendChild(s);
    });
    return kakaoReady;
  }

  /* 돌려주는 값: { ok: 공유 창을 열었는지, method: 'kakao' | 'native' | 'copy' | 'prompt' } */
  async function share(text) {
    const url = siteUrl();
    if (await loadKakao()) {
      try {
        window.Kakao.Share.sendDefault({
          objectType: 'feed',
          content: { title: S.title, description: text, imageUrl: absolute(S.ogImage), link: { mobileWebUrl: url, webUrl: url } },
          buttons: [{ title: S.buttonText, link: { mobileWebUrl: url, webUrl: url } }]
        });
        return { ok: true, method: 'kakao' };
      } catch (e) { /* 아래 방법으로 대신 */ }
    }
    if (navigator.share) {
      try {
        await navigator.share({ title: S.title, text, url });
        return { ok: true, method: 'native' };
      } catch (e) {
        if (e && e.name === 'AbortError') return { ok: true, method: 'native' }; // 창은 열렸음
      }
    }
    try {
      await navigator.clipboard.writeText(text + ' ' + url);
      return { ok: true, method: 'copy' };
    } catch (e) { /* 아래로 */ }
    window.prompt('아래 링크를 복사해서 친구에게 보내 주세요', url);
    return { ok: true, method: 'prompt' };
  }

  function resultText(r) {
    return fill(r.menu ? S.resultText : S.resultTextNoMenu, r);
  }
  function continueText(r) {
    return fill(S.continueText, r);
  }

  /* ---------- 결과 카드 이미지 ---------- */
  function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

  function loadImage(src) {
    return new Promise(resolve => {
      if (!src) return resolve(null);
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  function wrapLines(ctx, text, maxWidth) {
    const lines = [];
    let line = '';
    for (const word of String(text).split(' ')) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width <= maxWidth) { line = test; continue; }
      if (line) lines.push(line);
      line = '';
      for (const ch of word) { // 단어 하나가 너무 길면 글자 단위로 자름
        if (ctx.measureText(line + ch).width > maxWidth && line) { lines.push(line); line = ''; }
        line += ch;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* r: { score, metaText, rankText, nick, menu, menuGroup, menuPs, menuArtSrc } */
  async function saveImage(r) {
    const K = S.card, F = K.font;
    const canvas = document.createElement('canvas');
    canvas.width = K.width; canvas.height = K.height;
    const ctx = canvas.getContext('2d');
    if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) { /* 기본 글꼴 */ } }

    const title = cssVar('--font-title') || 'sans-serif';
    const body = cssVar('--font-body') || 'sans-serif';
    const ink = cssVar('--ink'), soft = cssVar('--ink-soft'), accent = cssVar('--accent-dark');
    const W = K.width, P = K.pad, inner = W - P * 2;

    ctx.fillStyle = cssVar('--bg');
    ctx.fillRect(0, 0, W, K.height);
    ctx.fillStyle = cssVar('--card');
    roundRect(ctx, P / 2, P / 2, W - P, K.height - P, K.radius);
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    let y = P * 2;

    ctx.fillStyle = accent;
    ctx.font = `700 ${F.eyebrow}px ${body}`;
    ctx.fillText('오늘의 다짐 기록', W / 2, y);
    y += F.score;

    ctx.fillStyle = ink;
    ctx.font = `${F.score}px ${title}`;
    const scoreText = Number(r.score).toLocaleString('ko-KR');
    const sw = ctx.measureText(scoreText).width;
    ctx.font = `${F.unit}px ${title}`;
    const uw = ctx.measureText('점').width;
    ctx.textAlign = 'left';
    ctx.font = `${F.score}px ${title}`;
    ctx.fillText(scoreText, W / 2 - (sw + uw) / 2, y);
    ctx.font = `${F.unit}px ${title}`;
    ctx.fillText('점', W / 2 - (sw + uw) / 2 + sw, y);
    ctx.textAlign = 'center';
    y += F.meta * K.lineGap * 1.4;

    ctx.fillStyle = soft;
    ctx.font = `${F.meta}px ${body}`;
    ctx.fillText(r.metaText, W / 2, y);
    if (r.rankText) { y += F.meta * K.lineGap; ctx.fillText(r.rankText, W / 2, y); }
    y += F.meta * K.lineGap;

    if (r.menu) {
      const art = await loadImage(r.menuArtSrc);
      if (art) {
        const h = K.menuArtHeight, w = h * (art.width / art.height || 1);
        const fit = Math.min(1, inner / w);
        ctx.drawImage(art, W / 2 - (w * fit) / 2, y, w * fit, h * fit);
        y += h * fit;
      }
      y += F.menuGroup * K.lineGap;
      ctx.fillStyle = accent;
      ctx.font = `700 ${F.menuGroup}px ${body}`;
      ctx.fillText('오늘 저녁, 이거 어때요? · ' + r.menuGroup, W / 2, y);
      y += F.menu * K.lineGap;
      ctx.fillStyle = ink;
      ctx.font = `${F.menu}px ${title}`;
      ctx.fillText(r.menu, W / 2, y);
      y += F.ps * K.lineGap;
      ctx.font = `${F.ps}px ${body}`;
      for (const line of wrapLines(ctx, r.menuPs, inner)) { y += F.ps * K.lineGap; ctx.fillText(line, W / 2, y); }
    }

    ctx.fillStyle = soft;
    ctx.font = `${F.foot}px ${body}`;
    const footY = K.height - P * 1.4;
    if (r.nick) ctx.fillText(r.nick, W / 2, footY - F.foot * K.lineGap);
    ctx.fillText(CONFIG.GAME_NAME + ' · ' + siteUrl().replace(/^https?:\/\//, ''), W / 2, footY);

    const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
    if (!blob) return false;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = CONFIG.GAME_NAME.replace(/\s/g, '') + '-' + r.score + '.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 0);
    return true;
  }

  return { share, resultText, continueText, saveImage, preload: loadKakao };
})();
