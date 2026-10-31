/**
 * Pirinola3D — Modelo 3D estilizado de pirinola tradicional mexicana
 * Estética "Las Leyendas" (cel-shaded + contornos de tinta negra + texturas hand-painted).
 * Geometría limpia centrada en el eje Y, sin dependencias externas, exportable a .glb (glTF 2.0).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.Pirinola3D = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;

  const FACES = [
    {
      index: 0,
      angleDeg: 0,
      word: "FÁCIL",
      fill: "#0A8750",
      highlight: "#20B473",
      deep: "#065834",
      cream: "#FFF6E0",
      ink: "#062115"
    },
    {
      index: 1,
      angleDeg: 60,
      word: "MEDIO",
      fill: "#104CB4",
      highlight: "#2E75EC",
      deep: "#093078",
      cream: "#FFF6E0",
      ink: "#08142B"
    },
    {
      index: 2,
      angleDeg: 120,
      word: "DIFÍCIL",
      fill: "#C8142B",
      highlight: "#EE334B",
      deep: "#8E0A1B",
      cream: "#FFF6E0",
      ink: "#22080C"
    },
    {
      index: 3,
      angleDeg: 180,
      word: "FÁCIL",
      fill: "#0A8750",
      highlight: "#20B473",
      deep: "#065834",
      cream: "#FFF6E0",
      ink: "#062115"
    },
    {
      index: 4,
      angleDeg: 240,
      word: "MEDIO",
      fill: "#104CB4",
      highlight: "#2E75EC",
      deep: "#093078",
      cream: "#FFF6E0",
      ink: "#08142B"
    },
    {
      index: 5,
      angleDeg: 300,
      word: "DIFÍCIL",
      fill: "#C8142B",
      highlight: "#EE334B",
      deep: "#8E0A1B",
      cream: "#FFF6E0",
      ink: "#22080C"
    }
  ];

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function smoothstep(e0, e1, x) {
    const t = clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  // ============================================================================
  // 1. PARÁMETROS GEOMÉTRICOS COMPARTIDOS (CENTRADOS EN EJE Y: [-1.70, +1.70])
  // ============================================================================
  const Y_MIN = -1.70;
  const Y_MAX = 1.70;
  const Y_HEX_BOTTOM = -0.76; // Donde R_lathe cruza APOTHEM abajo
  const Y_FLAT_BOTTOM = -0.53;
  const Y_FLAT_TOP = 0.36;
  const Y_HEX_TOP = 0.55;     // Donde R_lathe cruza APOTHEM arriba

  const APOTHEM = 0.865;
  const PHI_FLAT = 26.8 * DEG;
  const R_FLAT_EDGE = APOTHEM / Math.cos(PHI_FLAT); // ~0.9690
  const R_CORNER = 0.978;
  const HALF_SPAN_MAX = R_CORNER * Math.sin(Math.PI / 6); // ~0.4890

  // Perfil de torno circular centrado en el eje Y
  function latheRadius(y) {
    if (y <= Y_MIN || y >= Y_MAX) return 0.0;

    // 1. Puntilla inferior cónica desgastada (-1.70 .. -1.60)
    if (y < -1.60) {
      const t = (y - Y_MIN) / 0.10;
      return 0.068 * Math.sqrt(clamp(t, 0, 1));
    }

    // 2. Punta inferior cónica de madera (-1.60 .. -0.76) -> alcanza APOTHEM en -0.76
    if (y < Y_HEX_BOTTOM) {
      const t = (y - -1.60) / (Y_HEX_BOTTOM - -1.60);
      return lerp(0.068, APOTHEM, Math.pow(t, 0.88));
    }

    // 3. Arco inferior donde el cono corta las 6 caras planas (-0.76 .. -0.53)
    if (y < Y_FLAT_BOTTOM) {
      const t = (y - Y_HEX_BOTTOM) / (Y_FLAT_BOTTOM - Y_HEX_BOTTOM);
      return lerp(APOTHEM, 1.02, smoothstep(0, 1, t));
    }

    // 4. Cuerpo hexagonal pleno (-0.53 .. +0.36)
    if (y <= Y_FLAT_TOP) {
      return 1.02;
    }

    // 5. Arco superior de transición al hombro (+0.36 .. +0.55)
    if (y <= Y_HEX_TOP) {
      const t = (y - Y_FLAT_TOP) / (Y_HEX_TOP - Y_FLAT_TOP);
      return lerp(1.02, APOTHEM, smoothstep(0, 1, t));
    }

    // 6. Hombro cónico superior torneado (+0.55 .. +0.73)
    if (y <= 0.73) {
      const t = (y - Y_HEX_TOP) / (0.73 - Y_HEX_TOP);
      return lerp(APOTHEM, 0.188, Math.pow(t, 0.76));
    }

    // 7. Cuello entallado de la espiga (+0.73 .. +0.81)
    if (y <= 0.81) {
      const t = (y - 0.73) / 0.08;
      return 0.188 - 0.022 * Math.sin(t * Math.PI);
    }

    // 8. Espiga superior cilíndrica esbelta con sutiles muescas de anillos (+0.81 .. +1.55)
    if (y <= 1.55) {
      const t = (y - 0.81) / (1.55 - 0.81);
      let r = lerp(0.182, 0.194, Math.sin(t * Math.PI * 0.80));
      const grooves = [0.23, 0.46, 0.69, 0.88];
      for (let g = 0; g < grooves.length; g++) {
        const d = (t - grooves[g]) / 0.022;
        if (Math.abs(d) < 1) r -= 0.007 * (1 - d * d);
      }
      return r;
    }

    // 9. Coronilla redondeada de madera (+1.55 .. +1.70)
    const t = clamp((Y_MAX - y) / (Y_MAX - 1.55), 0, 1);
    return 0.186 * Math.sqrt(t * (2 - t));
  }

  // Invierte R_lathe(y) = targetR en un intervalo monótono [yA, yB]
  function solveLatheY(targetR, yA, yB) {
    let lo = yA, hi = yB;
    const increasing = latheRadius(yB) > latheRadius(yA);
    for (let i = 0; i < 18; i++) {
      const mid = 0.5 * (lo + hi);
      const r = latheRadius(mid);
      if ((r < targetR) === increasing) lo = mid;
      else hi = mid;
    }
    return 0.5 * (lo + hi);
  }

  // ============================================================================
  // 2. TIPOGRAFÍA VECTORIAL ESTILO RÓTULO MEXICANO TRADICIONAL
  // ============================================================================
  const ROTULO_GLYPHS = {
    M: {
      w: 88,
      outers: [[
        [0, 100], [0, 10], [4, 0], [24, 0], [44, 42],
        [64, 0], [84, 0], [88, 10], [88, 100], [65, 100],
        [65, 43], [49, 76], [39, 76], [23, 43], [23, 100]
      ]],
      holes: []
    },
    I: {
      w: 36,
      outers: [[
        [0, 0], [36, 0], [36, 18], [29, 18], [29, 82],
        [36, 82], [36, 100], [0, 100], [0, 82], [7, 82],
        [7, 18], [0, 18]
      ]],
      holes: []
    },
    T: {
      w: 68,
      outers: [[
        [0, 0], [68, 0], [66, 21], [46, 21], [46, 85],
        [51, 89], [51, 100], [17, 100], [17, 89], [22, 85],
        [22, 21], [2, 21]
      ]],
      holes: []
    },
    O: {
      w: 72,
      outers: [[
        [15, 0], [57, 0], [72, 15], [72, 85],
        [57, 100], [15, 100], [0, 85], [0, 15]
      ]],
      holes: [[
        [23, 19], [49, 19], [50, 26], [50, 74],
        [49, 81], [23, 81], [22, 74], [22, 26]
      ]]
    },
    R: {
      w: 70,
      outers: [[
        [0, 100], [0, 0], [53, 0], [69, 14], [69, 43],
        [54, 56], [71, 100], [46, 100], [33, 60], [22, 60], [22, 100]
      ]],
      holes: [[
        [22, 18], [44, 18], [47, 23], [47, 37], [44, 42], [22, 42]
      ]]
    },
    E: {
      w: 60,
      outers: [[
        [0, 0], [60, 0], [58, 20], [22, 20], [22, 40],
        [51, 40], [51, 59], [22, 59], [22, 80], [60, 80],
        [58, 100], [0, 100]
      ]],
      holes: []
    },
    A: {
      w: 74,
      outers: [[
        [22, 0], [52, 0], [74, 100], [50, 100],
        [46, 77], [28, 77], [24, 100], [0, 100]
      ]],
      holes: [[
        [37, 19], [44, 58], [30, 58]
      ]]
    },
    L: {
      w: 56,
      outers: [[
        [0, 0], [23, 0], [23, 79], [56, 79], [54, 100], [0, 100]
      ]],
      holes: []
    },
    D: {
      w: 70,
      outers: [[
        [0, 0], [50, 0], [70, 18], [70, 82], [50, 100], [0, 100]
      ]],
      holes: [[
        [22, 19], [44, 19], [48, 26], [48, 74], [44, 81], [22, 81]
      ]]
    },
    P: {
      w: 67,
      outers: [[
        [0, 100], [0, 0], [51, 0], [67, 15], [67, 45],
        [51, 60], [22, 60], [22, 100]
      ]],
      holes: [[
        [22, 18], [43, 18], [46, 24], [46, 37], [43, 42], [22, 42]
      ]]
    },
    G: {
      w: 72,
      outers: [[
        [15, 0], [58, 0], [71, 14], [71, 32], [48, 32],
        [48, 19], [23, 19], [22, 26], [22, 74], [23, 81],
        [49, 81], [49, 63], [36, 63], [36, 46], [72, 46],
        [72, 85], [57, 100], [15, 100], [0, 85], [0, 15]
      ]],
      holes: []
    },
    U: {
      w: 70,
      outers: [[
        [0, 0], [22, 0], [22, 74], [25, 80], [45, 80],
        [48, 74], [48, 0], [70, 0], [70, 84], [55, 100],
        [15, 100], [0, 84]
      ]],
      holes: []
    },
    N: {
      w: 72,
      outers: [[
        [0, 100], [0, 0], [22, 0], [50, 56],
        [50, 0], [72, 0], [72, 100], [50, 100],
        [22, 44], [22, 100]
      ]],
      holes: []
    },
    F: {
      w: 58,
      outers: [[
        [0, 0], [58, 0], [56, 20], [22, 20], [22, 42],
        [49, 42], [49, 61], [22, 61], [22, 100], [0, 100]
      ]],
      holes: []
    },
    C: {
      w: 68,
      outers: [[
        [15, 0], [56, 0], [68, 13], [68, 33], [46, 33],
        [46, 19], [23, 19], [22, 26], [22, 74], [23, 81],
        [46, 81], [46, 67], [68, 67], [68, 87], [56, 100],
        [15, 100], [0, 85], [0, 15]
      ]],
      holes: []
    },
    "Á": {
      w: 74,
      outers: [
        [
          [22, 0], [52, 0], [74, 100], [50, 100],
          [46, 77], [28, 77], [24, 100], [0, 100]
        ],
        [
          [31, -6], [42, -21], [55, -21], [41, -6]
        ]
      ],
      holes: [[
        [37, 19], [44, 58], [30, 58]
      ]]
    },
    "Í": {
      w: 36,
      outers: [
        [
          [0, 0], [36, 0], [36, 18], [29, 18], [29, 82],
          [36, 82], [36, 100], [0, 100], [0, 82], [7, 82],
          [7, 18], [0, 18]
        ],
        [
          [11, -6], [22, -21], [35, -21], [21, -6]
        ]
      ],
      holes: []
    }
  };

  function traceGlyphPath(ctx, glyph, x0, y0, sx, sy, archAmp, wordCenterX, halfWordW) {
    function mapPt(pt) {
      const gx = x0 + pt[0] * sx;
      const norm = halfWordW > 0 ? (gx - wordCenterX) / halfWordW : 0;
      const archOffset = -archAmp * (1 - norm * norm);
      const gy = y0 + pt[1] * sy + archOffset;
      return [gx, gy];
    }

    for (let p = 0; p < glyph.outers.length; p++) {
      const poly = glyph.outers[p];
      const p0 = mapPt(poly[0]);
      ctx.moveTo(p0[0], p0[1]);
      for (let i = 1; i < poly.length; i++) {
        const pi = mapPt(poly[i]);
        ctx.lineTo(pi[0], pi[1]);
      }
      ctx.closePath();
    }

    for (let h = 0; h < glyph.holes.length; h++) {
      const hole = glyph.holes[h];
      const p0 = mapPt(hole[hole.length - 1]);
      ctx.moveTo(p0[0], p0[1]);
      for (let i = hole.length - 2; i >= 0; i--) {
        const pi = mapPt(hole[i]);
        ctx.lineTo(pi[0], pi[1]);
      }
      ctx.closePath();
    }
  }

  function drawRotuloWord(ctx, face, cx, cy, maxWidth, targetHeight) {
    const word = face.word;
    const isShort = word.length <= 4;
    const tracking = isShort ? 8.5 : 7.2;
    let totalUnits = 0;
    for (let i = 0; i < word.length; i++) {
      totalUnits += ROTULO_GLYPHS[word[i]].w + (i < word.length - 1 ? tracking : 0);
    }

    const sx = maxWidth / totalUnits;
    const sy = targetHeight / 100;
    const startX = cx - maxWidth * 0.5;
    const startY = cy - targetHeight * 0.5;
    const archAmp = isShort ? targetHeight * 0.03 : targetHeight * 0.042;
    const halfW = maxWidth * 0.5;

    function buildWordPath(dx, dy) {
      ctx.beginPath();
      let cursor = startX + dx;
      for (let i = 0; i < word.length; i++) {
        const g = ROTULO_GLYPHS[word[i]];
        traceGlyphPath(ctx, g, cursor, startY + dy, sx, sy, archAmp, cx + dx, halfW);
        cursor += (g.w + tracking) * sx;
      }
    }

    // 1. Sombra corrida tradicional de rótulo mexicano (extrusión 3D escalonada en tinta oscura)
    const extrudeSteps = isShort ? 7 : 6;
    const stepX = isShort ? 1.55 : 1.15;
    const stepY = isShort ? 1.95 : 1.55;
    ctx.fillStyle = face.ink;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    for (let s = extrudeSteps; s >= 1; s--) {
      const ox = s * stepX;
      const oy = s * stepY;
      buildWordPath(ox, oy);
      ctx.fill("evenodd");
      ctx.strokeStyle = face.ink;
      ctx.lineWidth = isShort ? 6.2 : 4.2;
      ctx.stroke();
    }

    // 2. Contorno exterior de tinta negra alrededor de cada letra
    buildWordPath(0, 0);
    ctx.strokeStyle = "#160D09";
    ctx.lineWidth = isShort ? 7.2 : 5.0;
    ctx.stroke();

    // 3. Filete crema luminoso desplazado (clásico de rotulista popular)
    buildWordPath(-1.2, -1.2);
    ctx.strokeStyle = face.cream;
    ctx.lineWidth = isShort ? 3.8 : 2.8;
    ctx.stroke();

    // 4. Relleno principal hand-painted con degradado cálido
    const hasAccent = /[ÁÉÍÓÚ]/.test(word);
    const accentExtra = hasAccent ? 22 * sy : 0;
    const grad = ctx.createLinearGradient(cx, startY - archAmp - accentExtra, cx, startY + targetHeight);
    grad.addColorStop(0.0, face.highlight);
    grad.addColorStop(0.48, face.fill);
    grad.addColorStop(1.0, face.deep);
    buildWordPath(0, 0);
    ctx.fillStyle = grad;
    ctx.fill("evenodd");

    // 5. Pinceladas internas de gouache y sutil transparencia de veta
    ctx.save();
    buildWordPath(0, 0);
    ctx.clip("evenodd");

    const rng = mulberry32(face.index * 977 + word.length * 131);
    ctx.globalAlpha = 0.24;
    ctx.strokeStyle = face.highlight;
    for (let i = 0; i < 16; i++) {
      const by = startY - archAmp - accentExtra * 0.5 + rng() * (targetHeight * 0.50 + accentExtra * 0.5);
      ctx.lineWidth = 2.0 + rng() * 3.5;
      ctx.beginPath();
      ctx.moveTo(startX - 8, by + (rng() - 0.5) * 4);
      ctx.quadraticCurveTo(cx, by - archAmp * 0.8, startX + maxWidth + 8, by + (rng() - 0.5) * 4);
      ctx.stroke();
    }

    ctx.globalAlpha = 0.34;
    ctx.fillStyle = "#FFF9EC";
    ctx.fillRect(startX - 6, startY - archAmp - accentExtra - 2, maxWidth + 12, targetHeight * 0.10 + accentExtra);
    ctx.restore();

    // 6. Trazo fino de tinta negra en el filo de cada letra para nitidez cartoon
    buildWordPath(0, 0);
    ctx.strokeStyle = "#160D09";
    ctx.lineWidth = isShort ? 2.5 : 2.0;
    ctx.stroke();

    // 7. Fileteado superior e inferior tradicional
    const barHalf = maxWidth * 0.38;
    drawRotuloOrnament(ctx, cx, startY - archAmp - (hasAccent ? 54 : 26), barHalf, face.fill, face.ink, face.cream);
    drawRotuloOrnament(ctx, cx, startY + targetHeight + 30, barHalf, face.fill, face.ink, face.cream);
  }

  function drawRotuloOrnament(ctx, cx, y, halfSpan, color, ink, cream) {
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.strokeStyle = ink;
    ctx.lineWidth = 7.0;
    ctx.beginPath();
    ctx.moveTo(cx - halfSpan, y + 2);
    ctx.quadraticCurveTo(cx - halfSpan * 0.5, y - 3, cx - 18, y);
    ctx.moveTo(cx + 18, y);
    ctx.quadraticCurveTo(cx + halfSpan * 0.5, y - 3, cx + halfSpan, y + 2);
    ctx.stroke();

    ctx.strokeStyle = color;
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(cx - halfSpan, y + 2);
    ctx.quadraticCurveTo(cx - halfSpan * 0.5, y - 3, cx - 18, y);
    ctx.moveTo(cx + 18, y);
    ctx.quadraticCurveTo(cx + halfSpan * 0.5, y - 3, cx + halfSpan, y + 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx, y - 8);
    ctx.lineTo(cx + 10, y);
    ctx.lineTo(cx, y + 8);
    ctx.lineTo(cx - 10, y);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 2.8;
    ctx.strokeStyle = ink;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, y, 2.2, 0, TAU);
    ctx.fillStyle = cream;
    ctx.fill();
    ctx.restore();
  }

  // ============================================================================
  // 3. PINTURA ARTÍSTICA HAND-PAINTED DEL ATLAS DE TEXTURAS (2048 x 2048)
  // ============================================================================
  const ATLAS_LAYOUT = {
    size: 2048,
    cellW: 682,
    cellH: 680,
    padX: 48,
    padY: 44,
    upperStripY0: 1372,
    upperStripY1: 1700,
    lowerStripY0: 1716,
    lowerStripY1: 2040
  };

  function paintWoodBlock(ctx, x, y, w, h, seed, verticalGrain) {
    const rng = mulberry32(seed);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();

    // Base cálida de madera clara tallada (pino/ayacahuite)
    const baseGrad = verticalGrain
      ? ctx.createLinearGradient(x, y, x + w, y + h * 0.4)
      : ctx.createLinearGradient(x, y, x, y + h);
    baseGrad.addColorStop(0.0, "#F6DCAC");
    baseGrad.addColorStop(0.35, "#EDC68C");
    baseGrad.addColorStop(0.70, "#F3D4A2");
    baseGrad.addColorStop(1.0, "#E0B273");
    ctx.fillStyle = baseGrad;
    ctx.fillRect(x, y, w, h);

    // Lavados pictóricos de gouache (manchas suaves cálidas tipo animación tradicional)
    for (let i = 0; i < 24; i++) {
      ctx.fillStyle = i % 2 === 0 ? "#FCE8C5" : "#D69E5D";
      ctx.globalAlpha = 0.08 + rng() * 0.08;
      if (verticalGrain) {
        const bx = x + rng() * w;
        const bw = 20 + rng() * 64;
        ctx.fillRect(bx - bw * 0.5, y, bw, h);
      } else {
        const by = y + rng() * h;
        const bh = 12 + rng() * 32;
        ctx.fillRect(x, by - bh * 0.5, w, bh);
      }
    }

    if (verticalGrain) {
      // Vetas catedral orgánicas y asimétricas pintadas a pincel
      const catCenter = x + w * (0.28 + rng() * 0.44);
      const grainRibbons = 17;
      for (let i = 0; i < grainRibbons; i++) {
        const side = i % 2 === 0 ? 1 : -1;
        const dist = (Math.floor(i / 2) + 0.45 + rng() * 0.35) * (w * 0.068);
        const gx = catCenter + side * dist;
        const curvePull = side * (16 + rng() * 26);
        const midDrift = (rng() - 0.5) * 18;

        // Sombra suave ámbar de la veta
        ctx.globalAlpha = 0.25 + rng() * 0.14;
        ctx.strokeStyle = i % 3 === 0 ? "#C38341" : "#D49854";
        ctx.lineWidth = 4.0 + rng() * 6.0;
        ctx.beginPath();
        ctx.moveTo(gx, y - 12);
        ctx.bezierCurveTo(
          gx - curvePull * 0.55 + midDrift, y + h * 0.28,
          gx - curvePull * 0.35 - midDrift, y + h * 0.72,
          gx + (rng() - 0.5) * 14, y + h + 12
        );
        ctx.stroke();

        // Filete de luz crema junto a la veta (efecto madera tallada)
        ctx.globalAlpha = 0.22;
        ctx.strokeStyle = "#FBE8C6";
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(gx - 3, y - 12);
        ctx.bezierCurveTo(
          gx - curvePull * 0.55 + midDrift - 3, y + h * 0.28,
          gx - curvePull * 0.35 - midDrift - 3, y + h * 0.72,
          gx + (rng() - 0.5) * 14 - 3, y + h + 12
        );
        ctx.stroke();

        // Línea estilizada de tinta sepia en algunas vetas principales
        if (i % 3 !== 1) {
          ctx.globalAlpha = 0.30 + rng() * 0.15;
          ctx.strokeStyle = "#75411B";
          ctx.lineWidth = 1.4 + rng() * 1.3;
          ctx.beginPath();
          ctx.moveTo(gx + 1.5, y - 12);
          ctx.bezierCurveTo(
            gx - curvePull * 0.55 + midDrift + 1.5, y + h * 0.28,
            gx - curvePull * 0.35 - midDrift + 1.5, y + h * 0.72,
            gx + (rng() - 0.5) * 14 + 1.5, y + h + 12
          );
          ctx.stroke();
        }
      }

      // Nudo artístico pintado a mano en zona despejada (arriba o abajo del rótulo)
      const kx = x + w * (0.20 + rng() * 0.60);
      const ky = y + h * (rng() > 0.5 ? 0.17 + rng() * 0.06 : 0.80 + rng() * 0.06);
      const rx = 11 + rng() * 7;
      const ry = 20 + rng() * 11;
      ctx.save();
      ctx.translate(kx, ky);
      ctx.rotate((rng() - 0.5) * 0.3);
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = "#B87738";
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, TAU);
      ctx.fill();
      for (let r = 2; r >= 1; r--) {
        ctx.globalAlpha = 0.36;
        ctx.strokeStyle = r === 1 ? "#5C3112" : "#9E6027";
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx * (r / 2.2), ry * (r / 2.2), 0, 0, TAU);
        ctx.stroke();
      }
      ctx.restore();
    } else {
      // Franjas de torno con envoltura horizontal periódica sin costura
      const grainCount = 16;
      for (let i = 0; i < grainCount; i++) {
        const gy = y + ((i + 0.4) / grainCount) * h;
        const phase = rng() * TAU;
        const waveA = 3.5 + rng() * 7.5;
        ctx.globalAlpha = 0.25 + rng() * 0.14;
        ctx.strokeStyle = i % 2 === 0 ? "#C88946" : "#B57434";
        ctx.lineWidth = 2.4 + rng() * 3.8;
        ctx.beginPath();
        const steps = 36;
        for (let s = 0; s <= steps; s++) {
          const u = s / steps;
          const px = x + u * w;
          const py = gy + Math.sin(u * TAU * 2 + phase) * waveA + Math.cos(u * TAU * 3 + phase) * (waveA * 0.35);
          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  function paintHexFaceCell(ctx, faceIndex) {
    const face = FACES[faceIndex];
    const col = faceIndex % 3;
    const row = Math.floor(faceIndex / 3);
    const x0 = col * ATLAS_LAYOUT.cellW;
    const y0 = row * ATLAS_LAYOUT.cellH;
    const w = ATLAS_LAYOUT.cellW;
    const h = ATLAS_LAYOUT.cellH;

    paintWoodBlock(ctx, x0, y0, w, h, 4200 + faceIndex * 317, true);

    const innerX = x0 + ATLAS_LAYOUT.padX;
    const innerY = y0 + ATLAS_LAYOUT.padY;
    const innerW = w - ATLAS_LAYOUT.padX * 2;
    const innerH = h - ATLAS_LAYOUT.padY * 2;
    const cx = innerX + innerW * 0.5;

    // Coordenadas exactas del bisel hexagonal en espacio UV de la celda:
    // uNorm = 0 y 1 corresponden exactamente a la cresta de esquina entre caras (phi = +-30°)
    const flatHalfX = APOTHEM * Math.tan(PHI_FLAT); // ~0.4372
    const uLeftFlat = ( -flatHalfX + HALF_SPAN_MAX) / (2 * HALF_SPAN_MAX); // ~0.053
    const uRightFlat = ( flatHalfX + HALF_SPAN_MAX) / (2 * HALF_SPAN_MAX); // ~0.947
    const pxLeftFlat = innerX + uLeftFlat * innerW;
    const pxRightFlat = innerX + uRightFlat * innerW;

    // Luz tallada cálida en el bisel izquierdo y sombra cálida en el derecho
    ctx.save();
    ctx.globalAlpha = 0.58;
    ctx.fillStyle = "#FCEAC9";
    ctx.fillRect(innerX - 6, innerY, (pxLeftFlat - innerX) + 8, innerH);
    ctx.fillStyle = "#CF9252";
    ctx.fillRect(pxRightFlat - 2, innerY, (innerX + innerW - pxRightFlat) + 8, innerH);

    // Muescas sutiles de gubia tallada a mano a lo largo del bisel
    const rng = mulberry32(8300 + faceIndex * 89);
    ctx.strokeStyle = "#FFF1D6";
    ctx.globalAlpha = 0.50;
    for (let i = 0; i < 12; i++) {
      const ym = innerY + innerH * (0.18 + (i / 12) * 0.64);
      ctx.lineWidth = 2.2 + rng() * 2.5;
      ctx.beginPath();
      ctx.moveTo(innerX, ym);
      ctx.lineTo(pxLeftFlat + 4, ym + (rng() - 0.5) * 5);
      ctx.stroke();
    }
    ctx.restore();

    // Curvas exactas 3D donde el prisma hexagonal biselado corta el cono superior e inferior
    const samples = 32;
    const topArchPts = [];
    const botArchPts = [];
    for (let s = 0; s <= samples; s++) {
      const t = s / samples;
      const phi = lerp(-Math.PI / 6, Math.PI / 6, t);
      const rPlane = hexPrismRadius(phi);
      const lx = rPlane * Math.sin(phi);
      const yTop = solveLatheY(rPlane, Y_FLAT_TOP, Y_HEX_TOP);
      const yBot = solveLatheY(rPlane, Y_HEX_BOTTOM, Y_FLAT_BOTTOM);
      const uNorm = (lx + HALF_SPAN_MAX) / (2 * HALF_SPAN_MAX);
      const vTopNorm = (Y_HEX_TOP - yTop) / (Y_HEX_TOP - Y_HEX_BOTTOM);
      const vBotNorm = (Y_HEX_TOP - yBot) / (Y_HEX_TOP - Y_HEX_BOTTOM);
      topArchPts.push([innerX + uNorm * innerW, innerY + vTopNorm * innerH]);
      botArchPts.push([innerX + uNorm * innerW, innerY + vBotNorm * innerH]);
    }

    // Sombreado ligero de madera torneada fuera de los arcos (mejillas cónicas)
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = "#C58646";
    ctx.beginPath();
    ctx.moveTo(innerX - 8, innerY - 8);
    ctx.lineTo(innerX + innerW + 8, innerY - 8);
    ctx.lineTo(innerX + innerW + 8, topArchPts[samples][1]);
    for (let s = samples; s >= 0; s--) ctx.lineTo(topArchPts[s][0], topArchPts[s][1]);
    ctx.lineTo(innerX - 8, topArchPts[0][1]);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(innerX - 8, innerY + innerH + 8);
    ctx.lineTo(innerX + innerW + 8, innerY + innerH + 8);
    ctx.lineTo(innerX + innerW + 8, botArchPts[samples][1]);
    for (let s = samples; s >= 0; s--) ctx.lineTo(botArchPts[s][0], botArchPts[s][1]);
    ctx.lineTo(innerX - 8, botArchPts[0][1]);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Luz de bisel tallado + trazo de tinta cartoon siguiendo exactamente las aristas 3D reales
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Luz crema bajo el arco superior
    ctx.strokeStyle = "#FDECCF";
    ctx.lineWidth = 6.5;
    ctx.beginPath();
    for (let s = 0; s <= samples; s++) {
      const p = topArchPts[s];
      if (s === 0) ctx.moveTo(p[0], p[1] + 4.5);
      else ctx.lineTo(p[0], p[1] + 4.5);
    }
    ctx.stroke();

    // Trazo de tinta negra en los arcos superior e inferior
    ctx.strokeStyle = "#180F0A";
    ctx.lineWidth = 5.4;
    ctx.beginPath();
    for (let s = 0; s <= samples; s++) {
      const p = topArchPts[s];
      if (s === 0) ctx.moveTo(p[0], p[1]);
      else ctx.lineTo(p[0], p[1]);
    }
    for (let s = 0; s <= samples; s++) {
      const p = botArchPts[s];
      if (s === 0) ctx.moveTo(p[0], p[1]);
      else ctx.lineTo(p[0], p[1]);
    }
    ctx.stroke();

    // Trazo de tinta negra exactamente sobre las 6 aristas verticales del hexágono (innerX e innerX+innerW)
    ctx.strokeStyle = "#180F0A";
    ctx.lineWidth = 6.8;
    ctx.beginPath();
    ctx.moveTo(innerX, topArchPts[0][1] - 4);
    ctx.lineTo(innerX, botArchPts[0][1] + 4);
    ctx.moveTo(innerX + innerW, topArchPts[samples][1] - 4);
    ctx.lineTo(innerX + innerW, botArchPts[samples][1] + 4);
    ctx.stroke();
    ctx.restore();

    // Rótulo central grande, grueso y sumamente legible centrado en la cara plana
    const yMidFlat = 0.5 * (topArchPts[0][1] + botArchPts[0][1]);
    const isShortWord = face.word.length <= 5;
    const wordMaxW = isShortWord ? innerW * 0.80 : innerW * 0.85;
    const wordH = isShortWord ? innerH * 0.270 : innerH * 0.258;
    drawRotuloWord(ctx, face, cx, yMidFlat + 6, wordMaxW, wordH);
  }

  function paintLatheBand(ctx, x, w, bandY0, bandY1, baseColor, hiColor, shadowColor, seed, wearAmount) {
    const h = bandY1 - bandY0;
    if (h <= 0) return;
    const rng = mulberry32(seed);
    ctx.save();

    const grad = ctx.createLinearGradient(x, bandY0, x, bandY1);
    grad.addColorStop(0.0, hiColor);
    grad.addColorStop(0.45, baseColor);
    grad.addColorStop(1.0, shadowColor);
    ctx.fillStyle = grad;
    ctx.fillRect(x, bandY0, w, h);

    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = hiColor;
    for (let i = 0; i < 6; i++) {
      const py = bandY0 + h * (0.16 + rng() * 0.45);
      ctx.lineWidth = 1.6 + rng() * 3.0;
      ctx.beginPath();
      const phase = rng() * TAU;
      for (let s = 0; s <= 24; s++) {
        const u = s / 24;
        const px = x + u * w;
        const wy = py + Math.sin(u * TAU * 3 + phase) * 1.4;
        if (s === 0) ctx.moveTo(px, wy);
        else ctx.lineTo(px, wy);
      }
      ctx.stroke();
    }

    if (wearAmount > 0) {
      ctx.fillStyle = "#ECC48C";
      ctx.globalAlpha = 0.65 * wearAmount;
      for (let i = 0; i < 36; i++) {
        const cxChip = x + rng() * w;
        const topEdge = rng() > 0.5;
        const cyChip = topEdge ? bandY0 + rng() * 3.2 : bandY1 - rng() * 3.2;
        ctx.beginPath();
        ctx.ellipse(cxChip, cyChip, 4 + rng() * 11, 1.3 + rng() * 2.2, 0, 0, TAU);
        ctx.fill();
      }
    }

    ctx.globalAlpha = 0.94;
    ctx.strokeStyle = "#170E0A";
    ctx.lineWidth = 3.8;
    ctx.beginPath();
    ctx.moveTo(x, bandY0);
    ctx.lineTo(x + w, bandY0);
    ctx.moveTo(x, bandY1);
    ctx.lineTo(x + w, bandY1);
    ctx.stroke();
    ctx.restore();
  }

  function paintUpperLatheStrip(ctx) {
    const y0 = ATLAS_LAYOUT.upperStripY0;
    const y1 = ATLAS_LAYOUT.upperStripY1;
    const h = y1 - y0;
    const w = ATLAS_LAYOUT.size;

    paintWoodBlock(ctx, 0, y0 - 8, w, h + 16, 9101, false);

    // Anillos del hombro cónico superior (t: 0.04..0.28) + espiga cilíndrica (t: 0.44..0.88)
    // Colores vivos tradicionales: verde, blanco, rojo y azul
    const rings = [
      // Hombro cónico superior (como las fotos de referencia)
      { t0: 0.035, t1: 0.092, base: "#0D874E", hi: "#29B472", lo: "#065731", wear: 0.22 }, // Verde
      { t0: 0.105, t1: 0.160, base: "#C9172C", hi: "#EF3E53", lo: "#890C1B", wear: 0.22 }, // Rojo
      { t0: 0.172, t1: 0.225, base: "#FBF3DF", hi: "#FFFFFF", lo: "#DFCFAF", wear: 0.18 }, // Blanco
      { t0: 0.238, t1: 0.292, base: "#124DB0", hi: "#3377E6", lo: "#092D6B", wear: 0.22 }, // Azul

      // Espiga superior cilíndrica: anillos pintados en azul, blanco, rojo y verde
      { t0: 0.425, t1: 0.525, base: "#124DB0", hi: "#3377E6", lo: "#092C68", wear: 0.26 }, // Azul
      { t0: 0.545, t1: 0.642, base: "#FBF3DF", hi: "#FFFFFF", lo: "#DDD0B3", wear: 0.22 }, // Blanco
      { t0: 0.662, t1: 0.760, base: "#C9172C", hi: "#EF3E53", lo: "#880B1A", wear: 0.26 }, // Rojo
      { t0: 0.780, t1: 0.878, base: "#0D874E", hi: "#29B472", lo: "#065530", wear: 0.30 }  // Verde
    ];

    for (let i = 0; i < rings.length; i++) {
      const r = rings[i];
      paintLatheBand(ctx, 0, w, y0 + r.t0 * h, y0 + r.t1 * h, r.base, r.hi, r.lo, 500 + i * 37, r.wear);
    }

    // Coronilla redondeada de madera cálida pulida (t: 0.88 .. 1.0)
    const tipGrad = ctx.createLinearGradient(0, y0 + h * 0.88, 0, y1);
    tipGrad.addColorStop(0.0, "rgba(248, 224, 184, 0.0)");
    tipGrad.addColorStop(0.65, "rgba(214, 162, 98, 0.36)");
    tipGrad.addColorStop(1.0, "rgba(150, 96, 48, 0.58)");
    ctx.fillStyle = tipGrad;
    ctx.fillRect(0, y0 + h * 0.88, w, h * 0.12);
  }

  function paintLowerLatheStrip(ctx) {
    const y0 = ATLAS_LAYOUT.lowerStripY0;
    const y1 = ATLAS_LAYOUT.lowerStripY1;
    const h = y1 - y0;
    const w = ATLAS_LAYOUT.size;

    paintWoodBlock(ctx, 0, y0 - 8, w, h + 16, 9202, false);

    // Anillos pintados en la parte alta del cono inferior
    const rings = [
      { t0: 0.040, t1: 0.105, base: "#0D874E", hi: "#29B472", lo: "#065731", wear: 0.28 }, // Verde
      { t0: 0.118, t1: 0.180, base: "#C9172C", hi: "#EF3E53", lo: "#890C1B", wear: 0.32 }, // Rojo
      { t0: 0.193, t1: 0.252, base: "#FBF3DF", hi: "#FFFFFF", lo: "#DFCFAF", wear: 0.38 }, // Blanco
      { t0: 0.265, t1: 0.330, base: "#124DB0", hi: "#3377E6", lo: "#092D6B", wear: 0.50 }  // Azul desgastado
    ];

    for (let i = 0; i < rings.length; i++) {
      const r = rings[i];
      paintLatheBand(ctx, 0, w, y0 + r.t0 * h, y0 + r.t1 * h, r.base, r.hi, r.lo, 700 + i * 41, r.wear);
    }

    // Desgaste progresivo hand-painted en la punta inferior cónica (t: 0.36 .. 1.0)
    const wearGrad = ctx.createLinearGradient(0, y0 + h * 0.36, 0, y1);
    wearGrad.addColorStop(0.0, "rgba(232, 194, 142, 0.0)");
    wearGrad.addColorStop(0.45, "rgba(198, 148, 94, 0.44)");
    wearGrad.addColorStop(0.82, "rgba(136, 90, 50, 0.80)");
    wearGrad.addColorStop(1.0, "rgba(70, 42, 22, 0.96)");
    ctx.fillStyle = wearGrad;
    ctx.fillRect(0, y0 + h * 0.36, w, h * 0.64);

    // Marcas de uso y fricción de giro en la punta cónica desgastada
    const rng = mulberry32(3319);
    ctx.save();
    for (let i = 0; i < 42; i++) {
      const ty = y0 + h * (0.40 + rng() * 0.55);
      const sx = rng() * w * 0.82;
      const len = 55 + rng() * 240;
      ctx.strokeStyle = i % 2 === 0 ? "#F8E2C4" : "#593318";
      ctx.globalAlpha = 0.26 + rng() * 0.22;
      ctx.lineWidth = 1.6 + rng() * 2.6;
      ctx.beginPath();
      ctx.moveTo(sx, ty);
      ctx.lineTo(sx + len, ty + (rng() - 0.5) * 4);
      ctx.stroke();
    }

    ctx.globalAlpha = 0.88;
    ctx.strokeStyle = "#1A100B";
    ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.moveTo(0, y0 + h * 0.90);
    ctx.lineTo(w, y0 + h * 0.90);
    ctx.stroke();
    ctx.restore();
  }

  function paintPirinolaAtlas(ctx) {
    const S = ATLAS_LAYOUT.size;
    ctx.fillStyle = "#ECC58C";
    ctx.fillRect(0, 0, S, S);

    for (let k = 0; k < 6; k++) {
      paintHexFaceCell(ctx, k);
    }
    paintUpperLatheStrip(ctx);
    paintLowerLatheStrip(ctx);
  }

  // ============================================================================
  // 4. CONSTRUCCIÓN DE MALLA 3D LIMPIA CENTRADA EN EL EJE Y
  // ============================================================================
  function hexPrismRadius(phi) {
    const ap = Math.abs(phi);
    if (ap <= PHI_FLAT) {
      return APOTHEM / Math.cos(ap);
    }
    const u = clamp((ap - PHI_FLAT) / (Math.PI / 6 - PHI_FLAT), 0, 1);
    const slope = (APOTHEM * Math.sin(PHI_FLAT)) / (Math.cos(PHI_FLAT) * Math.cos(PHI_FLAT));
    const span = Math.PI / 6 - PHI_FLAT;
    const h00 = 2 * u * u * u - 3 * u * u + 1;
    const h10 = u * u * u - 2 * u * u + u;
    const h01 = -2 * u * u * u + 3 * u * u;
    return h00 * R_FLAT_EDGE + h10 * (slope * span) + h01 * R_CORNER;
  }

  function buildYProfileSamples() {
    const ys = [];
    function pushRange(yStart, yEnd, steps, includeEnd) {
      for (let i = 0; i < steps; i++) {
        ys.push(lerp(yStart, yEnd, i / steps));
      }
      if (includeEnd) ys.push(yEnd);
    }
    pushRange(Y_MIN, -1.60, 7, false);
    pushRange(-1.60, Y_HEX_BOTTOM, 22, false);
    pushRange(Y_HEX_BOTTOM, Y_FLAT_BOTTOM, 14, false);
    pushRange(Y_FLAT_BOTTOM, Y_FLAT_TOP, 16, false);
    pushRange(Y_FLAT_TOP, Y_HEX_TOP, 14, false);
    pushRange(Y_HEX_TOP, 0.73, 12, false);
    pushRange(0.73, 0.81, 6, false);
    pushRange(0.81, 1.55, 22, false);
    pushRange(1.55, Y_MAX, 9, true);
    return ys;
  }

  function buildSectorPhiSamples() {
    const phis = [];
    const half30 = Math.PI / 6;
    phis.push(-half30);
    phis.push(lerp(-half30, -PHI_FLAT, 0.5));
    const flatSteps = 12;
    for (let m = 0; m <= flatSteps; m++) {
      phis.push(lerp(-PHI_FLAT, PHI_FLAT, m / flatSteps));
    }
    phis.push(lerp(PHI_FLAT, half30, 0.5));
    phis.push(half30);
    return phis;
  }

  function createPirinolaGeometry(options) {
    const opts = options || {};
    const outlineThickness = typeof opts.outlineThickness === "number" ? opts.outlineThickness : 0.030;

    const ys = buildYProfileSamples();
    const phis = buildSectorPhiSamples();
    const M = phis.length - 1;
    const RING_COLS = 6 * M;
    const RINGS = ys.length;

    const gridPos = new Float32Array(RINGS * RING_COLS * 3);
    for (let j = 0; j < RINGS; j++) {
      const y = ys[j];
      const rLathe = latheRadius(y);
      for (let k = 0; k < 6; k++) {
        const sectorCenter = k * (Math.PI / 3);
        for (let m = 0; m < M; m++) {
          const col = k * M + m;
          const phi = phis[m];
          const rHex = hexPrismRadius(phi);
          const r = Math.min(rLathe, rHex);
          const theta = sectorCenter + phi;
          const idx = (j * RING_COLS + col) * 3;
          gridPos[idx] = r * Math.sin(theta);
          gridPos[idx + 1] = y;
          gridPos[idx + 2] = r * Math.cos(theta);
        }
      }
    }

    const smoothGridNormals = new Float32Array(RINGS * RING_COLS * 3);
    function addTriNormalToGrid(ia, ib, ic) {
      const ax = gridPos[ia * 3], ay = gridPos[ia * 3 + 1], az = gridPos[ia * 3 + 2];
      const bx = gridPos[ib * 3], by = gridPos[ib * 3 + 1], bz = gridPos[ib * 3 + 2];
      const cx = gridPos[ic * 3], cy = gridPos[ic * 3 + 1], cz = gridPos[ic * 3 + 2];
      const ux = bx - ax, uy = by - ay, uz = bz - az;
      const vx = cx - ax, vy = cy - ay, vz = cz - az;
      const nx = uy * vz - uz * vy;
      const ny = uz * vx - ux * vz;
      const nz = ux * vy - uy * vx;
      const ids = [ia, ib, ic];
      for (let t = 0; t < 3; t++) {
        const id = ids[t] * 3;
        smoothGridNormals[id] += nx;
        smoothGridNormals[id + 1] += ny;
        smoothGridNormals[id + 2] += nz;
      }
    }

    for (let j = 0; j < RINGS - 1; j++) {
      for (let col = 0; col < RING_COLS; col++) {
        const nextCol = (col + 1) % RING_COLS;
        const i00 = j * RING_COLS + col;
        const i10 = j * RING_COLS + nextCol;
        const i01 = (j + 1) * RING_COLS + col;
        const i11 = (j + 1) * RING_COLS + nextCol;
        if (j === 0) {
          addTriNormalToGrid(i00, i11, i01);
        } else if (j === RINGS - 2) {
          addTriNormalToGrid(i00, i10, i11);
        } else {
          addTriNormalToGrid(i00, i10, i11);
          addTriNormalToGrid(i00, i11, i01);
        }
      }
    }

    for (let j = 0; j < RINGS; j++) {
      for (let col = 0; col < RING_COLS; col++) {
        const id = (j * RING_COLS + col) * 3;
        if (j === 0) {
          smoothGridNormals[id] = 0; smoothGridNormals[id + 1] = -1; smoothGridNormals[id + 2] = 0;
        } else if (j === RINGS - 1) {
          smoothGridNormals[id] = 0; smoothGridNormals[id + 1] = 1; smoothGridNormals[id + 2] = 0;
        } else {
          const len = Math.hypot(smoothGridNormals[id], smoothGridNormals[id + 1], smoothGridNormals[id + 2]) || 1;
          smoothGridNormals[id] /= len;
          smoothGridNormals[id + 1] /= len;
          smoothGridNormals[id + 2] /= len;
        }
      }
    }

    let jHexStart = 0;
    let jHexEnd = RINGS - 1;
    for (let j = 0; j < RINGS; j++) {
      if (Math.abs(ys[j] - Y_HEX_BOTTOM) < 1e-6) jHexStart = j;
      if (Math.abs(ys[j] - Y_HEX_TOP) < 1e-6) jHexEnd = j;
    }

    const posArr = [];
    const normArr = [];
    const smoothNormArr = [];
    const uvArr = [];
    const indices = [];

    function pushVertex(px, py, pz, nx, ny, nz, snx, sny, snz, u, v) {
      const idx = posArr.length / 3;
      posArr.push(px, py, pz);
      normArr.push(nx, ny, nz);
      smoothNormArr.push(snx, sny, snz);
      uvArr.push(u, v);
      return idx;
    }

    function analyticLatheNormal(y, theta) {
      const eps = 0.002;
      const yA = Math.max(Y_MIN + 0.001, y - eps);
      const yB = Math.min(Y_MAX - 0.001, y + eps);
      const drdy = (latheRadius(yB) - latheRadius(yA)) / (yB - yA);
      const nr = 1.0;
      const ny = -drdy;
      const len = Math.hypot(nr, ny) || 1;
      return [(nr / len) * Math.sin(theta), ny / len, (nr / len) * Math.cos(theta)];
    }

    // Isla A: Cono inferior y punta desgastada
    const lowerArc = new Float32Array(jHexStart + 1);
    for (let j = jHexStart - 1; j >= 0; j--) {
      const dy = ys[j + 1] - ys[j];
      const dr = latheRadius(ys[j + 1]) - latheRadius(ys[j]);
      lowerArc[j] = lowerArc[j + 1] + Math.hypot(dr, dy);
    }
    const lowerTotalArc = lowerArc[0] || 1;
    const vLow0 = ATLAS_LAYOUT.lowerStripY0 / ATLAS_LAYOUT.size;
    const vLow1 = ATLAS_LAYOUT.lowerStripY1 / ATLAS_LAYOUT.size;

    const lowerVertMap = [];
    for (let j = 0; j <= jHexStart; j++) {
      const rowIds = [];
      const tArc = lowerArc[j] / lowerTotalArc;
      const v = lerp(vLow0, vLow1, tArc);
      for (let col = 0; col <= RING_COLS; col++) {
        const wrapCol = col % RING_COLS;
        const gIdx = (j * RING_COLS + wrapCol) * 3;
        const k = Math.floor(wrapCol / M);
        const m = wrapCol % M;
        const exactTheta = k * (Math.PI / 3) + phis[m];
        const ln = j === 0 ? [0, -1, 0] : analyticLatheNormal(ys[j], exactTheta);
        const u = col / RING_COLS;
        rowIds.push(pushVertex(
          gridPos[gIdx], gridPos[gIdx + 1], gridPos[gIdx + 2],
          ln[0], ln[1], ln[2],
          smoothGridNormals[gIdx], smoothGridNormals[gIdx + 1], smoothGridNormals[gIdx + 2],
          u, v
        ));
      }
      lowerVertMap.push(rowIds);
    }
    for (let j = 0; j < jHexStart; j++) {
      for (let col = 0; col < RING_COLS; col++) {
        const i00 = lowerVertMap[j][col];
        const i10 = lowerVertMap[j][col + 1];
        const i01 = lowerVertMap[j + 1][col];
        const i11 = lowerVertMap[j + 1][col + 1];
        if (j === 0) indices.push(i00, i11, i01);
        else indices.push(i00, i10, i11, i00, i11, i01);
      }
    }

    // Isla B: Las 6 caras del cuerpo hexagonal
    for (let k = 0; k < 6; k++) {
      const thetaK = k * (Math.PI / 3);
      const nkx = Math.sin(thetaK), nkz = Math.cos(thetaK);
      const tkx = Math.cos(thetaK), tkz = -Math.sin(thetaK);

      const cellCol = k % 3;
      const cellRow = Math.floor(k / 3);
      const uMin = (cellCol * ATLAS_LAYOUT.cellW + ATLAS_LAYOUT.padX) / ATLAS_LAYOUT.size;
      const uMax = ((cellCol + 1) * ATLAS_LAYOUT.cellW - ATLAS_LAYOUT.padX) / ATLAS_LAYOUT.size;
      const vMin = (cellRow * ATLAS_LAYOUT.cellH + ATLAS_LAYOUT.padY) / ATLAS_LAYOUT.size;
      const vMax = ((cellRow + 1) * ATLAS_LAYOUT.cellH - ATLAS_LAYOUT.padY) / ATLAS_LAYOUT.size;

      const sectorMap = [];
      for (let j = jHexStart; j <= jHexEnd; j++) {
        const rowIds = [];
        const y = ys[j];
        const rLathe = latheRadius(y);
        for (let m = 0; m <= M; m++) {
          const wrapCol = (k * M + m) % RING_COLS;
          const gIdx = (j * RING_COLS + wrapCol) * 3;
          const px = gridPos[gIdx], py = gridPos[gIdx + 1], pz = gridPos[gIdx + 2];

          const phi = phis[m];
          const rHex = hexPrismRadius(phi);
          const theta = thetaK + phi;

          let nx, ny, nz;
          if (rLathe < rHex - 1e-4) {
            const ln = analyticLatheNormal(y, theta);
            nx = ln[0]; ny = ln[1]; nz = ln[2];
          } else if (Math.abs(phi) <= PHI_FLAT + 1e-5) {
            nx = nkx; ny = 0; nz = nkz;
          } else {
            const neighborAngle = thetaK + (phi > 0 ? Math.PI / 3 : -Math.PI / 3);
            const blend = clamp((Math.abs(phi) - PHI_FLAT) / (Math.PI / 6 - PHI_FLAT), 0, 1) * 0.5;
            nx = lerp(nkx, Math.sin(neighborAngle), blend);
            ny = 0;
            nz = lerp(nkz, Math.cos(neighborAngle), blend);
            const l = Math.hypot(nx, ny, nz) || 1;
            nx /= l; nz /= l;
          }

          const localX = px * tkx + pz * tkz;
          const uNorm = clamp((localX + HALF_SPAN_MAX) / (2 * HALF_SPAN_MAX), 0, 1);
          const vNorm = clamp((Y_HEX_TOP - py) / (Y_HEX_TOP - Y_HEX_BOTTOM), 0, 1);
          const u = lerp(uMin, uMax, uNorm);
          const v = lerp(vMin, vMax, vNorm);

          rowIds.push(pushVertex(
            px, py, pz,
            nx, ny, nz,
            smoothGridNormals[gIdx], smoothGridNormals[gIdx + 1], smoothGridNormals[gIdx + 2],
            u, v
          ));
        }
        sectorMap.push(rowIds);
      }

      const numRows = jHexEnd - jHexStart;
      for (let r = 0; r < numRows; r++) {
        for (let m = 0; m < M; m++) {
          const i00 = sectorMap[r][m];
          const i10 = sectorMap[r][m + 1];
          const i01 = sectorMap[r + 1][m];
          const i11 = sectorMap[r + 1][m + 1];
          indices.push(i00, i10, i11, i00, i11, i01);
        }
      }
    }

    // Isla C: Hombro superior + espiga cilíndrica con anillos pintados
    const upperCount = RINGS - jHexEnd;
    const upperArc = new Float32Array(upperCount);
    for (let s = 1; s < upperCount; s++) {
      const jPrev = jHexEnd + s - 1;
      const jCurr = jHexEnd + s;
      const dy = ys[jCurr] - ys[jPrev];
      const dr = latheRadius(ys[jCurr]) - latheRadius(ys[jPrev]);
      upperArc[s] = upperArc[s - 1] + Math.hypot(dr, dy);
    }
    const upperTotalArc = upperArc[upperCount - 1] || 1;
    const vUp0 = ATLAS_LAYOUT.upperStripY0 / ATLAS_LAYOUT.size;
    const vUp1 = ATLAS_LAYOUT.upperStripY1 / ATLAS_LAYOUT.size;

    const upperVertMap = [];
    for (let s = 0; s < upperCount; s++) {
      const j = jHexEnd + s;
      const rowIds = [];
      const tArc = upperArc[s] / upperTotalArc;
      const v = lerp(vUp0, vUp1, tArc);
      for (let col = 0; col <= RING_COLS; col++) {
        const wrapCol = col % RING_COLS;
        const gIdx = (j * RING_COLS + wrapCol) * 3;
        const k = Math.floor(wrapCol / M);
        const m = wrapCol % M;
        const exactTheta = k * (Math.PI / 3) + phis[m];
        const ln = j === RINGS - 1 ? [0, 1, 0] : analyticLatheNormal(ys[j], exactTheta);
        const u = col / RING_COLS;
        rowIds.push(pushVertex(
          gridPos[gIdx], gridPos[gIdx + 1], gridPos[gIdx + 2],
          ln[0], ln[1], ln[2],
          smoothGridNormals[gIdx], smoothGridNormals[gIdx + 1], smoothGridNormals[gIdx + 2],
          u, v
        ));
      }
      upperVertMap.push(rowIds);
    }
    for (let s = 0; s < upperCount - 1; s++) {
      const isTopCap = jHexEnd + s === RINGS - 2;
      for (let col = 0; col < RING_COLS; col++) {
        const i00 = upperVertMap[s][col];
        const i10 = upperVertMap[s][col + 1];
        const i01 = upperVertMap[s + 1][col];
        const i11 = upperVertMap[s + 1][col + 1];
        if (isTopCap) indices.push(i00, i10, i11);
        else indices.push(i00, i10, i11, i00, i11, i01);
      }
    }

    // Malla de Contorno Toon (Inverted Hull soldado sin grietas)
    const outlinePositions = new Float32Array(gridPos.length);
    const outlineNormals = new Float32Array(gridPos.length);
    for (let j = 0; j < RINGS; j++) {
      const y = ys[j];
      const stemFactor = y > 0.72 ? 0.78 : 1.0;
      const thick = outlineThickness * stemFactor;
      for (let col = 0; col < RING_COLS; col++) {
        const id = (j * RING_COLS + col) * 3;
        const snx = smoothGridNormals[id];
        const sny = smoothGridNormals[id + 1];
        const snz = smoothGridNormals[id + 2];
        outlinePositions[id] = gridPos[id] + snx * thick;
        outlinePositions[id + 1] = gridPos[id + 1] + sny * thick;
        outlinePositions[id + 2] = gridPos[id + 2] + snz * thick;
        outlineNormals[id] = -snx;
        outlineNormals[id + 1] = -sny;
        outlineNormals[id + 2] = -snz;
      }
    }

    const outlineIndices = [];
    for (let j = 0; j < RINGS - 1; j++) {
      for (let col = 0; col < RING_COLS; col++) {
        const nextCol = (col + 1) % RING_COLS;
        const i00 = j * RING_COLS + col;
        const i10 = j * RING_COLS + nextCol;
        const i01 = (j + 1) * RING_COLS + col;
        const i11 = (j + 1) * RING_COLS + nextCol;
        if (j === 0) outlineIndices.push(i00, i01, i11);
        else if (j === RINGS - 2) outlineIndices.push(i00, i11, i10);
        else outlineIndices.push(i00, i11, i10, i00, i01, i11);
      }
    }

    return {
      positions: new Float32Array(posArr),
      normals: new Float32Array(normArr),
      smoothNormals: new Float32Array(smoothNormArr),
      uvs: new Float32Array(uvArr),
      indices: new Uint32Array(indices),
      outlinePositions,
      outlineNormals,
      outlineIndices: new Uint32Array(outlineIndices)
    };
  }

  // ============================================================================
  // 5. EXPORTADOR BINARIO GLTF 2.0 (.GLB) SIN DEPENDENCIAS
  // ============================================================================
  function computeMinMax(floatArray, stride) {
    const min = new Array(stride).fill(Infinity);
    const max = new Array(stride).fill(-Infinity);
    for (let i = 0; i < floatArray.length; i += stride) {
      for (let c = 0; c < stride; c++) {
        const v = floatArray[i + c];
        if (v < min[c]) min[c] = v;
        if (v > max[c]) max[c] = v;
      }
    }
    return { min, max };
  }

  function padTo4(uint8) {
    const rem = uint8.byteLength % 4;
    if (rem === 0) return uint8;
    const out = new Uint8Array(uint8.byteLength + (4 - rem));
    out.set(uint8);
    return out;
  }

  function buildGLBBuffer(geometry, pngBytes, includeOutline) {
    const withOutline = includeOutline !== false;
    const chunks = [];
    const bufferViews = [];
    const accessors = [];
    let byteOffset = 0;

    function addBufferChunk(typedArray, target) {
      const raw = new Uint8Array(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength);
      const padded = padTo4(raw);
      const viewIndex = bufferViews.length;
      const view = { buffer: 0, byteOffset, byteLength: raw.byteLength };
      if (target) view.target = target;
      bufferViews.push(view);
      chunks.push(padded);
      byteOffset += padded.byteLength;
      return viewIndex;
    }

    const posView = addBufferChunk(geometry.positions, 34962);
    const normView = addBufferChunk(geometry.normals, 34962);
    const uvView = addBufferChunk(geometry.uvs, 34962);
    const idxView = addBufferChunk(geometry.indices, 34963);

    const posBounds = computeMinMax(geometry.positions, 3);
    accessors.push({
      bufferView: posView,
      componentType: 5126,
      count: geometry.positions.length / 3,
      type: "VEC3",
      min: posBounds.min,
      max: posBounds.max
    });
    accessors.push({
      bufferView: normView,
      componentType: 5126,
      count: geometry.normals.length / 3,
      type: "VEC3"
    });
    accessors.push({
      bufferView: uvView,
      componentType: 5126,
      count: geometry.uvs.length / 2,
      type: "VEC2"
    });
    accessors.push({
      bufferView: idxView,
      componentType: 5125,
      count: geometry.indices.length,
      type: "SCALAR"
    });

    let outPosAcc = -1, outNormAcc = -1, outIdxAcc = -1;
    if (withOutline) {
      const oPosView = addBufferChunk(geometry.outlinePositions, 34962);
      const oNormView = addBufferChunk(geometry.outlineNormals, 34962);
      const oIdxView = addBufferChunk(geometry.outlineIndices, 34963);
      const oBounds = computeMinMax(geometry.outlinePositions, 3);

      outPosAcc = accessors.length;
      accessors.push({
        bufferView: oPosView,
        componentType: 5126,
        count: geometry.outlinePositions.length / 3,
        type: "VEC3",
        min: oBounds.min,
        max: oBounds.max
      });
      outNormAcc = accessors.length;
      accessors.push({
        bufferView: oNormView,
        componentType: 5126,
        count: geometry.outlineNormals.length / 3,
        type: "VEC3"
      });
      outIdxAcc = accessors.length;
      accessors.push({
        bufferView: oIdxView,
        componentType: 5125,
        count: geometry.outlineIndices.length,
        type: "SCALAR"
      });
    }

    const pngView = addBufferChunk(pngBytes, undefined);

    const meshes = [
      {
        name: "Pirinola_Madera",
        primitives: [{
          attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 },
          indices: 3,
          material: 0
        }]
      }
    ];

    const childNodes = [1];
    const nodes = [
      { name: "Pirinola_Mexicana_Root", children: childNodes, translation: [0, 0, 0] },
      { name: "Pirinola_Madera", mesh: 0 }
    ];

    const materials = [
      {
        name: "Madera_HandPainted_Toon",
        pbrMetallicRoughness: {
          baseColorTexture: { index: 0 },
          metallicFactor: 0.0,
          roughnessFactor: 0.68
        },
        doubleSided: false
      }
    ];

    if (withOutline) {
      meshes.push({
        name: "Pirinola_Contorno_Tinta",
        primitives: [{
          attributes: { POSITION: outPosAcc, NORMAL: outNormAcc },
          indices: outIdxAcc,
          material: 1
        }]
      });
      materials.push({
        name: "Tinta_Negra_ToonOutline",
        pbrMetallicRoughness: {
          baseColorFactor: [0.075, 0.045, 0.035, 1.0],
          metallicFactor: 0.0,
          roughnessFactor: 1.0
        },
        extensions: { KHR_materials_unlit: {} },
        doubleSided: false
      });
      nodes.push({ name: "Pirinola_Contorno_Tinta", mesh: 1 });
      childNodes.push(2);
    }

    const gltf = {
      asset: {
        version: "2.0",
        generator: "Pirinola3D · La Mesa Cívica INE"
      },
      extensionsUsed: withOutline ? ["KHR_materials_unlit"] : [],
      scene: 0,
      scenes: [{ name: "Scene", nodes: [0] }],
      nodes,
      meshes,
      materials,
      textures: [{ sampler: 0, source: 0 }],
      samplers: [{
        magFilter: 9729,
        minFilter: 9987,
        wrapS: 10497,
        wrapT: 33071
      }],
      images: [{
        bufferView: pngView,
        mimeType: "image/png",
        name: "pirinola-atlas"
      }],
      accessors,
      bufferViews,
      buffers: [{ byteLength: byteOffset }]
    };

    const encoder = new TextEncoder();
    const jsonRaw = encoder.encode(JSON.stringify(gltf));
    const jsonPadLen = (4 - (jsonRaw.byteLength % 4)) % 4;
    const jsonChunk = new Uint8Array(jsonRaw.byteLength + jsonPadLen);
    jsonChunk.set(jsonRaw);
    for (let i = jsonRaw.byteLength; i < jsonChunk.byteLength; i++) jsonChunk[i] = 0x20;

    const binChunk = new Uint8Array(byteOffset);
    let cursor = 0;
    for (let i = 0; i < chunks.length; i++) {
      binChunk.set(chunks[i], cursor);
      cursor += chunks[i].byteLength;
    }

    const totalLength = 12 + 8 + jsonChunk.byteLength + 8 + binChunk.byteLength;
    const glb = new ArrayBuffer(totalLength);
    const dv = new DataView(glb);
    const outBytes = new Uint8Array(glb);

    dv.setUint32(0, 0x46546C67, true);
    dv.setUint32(4, 2, true);
    dv.setUint32(8, totalLength, true);

    dv.setUint32(12, jsonChunk.byteLength, true);
    dv.setUint32(16, 0x4E4F534A, true);
    outBytes.set(jsonChunk, 20);

    const binHeaderPos = 20 + jsonChunk.byteLength;
    dv.setUint32(binHeaderPos, binChunk.byteLength, true);
    dv.setUint32(binHeaderPos + 4, 0x004E4942, true);
    outBytes.set(binChunk, binHeaderPos + 8);

    return new Uint8Array(glb);
  }

  // ============================================================================
  // 6. COMPONENTE INTERACTIVO WEBGL CEL-SHADED + TOON OUTLINE
  // ============================================================================
  function mat4Identity() {
    const m = new Float32Array(16);
    m[0] = m[5] = m[10] = m[15] = 1;
    return m;
  }

  function mat4Perspective(fovyRad, aspect, near, far) {
    const f = 1.0 / Math.tan(fovyRad * 0.5);
    const nf = 1.0 / (near - far);
    const out = new Float32Array(16);
    out[0] = f / aspect;
    out[5] = f;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[14] = 2 * far * near * nf;
    return out;
  }

  function mat4LookAt(eye, center, up) {
    let zx = eye[0] - center[0], zy = eye[1] - center[1], zz = eye[2] - center[2];
    let len = Math.hypot(zx, zy, zz) || 1;
    zx /= len; zy /= len; zz /= len;

    let xx = up[1] * zz - up[2] * zy;
    let xy = up[2] * zx - up[0] * zz;
    let xz = up[0] * zy - up[1] * zx;
    len = Math.hypot(xx, xy, xz) || 1;
    xx /= len; xy /= len; xz /= len;

    const yx = zy * xz - zz * xy;
    const yy = zz * xx - zx * xz;
    const yz = zx * xy - zy * xx;

    const out = new Float32Array(16);
    out[0] = xx; out[1] = yx; out[2] = zx; out[3] = 0;
    out[4] = xy; out[5] = yy; out[6] = zy; out[7] = 0;
    out[8] = xz; out[9] = yz; out[10] = zz; out[11] = 0;
    out[12] = -(xx * eye[0] + xy * eye[1] + xz * eye[2]);
    out[13] = -(yx * eye[0] + yy * eye[1] + yz * eye[2]);
    out[14] = -(zx * eye[0] + zy * eye[1] + zz * eye[2]);
    out[15] = 1;
    return out;
  }

  function mat4Multiply(a, b) {
    const out = new Float32Array(16);
    for (let c = 0; c < 4; c++) {
      const b0 = b[c * 4], b1 = b[c * 4 + 1], b2 = b[c * 4 + 2], b3 = b[c * 4 + 3];
      out[c * 4]     = a[0] * b0 + a[4] * b1 + a[8]  * b2 + a[12] * b3;
      out[c * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9]  * b2 + a[13] * b3;
      out[c * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3;
      out[c * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3;
    }
    return out;
  }

  function mat4FromEulerYXZ(rotY, rotX, rotZ) {
    const cy = Math.cos(rotY), sy = Math.sin(rotY);
    const cx = Math.cos(rotX), sx = Math.sin(rotX);
    const cz = Math.cos(rotZ), sz = Math.sin(rotZ);

    const mY = mat4Identity();
    mY[0] = cy; mY[2] = -sy; mY[8] = sy; mY[10] = cy;

    const mX = mat4Identity();
    mX[5] = cx; mX[6] = sx; mX[9] = -sx; mX[10] = cx;

    const mZ = mat4Identity();
    mZ[0] = cz; mZ[1] = sz; mZ[4] = -sz; mZ[5] = cz;

    return mat4Multiply(mX, mat4Multiply(mZ, mY));
  }

  const VERT_SURFACE = `
    attribute vec3 aPos;
    attribute vec3 aNormal;
    attribute vec2 aUV;
    uniform mat4 uModel;
    uniform mat4 uVP;
    varying vec3 vWorldPos;
    varying vec3 vNormal;
    varying vec2 vUV;
    void main() {
      vec4 wp = uModel * vec4(aPos, 1.0);
      vWorldPos = wp.xyz;
      vNormal = normalize(mat3(uModel) * aNormal);
      vUV = aUV;
      gl_Position = uVP * wp;
    }
  `;

  const FRAG_SURFACE = `
    precision highp float;
    uniform sampler2D uAtlas;
    uniform vec3 uCameraPos;
    uniform vec3 uKeyLight;
    varying vec3 vWorldPos;
    varying vec3 vNormal;
    varying vec2 vUV;

    void main() {
      vec4 tex = texture2D(uAtlas, vUV);
      vec3 N = normalize(vNormal);
      vec3 L = normalize(uKeyLight);
      vec3 V = normalize(uCameraPos - vWorldPos);
      vec3 H = normalize(L + V);

      float ndl = dot(N, L);

      // Rampa cel-shaded cálida de 3 escalones estilo animación mexicana ("Las Leyendas")
      float band1 = smoothstep(-0.14, -0.05, ndl);
      float band2 = smoothstep(0.34, 0.42, ndl);

      vec3 shadowTint = vec3(0.67, 0.51, 0.42);
      vec3 midTint    = vec3(0.96, 0.90, 0.81);
      vec3 litTint    = vec3(1.09, 1.03, 0.94);

      vec3 shade = mix(shadowTint, midTint, band1);
      shade = mix(shade, litTint, band2);

      // Rebote cálido inferior
      float bounce = clamp(-N.y * 0.5 + 0.5, 0.0, 1.0);
      shade += vec3(0.05, 0.035, 0.015) * (1.0 - bounce);

      // Rim light cálido ámbar en silueta lateral
      float fresnel = 1.0 - max(dot(N, V), 0.0);
      float rimMask = smoothstep(0.66, 0.76, fresnel) * smoothstep(-0.2, 0.35, N.y + 0.25);
      vec3 rimColor = vec3(1.0, 0.84, 0.52) * rimMask * 0.24;

      // Brillo especular cartoon escalonado
      float specRaw = pow(max(dot(N, H), 0.0), 34.0);
      float specToon = smoothstep(0.48, 0.56, specRaw);
      vec3 specColor = vec3(1.0, 0.96, 0.86) * specToon * 0.19;

      // Sutil acento de tinta en bordes rasantes
      float edgeInk = smoothstep(0.84, 0.95, fresnel);
      vec3 finalRGB = tex.rgb * shade + rimColor + specColor;
      finalRGB = mix(finalRGB, vec3(0.10, 0.06, 0.04), edgeInk * 0.26);

      gl_FragColor = vec4(finalRGB, 1.0);
    }
  `;

  const VERT_OUTLINE = `
    attribute vec3 aPos;
    attribute vec3 aSmoothNormal;
    uniform mat4 uModel;
    uniform mat4 uVP;
    uniform float uOutlineScale;
    void main() {
      float stemScale = aPos.y > 0.72 ? 0.78 : 1.0;
      vec3 extruded = aPos + normalize(aSmoothNormal) * (uOutlineScale * stemScale);
      gl_Position = uVP * (uModel * vec4(extruded, 1.0));
    }
  `;

  const FRAG_OUTLINE = `
    precision mediump float;
    uniform vec3 uInkColor;
    void main() {
      gl_FragColor = vec4(uInkColor, 1.0);
    }
  `;

  function compileShader(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(s);
      gl.deleteShader(s);
      throw new Error("Error compilando shader WebGL: " + info);
    }
    return s;
  }

  function createProgram(gl, vsSrc, fsSrc) {
    const p = gl.createProgram();
    const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      throw new Error("Error enlazando programa WebGL: " + gl.getProgramInfoLog(p));
    }
    return p;
  }

  function createViewer(canvas, userOptions) {
    const opts = Object.assign({
      outlineWidth: 0.032,
      autoRotate: true,
      autoRotateSpeed: 0.45,
      tiltDeg: 13,
      resting: false,
      onSettle: null,
      onFaceChange: null
    }, userOptions || {});

    const gl = canvas.getContext("webgl2", { alpha: true, antialias: true, premultipliedAlpha: false }) ||
               canvas.getContext("webgl", { alpha: true, antialias: true, premultipliedAlpha: false });
    if (!gl) {
      throw new Error("WebGL no está disponible en este navegador.");
    }

    const isWebGL2 = typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext;
    if (!isWebGL2) {
      gl.getExtension("OES_element_index_uint");
    }

    const atlasCanvas = document.createElement("canvas");
    atlasCanvas.width = ATLAS_LAYOUT.size;
    atlasCanvas.height = ATLAS_LAYOUT.size;
    const ctx2d = atlasCanvas.getContext("2d");
    paintPirinolaAtlas(ctx2d);

    const geometry = createPirinolaGeometry({ outlineThickness: opts.outlineWidth });

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlasCanvas);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const aniso = gl.getExtension("EXT_texture_filter_anisotropic") ||
                  gl.getExtension("WEBKIT_EXT_texture_filter_anisotropic");
    if (aniso) {
      const maxAniso = gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
      gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, maxAniso));
    }

    function makeBuffer(target, data) {
      const b = gl.createBuffer();
      gl.bindBuffer(target, b);
      gl.bufferData(target, data, gl.STATIC_DRAW);
      return b;
    }

    const posBuf = makeBuffer(gl.ARRAY_BUFFER, geometry.positions);
    const normBuf = makeBuffer(gl.ARRAY_BUFFER, geometry.normals);
    const smoothNormBuf = makeBuffer(gl.ARRAY_BUFFER, geometry.smoothNormals);
    const uvBuf = makeBuffer(gl.ARRAY_BUFFER, geometry.uvs);
    const idxBuf = makeBuffer(gl.ELEMENT_ARRAY_BUFFER, geometry.indices);

    const surfProg = createProgram(gl, VERT_SURFACE, FRAG_SURFACE);
    const outProg = createProgram(gl, VERT_OUTLINE, FRAG_OUTLINE);

    const surfLoc = {
      aPos: gl.getAttribLocation(surfProg, "aPos"),
      aNormal: gl.getAttribLocation(surfProg, "aNormal"),
      aUV: gl.getAttribLocation(surfProg, "aUV"),
      uModel: gl.getUniformLocation(surfProg, "uModel"),
      uVP: gl.getUniformLocation(surfProg, "uVP"),
      uAtlas: gl.getUniformLocation(surfProg, "uAtlas"),
      uCameraPos: gl.getUniformLocation(surfProg, "uCameraPos"),
      uKeyLight: gl.getUniformLocation(surfProg, "uKeyLight")
    };

    const outLoc = {
      aPos: gl.getAttribLocation(outProg, "aPos"),
      aSmoothNormal: gl.getAttribLocation(outProg, "aSmoothNormal"),
      uModel: gl.getUniformLocation(outProg, "uModel"),
      uVP: gl.getUniformLocation(outProg, "uVP"),
      uOutlineScale: gl.getUniformLocation(outProg, "uOutlineScale"),
      uInkColor: gl.getUniformLocation(outProg, "uInkColor")
    };

    const state = {
      rotY: -0.22,
      pitchX: opts.tiltDeg * DEG,
      rollZ: 0,
      restingRoll: opts.resting ? 76 * DEG : 0,
      velY: 0,
      spinningToTarget: false,
      spinStartTime: 0,
      spinDuration: 0,
      spinStartAngle: 0,
      spinTargetAngle: 0,
      targetFace: null,
      lastReportedFace: -1,
      autoRotate: !!opts.autoRotate,
      outlineWidth: opts.outlineWidth,
      dragging: false,
      lastPointerX: 0,
      lastPointerY: 0,
      lastMoveTime: 0,
      rafId: 0,
      lastFrameTime: performance.now(),
      destroyed: false,
      paused: false
    };

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
    }

    function currentFrontFaceIndex() {
      const normAngle = ((-state.rotY % TAU) + TAU) % TAU;
      return Math.round(normAngle / (Math.PI / 3)) % 6;
    }

    function render(now) {
      if (state.destroyed || state.paused) return;
      const dt = Math.min(0.05, Math.max(0.001, (now - state.lastFrameTime) / 1000));
      state.lastFrameTime = now;

      if (state.spinningToTarget) {
        const elapsed = now - state.spinStartTime;
        const t = clamp(elapsed / state.spinDuration, 0, 1);
        const ease = 1 - Math.pow(1 - t, 4);
        state.rotY = lerp(state.spinStartAngle, state.spinTargetAngle, ease);
        const wobbleEnv = Math.sin(t * Math.PI) * Math.pow(1 - t, 1.4);
        state.rollZ = Math.sin(now * 0.019) * 0.052 * wobbleEnv;

        if (t >= 1) {
          state.rotY = state.spinTargetAngle;
          state.rollZ = 0;
          state.spinningToTarget = false;
          if (typeof opts.onSettle === "function" && state.targetFace) {
            opts.onSettle(state.targetFace);
          }
        }
      } else if (!state.dragging) {
        if (Math.abs(state.velY) > 0.005) {
          state.rotY += state.velY * dt;
          state.velY *= Math.pow(0.22, dt);
          if (Math.abs(state.velY) <= 0.005) state.velY = 0;
        } else if (state.autoRotate) {
          state.rotY += opts.autoRotateSpeed * dt;
        }
        state.rollZ *= Math.pow(0.05, dt);
      }

      const activeIdx = currentFrontFaceIndex();
      if (activeIdx !== state.lastReportedFace) {
        state.lastReportedFace = activeIdx;
        if (typeof opts.onFaceChange === "function") {
          opts.onFaceChange(FACES[activeIdx]);
        }
      }

      resize();
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.CULL_FACE);

      const aspect = canvas.width / Math.max(1, canvas.height);
      const fov = aspect < 0.85 ? 42 * DEG : 35 * DEG;
      const eye = [0, 0.52, 6.08];
      const proj = mat4Perspective(fov, aspect, 0.5, 25.0);
      const view = mat4LookAt(eye, [0, -0.02, 0], [0, 1, 0]);
      const vp = mat4Multiply(proj, view);
      const model = mat4FromEulerYXZ(state.rotY, state.pitchX - 0.09, state.rollZ + state.restingRoll);

      if (state.outlineWidth > 0.0005) {
        gl.useProgram(outProg);
        gl.cullFace(gl.FRONT);

        gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
        gl.enableVertexAttribArray(outLoc.aPos);
        gl.vertexAttribPointer(outLoc.aPos, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, smoothNormBuf);
        gl.enableVertexAttribArray(outLoc.aSmoothNormal);
        gl.vertexAttribPointer(outLoc.aSmoothNormal, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
        gl.uniformMatrix4fv(outLoc.uModel, false, model);
        gl.uniformMatrix4fv(outLoc.uVP, false, vp);
        gl.uniform1f(outLoc.uOutlineScale, state.outlineWidth);
        gl.uniform3f(outLoc.uInkColor, 0.082, 0.051, 0.039);

        gl.drawElements(gl.TRIANGLES, geometry.indices.length, gl.UNSIGNED_INT, 0);
      }

      gl.useProgram(surfProg);
      gl.cullFace(gl.BACK);

      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
      gl.enableVertexAttribArray(surfLoc.aPos);
      gl.vertexAttribPointer(surfLoc.aPos, 3, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, normBuf);
      gl.enableVertexAttribArray(surfLoc.aNormal);
      gl.vertexAttribPointer(surfLoc.aNormal, 3, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
      gl.enableVertexAttribArray(surfLoc.aUV);
      gl.vertexAttribPointer(surfLoc.aUV, 2, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(surfLoc.uAtlas, 0);

      gl.uniformMatrix4fv(surfLoc.uModel, false, model);
      gl.uniformMatrix4fv(surfLoc.uVP, false, vp);
      gl.uniform3f(surfLoc.uCameraPos, eye[0], eye[1], eye[2]);
      gl.uniform3f(surfLoc.uKeyLight, 2.2, 3.1, 3.4);

      gl.drawElements(gl.TRIANGLES, geometry.indices.length, gl.UNSIGNED_INT, 0);

      state.rafId = requestAnimationFrame(render);
    }

    function onPointerDown(e) {
      state.dragging = true;
      state.dragDistance = 0;
      state.spinningToTarget = false;
      state.velY = 0;
      state.lastPointerX = e.clientX;
      state.lastPointerY = e.clientY;
      state.lastMoveTime = performance.now();
      if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
    }

    function onPointerMove(e) {
      if (!state.dragging) return;
      const now = performance.now();
      const dx = e.clientX - state.lastPointerX;
      const dy = e.clientY - state.lastPointerY;
      state.dragDistance += Math.hypot(dx, dy);
      const dt = Math.max(0.004, (now - state.lastMoveTime) / 1000);

      const deltaY = dx * 0.011;
      state.rotY += deltaY;
      state.pitchX = clamp(state.pitchX + dy * 0.006, -28 * DEG, 38 * DEG);
      state.velY = clamp(deltaY / dt, -18, 18);

      state.lastPointerX = e.clientX;
      state.lastPointerY = e.clientY;
      state.lastMoveTime = now;
    }

    function onPointerUp(e) {
      if (!state.dragging) return;
      state.dragging = false;
      if (canvas.releasePointerCapture) {
        try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
      }
      if (state.dragDistance >= 28 && typeof opts.onDragSpin === "function") opts.onDragSpin();
    }

    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    state.rafId = requestAnimationFrame(render);

    function normalizeFaceKey(value) {
      return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    }

    function spin(targetWordOrIndex, instant = false) {
      let chosenIndex;
      if (typeof targetWordOrIndex === "number") {
        chosenIndex = ((targetWordOrIndex % 6) + 6) % 6;
      } else if (typeof targetWordOrIndex === "string") {
        const key = normalizeFaceKey(targetWordOrIndex);
        const matches = FACES.filter(f => normalizeFaceKey(f.word) === key);
        chosenIndex = matches.length
          ? matches[Math.floor(Math.random() * matches.length)].index
          : Math.floor(Math.random() * 6);
      } else {
        chosenIndex = Math.floor(Math.random() * 6);
      }

      const desiredMod = (-chosenIndex * (Math.PI / 3) % TAU + TAU) % TAU;
      const currentMod = ((state.rotY % TAU) + TAU) % TAU;
      let delta = desiredMod - currentMod;
      if (delta < 0) delta += TAU;

      const extraTurns = (4 + Math.floor(Math.random() * 3)) * TAU;
      state.spinStartAngle = state.rotY;
      state.spinTargetAngle = state.rotY + extraTurns + delta;
      state.targetFace = FACES[chosenIndex];
      state.velY = 0;

      if (instant) {
        state.rotY = state.spinTargetAngle;
        state.rollZ = 0;
        state.spinningToTarget = false;
        const activeIdx = currentFrontFaceIndex();
        if (activeIdx !== state.lastReportedFace) {
          state.lastReportedFace = activeIdx;
          if (typeof opts.onFaceChange === "function") {
            opts.onFaceChange(FACES[activeIdx]);
          }
        }
        if (typeof opts.onSettle === "function" && state.targetFace) {
          opts.onSettle(state.targetFace);
        }
        return state.targetFace;
      }

      state.spinStartTime = performance.now();
      state.spinDuration = 2400 + Math.random() * 500;
      state.spinningToTarget = true;
      return state.targetFace;
    }

    async function exportGLB(includeOutline) {
      const blob = await new Promise(resolve => atlasCanvas.toBlob(resolve, "image/png"));
      const pngBytes = new Uint8Array(await blob.arrayBuffer());
      const glbBytes = buildGLBBuffer(geometry, pngBytes, includeOutline);
      return new Blob([glbBytes], { type: "model/gltf-binary" });
    }

    function rotateBy(degrees) {
      state.spinningToTarget = false;
      state.velY = 0;
      state.rotY += Number(degrees) * DEG;
    }

    function setPaused(paused) {
      if (state.destroyed || state.paused === !!paused) return;
      state.paused = !!paused;
      if (state.paused) { cancelAnimationFrame(state.rafId); state.rafId = 0; }
      else { state.lastFrameTime = performance.now(); state.rafId = requestAnimationFrame(render); }
    }

    function setResting(resting) {
      state.restingRoll = resting ? 76 * DEG : 0;
      state.pitchX = opts.tiltDeg * DEG;
      state.velY = 0;
      state.spinningToTarget = false;
    }

    function setAutoRotate(enabled) {
      state.autoRotate = !!enabled;
    }

    function setOutlineWidth(w) {
      state.outlineWidth = clamp(Number(w) || 0, 0, 0.08);
    }

    function resetCamera() {
      state.pitchX = opts.tiltDeg * DEG;
      state.rollZ = 0;
    }

    function destroy() {
      if (state.destroyed) return;
      state.destroyed = true;
      cancelAnimationFrame(state.rafId);
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      for (const buffer of [posBuf, normBuf, smoothNormBuf, uvBuf, idxBuf]) gl.deleteBuffer(buffer);
      gl.deleteTexture(tex);
      gl.deleteProgram(surfProg);
      gl.deleteProgram(outProg);
    }

    return {
      spin,
      rotateBy,
      exportGLB,
      setAutoRotate,
      setPaused,
      setResting,
      setOutlineWidth,
      resetCamera,
      getCurrentFace: () => FACES[currentFrontFaceIndex()],
      atlasCanvas,
      geometry,
      destroy
    };
  }

  return {
    FACES,
    ATLAS_LAYOUT,
    ROTULO_GLYPHS,
    paintPirinolaAtlas,
    createPirinolaGeometry,
    buildGLBBuffer,
    createViewer
  };
});
