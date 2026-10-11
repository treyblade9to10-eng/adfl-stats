// Our own team logos (drawn here, not the companies' real logos) + the ADFL league logo. All plain SVG.
(function (G) {
  const A = G.ADFL;

  const SHIELD = 'M50 4 L92 15 L89 60 Q85 84 50 97 Q15 84 11 60 L8 15 Z';

  // Each glyph gets (main colour, accent colour) and returns SVG shapes in a 100x100 box.
  const GLYPH = {
    // Monarch butterfly
    MET: (c, k) => `<path fill="${c}" d="M50 33 C40 14 14 15 18 36 C20 48 36 50 50 48 Z"/><path fill="${c}" d="M50 33 C60 14 86 15 82 36 C80 48 64 50 50 48 Z"/>
      <path fill="${c}" d="M50 51 C38 52 26 60 30 72 C35 82 47 68 50 57 Z"/><path fill="${c}" d="M50 51 C62 52 74 60 70 72 C65 82 53 68 50 57 Z"/>
      <circle cx="30" cy="31" r="4" fill="${k}"/><circle cx="70" cy="31" r="4" fill="${k}"/><circle cx="37" cy="64" r="3" fill="${k}"/><circle cx="63" cy="64" r="3" fill="${k}"/>
      <rect x="47.5" y="28" width="5" height="46" rx="2.5" fill="${k}"/><path d="M48 29 Q44 20 40 18 M52 29 Q56 20 60 18" stroke="${c}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
    // Gator head
    ALD: (c, k) => `<path fill="${c}" d="M14 52 Q16 32 38 30 Q44 22 52 28 L84 36 Q90 42 84 48 L40 52 Z"/>
      <path fill="${c}" d="M18 58 L82 56 Q88 61 82 66 L42 70 Q22 70 18 58 Z"/>
      <path fill="#fff" d="M46 52 l3 6 l3-6 Z M56 51.5 l3 6 l3-6 Z M66 51 l3 6 l3-6 Z M74 50.5 l3 6 l3-6 Z M50 58 l3-6 l3 6 Z M62 57.5 l3-6 l3 6 Z"/>
      <circle cx="46" cy="32" r="6" fill="#fff"/><circle cx="47" cy="32" r="3" fill="${k}"/>`,
    // Shopping cart
    PNS: (c, k) => `<path d="M12 22 L24 28 L32 60 L76 60" stroke="${c}" stroke-width="7" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
      <path fill="${c}" d="M24 30 L86 30 L78 54 L31 54 Z"/>
      <path d="M39 33 L41 51 M51 33 L51 51 M63 33 L61 51 M28 42 L82 42" stroke="${k}" stroke-width="3"/>
      <circle cx="38" cy="73" r="7" fill="${c}"/><circle cx="70" cy="73" r="7" fill="${c}"/><circle cx="38" cy="73" r="2.5" fill="${k}"/><circle cx="70" cy="73" r="2.5" fill="${k}"/>`,
    // Bull with a bullseye face
    TGT: (c, k) => `<path fill="${c}" d="M30 40 Q10 34 14 14 Q22 28 38 30 Z"/><path fill="${c}" d="M70 40 Q90 34 86 14 Q78 28 62 30 Z"/>
      <circle cx="50" cy="56" r="27" fill="${c}"/><circle cx="50" cy="56" r="18" fill="${k}"/><circle cx="50" cy="56" r="9" fill="${c}"/>`,
    // Spear and round shield
    WMT: (c, k) => `<path d="M18 86 L78 22 M82 86 L22 22" stroke="${c}" stroke-width="6" stroke-linecap="round"/>
      <path fill="${c}" d="M74 16 L90 10 L84 26 Z M26 16 L10 10 L16 26 Z"/>
      <circle cx="50" cy="56" r="22" fill="${c}"/><circle cx="50" cy="56" r="14" fill="none" stroke="${k}" stroke-width="4"/><circle cx="50" cy="56" r="5" fill="${k}"/>`,
    // Claw marks
    COS: (c) => `<path fill="${c}" d="M26 20 Q40 50 28 84 Q50 50 34 18 Z"/><path fill="${c}" d="M44 16 Q58 48 46 88 Q68 48 52 14 Z"/><path fill="${c}" d="M62 20 Q76 50 64 84 Q86 50 70 18 Z"/>`,
    // Horseshoe
    MCD: (c, k) => `<path d="M30 22 L30 50 A20 20 0 0 0 70 50 L70 22" stroke="${c}" stroke-width="14" fill="none"/>
      <rect x="21" y="16" width="18" height="8" fill="${c}"/><rect x="61" y="16" width="18" height="8" fill="${c}"/>
      <g fill="${k}"><circle cx="30" cy="34" r="2.6"/><circle cx="30" cy="48" r="2.6"/><circle cx="70" cy="34" r="2.6"/><circle cx="70" cy="48" r="2.6"/><circle cx="38" cy="64" r="2.6"/><circle cx="62" cy="64" r="2.6"/></g>`,
    // Cheese wedge
    CUL: (c, k) => `<path fill="${c}" d="M14 50 L64 26 L88 40 L88 72 L14 72 Z"/><path fill="#fff6" d="M14 50 L64 26 L88 40 L38 52 Z"/><path d="M14 50 L38 52 L88 40" stroke="${k}" stroke-width="2" fill="none"/>
      <g fill="${k}"><circle cx="30" cy="62" r="5"/><circle cx="52" cy="64" r="3.5"/><circle cx="70" cy="58" r="6"/><circle cx="62" cy="38" r="3"/><circle cx="44" cy="44" r="2.5"/></g>`,
    // Crown
    BKG: (c, k) => `<path fill="${c}" d="M18 68 L16 30 L34 48 L50 20 L66 48 L84 30 L82 68 Z"/><rect x="18" y="66" width="64" height="12" fill="${c}"/>
      <rect x="18" y="66" width="64" height="3" fill="${k}"/><g fill="${k}"><circle cx="34" cy="72" r="3"/><circle cx="50" cy="72" r="3"/><circle cx="66" cy="72" r="3"/></g>
      <g fill="${c}"><circle cx="16" cy="28" r="4"/><circle cx="50" cy="18" r="4"/><circle cx="84" cy="28" r="4"/></g>`,
    // Wing
    WNG: (c, k) => `<path fill="${c}" d="M16 70 Q22 26 86 20 Q78 30 82 33 Q70 38 76 42 Q62 48 68 52 Q54 58 58 62 Q40 66 42 70 Z"/>
      <path d="M26 62 Q40 40 76 30 M30 66 Q46 50 70 44 M36 68 Q50 58 62 56" stroke="${k}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
    // Bandit mask
    TCB: (c, k) => `<path fill="${c}" d="M10 44 Q50 26 90 44 Q88 64 68 64 Q56 64 50 56 Q44 64 32 64 Q12 64 10 44 Z"/>
      <ellipse cx="33" cy="49" rx="9" ry="6" fill="${k}"/><ellipse cx="67" cy="49" rx="9" ry="6" fill="${k}"/>
      <path fill="${c}" d="M10 44 Q2 52 4 64 Q8 54 14 52 Z M90 44 Q98 52 96 64 Q92 54 86 52 Z"/>`,
    // Chili pepper
    CHP: (c, k) => `<path fill="#3fae49" stroke="#14501c" stroke-width="2.5" d="M30 34 Q52 24 66 40 Q82 58 72 86 Q66 68 52 58 Q36 50 26 46 Z"/>
      <path fill="#2b7a32" d="M22 32 Q28 24 36 30 Q34 40 26 46 Q18 42 22 32 Z"/><path d="M27 30 Q22 18 32 12" stroke="#2b7a32" stroke-width="4.5" fill="none" stroke-linecap="round"/>
      <path d="M40 36 Q58 38 68 54" stroke="#ffffffaa" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
  };

  A.logoSVG = function (tid, size) {
    const t = A.team(tid); if (!t) return '';
    const g = GLYPH[tid] ? GLYPH[tid](t.c2, t.c1) : `<text x="50" y="62" text-anchor="middle" font-size="30" fill="${t.c2}">${tid}</text>`;
    return `<svg class="tlogo" viewBox="0 0 100 100" width="${size || 24}" height="${size || 24}" role="img" aria-label="${A.esc(A.tName(tid))}">
      <path d="${SHIELD}" fill="${t.c1}" stroke="${t.c2}" stroke-width="5"/><path d="${SHIELD}" fill="none" stroke="#0005" stroke-width="1.5" transform="translate(50 50) scale(.86) translate(-50 -50)"/>
      <g transform="translate(50 52) scale(.78) translate(-50 -50)">${g}</g></svg>`;
  };

  // League logo: gold-rimmed shield, football, ADFL wordmark.
  A.appLogoSVG = function (size) {
    return `<svg class="alogo" viewBox="0 0 100 100" width="${size || 40}" height="${size || 40}" role="img" aria-label="ADFL">
      <path d="${SHIELD}" fill="#141a23" stroke="#f6c31c" stroke-width="5"/>
      <g transform="rotate(-28 50 38)"><ellipse cx="50" cy="38" rx="25" ry="14" fill="#f6c31c"/>
        <path d="M30 38 Q26 38 25 38 M70 38 Q74 38 75 38" stroke="#141a23" stroke-width="2"/>
        <path d="M37 38 L63 38" stroke="#141a23" stroke-width="2.5"/><path d="M41 34 L41 42 M46 34 L46 42 M51 34 L51 42 M56 34 L56 42 M61 34 L61 42" stroke="#141a23" stroke-width="2"/></g>
      <path d="M18 60 L84 60 L80 74 L14 74 Z" fill="#e8401c"/>
      <text x="49" y="72.5" text-anchor="middle" font-family="'Barlow Condensed','Arial Narrow',Arial,sans-serif" font-weight="900" font-style="italic" font-size="17" fill="#fff" letter-spacing="1">ADFL</text>
      <path d="M38 82 L62 82" stroke="#f6c31c" stroke-width="2"/></svg>`;
  };
})(globalThis);
