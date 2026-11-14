/* =============================================================
 * 공유와 메뉴 카드 이미지 저장 (기획서 3-4, 4장, 7-1)
 *
 * 공유: 모바일은 기기 공유 바텀시트, PC는 링크 복사 + "링크 복사 완료!"
 * 카카오 SDK는 쓰지 않습니다. 실제 전송은 확인할 수 없어서 시트를 열거나 복사하면 인정합니다.
 * 이미지 저장만 <canvas>를 씁니다(기획서 7-1 예외).
 * ============================================================= */

const Share = (() => {
  const S = CONFIG.SHARE;

  function siteUrl() {
    return location.origin + location.pathname.replace(/index\.html$/, '');
  }
  function fill(tpl, data) { return tpl.replace(/\{(\w+)\}/g, (_, k) => (data[k] == null ? '' : data[k])); }

  /* 손가락으로 쓰는 기기(휴대폰·태블릿)이고 공유 바텀시트를 지원하면 모바일 방식 */
  function isMobile() {
    const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    return !!(coarse && navigator.share);
  }

  /* 돌려주는 값: { ok: 공유로 인정하는지, method: 'native' | 'copy' | 'prompt' }
   * 모바일: 바텀시트를 열면 인정 (닫아도 인정) / PC: 링크 복사가 끝나면 인정 (기획서 3-4) */
  async function share(text) {
    const url = siteUrl();
    if (isMobile()) {
      try {
        await navigator.share({ title: S.title, text, url });
        return { ok: true, method: 'native' };
      } catch (e) {
        if (e && e.name === 'AbortError') return { ok: true, method: 'native' }; // 시트는 열렸음
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      return { ok: true, method: 'copy' };
    } catch (e) { /* 아래로 */ }
    window.prompt('아래 링크를 복사해서 친구에게 보내 주세요', url);
    return { ok: true, method: 'prompt' };
  }

  function resultText(r) { return fill(S.resultText, r); }
  function continueText(r) { return fill(S.continueText, r); }

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

  /* 메뉴 카드 (기획서 4장): 메뉴명, 한 줄 PS, 점수
   * r: { score, metaText, nick, menu, menuGroup, menuPs, menuArtSrc } */
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
    // 제목 글꼴은 글자별로 나눠 받아서, 카드에 쓸 글자를 먼저 불러 둠
    if (document.fonts && document.fonts.load) {
      try { await document.fonts.load(`${F.menu}px ${title}`, r.menu + Number(r.score).toLocaleString('ko-KR') + '점'); } catch (e) { /* 기본 글꼴 */ }
    }

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
    ctx.fillText('오늘 저녁, 이거 어때요? · ' + r.menuGroup, W / 2, y);
    y += F.eyebrow;

    const art = await loadImage(r.menuArtSrc);
    if (art) {
      const h = K.menuArtHeight, w = h * (art.width / art.height || 1);
      const fit = Math.min(1, inner / w);
      ctx.drawImage(art, W / 2 - (w * fit) / 2, y, w * fit, h * fit);
      y += h * fit;
    }

    y += F.menu * K.lineGap;
    ctx.fillStyle = ink;
    ctx.font = `${F.menu}px ${title}`;
    ctx.fillText(r.menu, W / 2, y);
    y += F.ps * K.lineGap * 0.4;
    ctx.font = `${F.ps}px ${body}`;
    for (const line of wrapLines(ctx, r.menuPs, inner)) { y += F.ps * K.lineGap; ctx.fillText(line, W / 2, y); }

    y += F.score * K.lineGap;
    ctx.font = `${F.score}px ${title}`;
    const scoreText = Number(r.score).toLocaleString('ko-KR');
    const sw = ctx.measureText(scoreText).width;
    ctx.font = `${F.unit}px ${title}`;
    const uw = ctx.measureText('점').width;
    ctx.textAlign = 'left';
    ctx.fillStyle = accent;
    ctx.font = `${F.score}px ${title}`;
    ctx.fillText(scoreText, W / 2 - (sw + uw) / 2, y);
    ctx.font = `${F.unit}px ${title}`;
    ctx.fillText('점', W / 2 - (sw + uw) / 2 + sw, y);
    ctx.textAlign = 'center';
    y += F.meta * K.lineGap;
    ctx.fillStyle = soft;
    ctx.font = `${F.meta}px ${body}`;
    ctx.fillText(r.metaText, W / 2, y);

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

  return { share, resultText, continueText, saveImage };
})();
