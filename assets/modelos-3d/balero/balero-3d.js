/**
 * Balero3D — Modelo 3D estilizado de un balero tradicional mexicano de madera
 * Estética de animación mexicana "Las Leyendas" (cel-shaded + contornos de tinta negra + hand-painted).
 * Incluye barril redondeado color ámbar cálido con franjas y motivos florales tradicionales
 * (rojo carmesí, amarillo cempasúchil, negro y verde), hueco central bien definido,
 * cordón trenzado de algodón dinámico y mango delgado de madera clara torneada con punta negra.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.Balero3D = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;

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

  // Paleta cromática tradicional solicitada
  const PALETTE = {
    amberLight: "#F5B354",
    amberMid: "#E08728",
    amberDeep: "#AD5812",
    amberGrain: "#783609",
    crimson: "#C9142B",
    crimsonHi: "#F0384E",
    crimsonLo: "#820918",
    cempasuchil: "#F7A400",
    cempasuchilHi: "#FFCA28",
    cempasuchilLo: "#B86B00",
    emerald: "#0E8A4D",
    emeraldHi: "#28B872",
    emeraldLo: "#06542D",
    blackLacquer: "#1A1310",
    blackHi: "#3A2D27",
    cream: "#FFF6E0",
    lightWoodHi: "#FBF0D9",
    lightWoodMid: "#F2D7A8",
    lightWoodLo: "#CFA268",
    cottonLight: "#FCF6E8",
    cottonMid: "#E5D5B7",
    cottonShadow: "#A9916E",
    ink: "#150D09"
  };

  // ============================================================================
  // 1. LAYOUT DEL ATLAS DE TEXTURAS HAND-PAINTED (2048 x 2048)
  // ============================================================================
  // - Franja 1 (y: 0..1120): Exterior del barril ámbar + franjas + flores tradicionales
  // - Franja 2 (y: 1128..1448): Base del barril y hueco central bien definido
  // - Franja 3 (y: 1456..1824): Mango delgado de madera clara torneada con punta negra
  // - Franja 4 (y: 1832..2048): Cordón trenzado de algodón
  const ATLAS_LAYOUT = {
    size: 2048,
    barrelY0: 0,
    barrelY1: 1120,
    cavityY0: 1128,
    cavityY1: 1448,
    handleY0: 1456,
    handleY1: 1824,
    cordY0: 1832,
    cordY1: 2048
  };

  function paintStripe(ctx, w, y0, y1, baseColor, hiColor, loColor, inkBorderWidth, seed, wear) {
    const h = y1 - y0;
    if (h <= 0) return;
    const rng = mulberry32(seed);
    ctx.save();

    const grad = ctx.createLinearGradient(0, y0, 0, y1);
    grad.addColorStop(0.0, hiColor);
    grad.addColorStop(0.45, baseColor);
    grad.addColorStop(1.0, loColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, y0, w, h);

    // Pinceladas horizontales vivas estilo laca artesanal
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = hiColor;
    for (let i = 0; i < 6; i++) {
      const py = y0 + h * (0.15 + rng() * 0.55);
      ctx.lineWidth = 1.6 + rng() * 3.2;
      ctx.beginPath();
      const phase = rng() * TAU;
      for (let s = 0; s <= 28; s++) {
        const u = s / 28;
        const px = u * w;
        const wy = py + Math.sin(u * TAU * 3 + phase) * 1.5;
        if (s === 0) ctx.moveTo(px, wy);
        else ctx.lineTo(px, wy);
      }
      ctx.stroke();
    }

    // Desgaste artesanal sutil en los bordes dejando asomar madera ámbar
    if (wear > 0) {
      ctx.fillStyle = PALETTE.amberLight;
      ctx.globalAlpha = 0.55 * wear;
      for (let i = 0; i < 32; i++) {
        const cx = rng() * w;
        const cy = rng() > 0.5 ? y0 + rng() * 3.2 : y1 - rng() * 3.2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 4 + rng() * 12, 1.3 + rng() * 2.2, 0, 0, TAU);
        ctx.fill();
      }
    }

    if (inkBorderWidth > 0) {
      ctx.globalAlpha = 0.94;
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = inkBorderWidth;
      ctx.beginPath();
      ctx.moveTo(0, y0);
      ctx.lineTo(w, y0);
      ctx.moveTo(0, y1);
      ctx.lineTo(w, y1);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Dibuja una hoja tradicional mexicana pintada a pincel con nervadura
  function drawPaintedLeaf(ctx, cx, cy, angle, length, width, flip) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    if (flip) ctx.scale(1, -1);

    // Sombra/contorno de tinta negra
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(length * 0.45, -width * 0.95, length, 0);
    ctx.quadraticCurveTo(length * 0.45, width * 0.75, 0, 0);
    ctx.closePath();

    ctx.fillStyle = PALETTE.emerald;
    ctx.fill();
    ctx.lineWidth = 4.2;
    ctx.strokeStyle = PALETTE.ink;
    ctx.stroke();

    // Luz superior amarilla/verde tierno estilo gouache
    ctx.beginPath();
    ctx.moveTo(length * 0.12, -1);
    ctx.quadraticCurveTo(length * 0.45, -width * 0.55, length * 0.84, -1);
    ctx.strokeStyle = PALETTE.emeraldHi;
    ctx.lineWidth = width * 0.36;
    ctx.lineCap = "round";
    ctx.stroke();

    // Nervadura central en amarillo cempasúchil / crema
    ctx.beginPath();
    ctx.moveTo(length * 0.08, 0);
    ctx.quadraticCurveTo(length * 0.5, -width * 0.08, length * 0.85, 0);
    ctx.strokeStyle = PALETTE.cempasuchilHi;
    ctx.lineWidth = 2.4;
    ctx.stroke();

    ctx.restore();
  }

  // Dibuja un capullo floral lateral en rojo carmesí y amarillo cempasúchil
  function drawFloralBud(ctx, cx, cy, angle, size, isCrimson) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    const mainCol = isCrimson ? PALETTE.crimson : PALETTE.cempasuchil;
    const hiCol = isCrimson ? PALETTE.crimsonHi : PALETTE.cempasuchilHi;
    const accentCol = isCrimson ? PALETTE.cempasuchilHi : PALETTE.crimson;

    // Cáliz verde en la base
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.34, 0, TAU);
    ctx.fillStyle = PALETTE.emerald;
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = PALETTE.ink;
    ctx.stroke();

    // 3 pétalos de capullo
    const angles = [-0.42, 0.42, 0];
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.rotate(angles[i]);
      const pLen = i === 2 ? size * 1.15 : size * 0.95;
      const pWid = size * 0.44;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(pLen * 0.35, -pWid, pLen * 0.9, -pWid * 0.6, pLen, 0);
      ctx.bezierCurveTo(pLen * 0.9, pWid * 0.6, pLen * 0.35, pWid, 0, 0);
      ctx.closePath();
      ctx.fillStyle = mainCol;
      ctx.fill();
      ctx.lineWidth = 3.6;
      ctx.strokeStyle = PALETTE.ink;
      ctx.stroke();

      // Pincelada de luz interna
      ctx.beginPath();
      ctx.arc(pLen * 0.62, 0, pWid * 0.28, 0, TAU);
      ctx.fillStyle = hiCol;
      ctx.fill();
      ctx.restore();
    }

    // Punto polen central
    ctx.beginPath();
    ctx.arc(size * 0.85, 0, 3.6, 0, TAU);
    ctx.fillStyle = accentCol;
    ctx.fill();
    ctx.restore();
  }

  // Dibuja una flor tradicional mexicana grande (dalia / cempasúchil de 8 pétalos)
  function drawTraditionalFlower(ctx, cx, cy, radius, primaryType) {
    ctx.save();
    ctx.translate(cx, cy);

    const isCrimson = primaryType === "crimson";
    const outerBase = isCrimson ? PALETTE.crimson : PALETTE.cempasuchil;
    const outerHi = isCrimson ? PALETTE.crimsonHi : PALETTE.cempasuchilHi;
    const innerRing = isCrimson ? PALETTE.cempasuchil : PALETTE.crimson;
    const innerHi = isCrimson ? PALETTE.cempasuchilHi : PALETTE.crimsonHi;

    // 4 hojas verdes diagonales asomando detrás de la corola
    for (let i = 0; i < 4; i++) {
      const ang = (i * Math.PI * 0.5) + Math.PI * 0.25;
      drawPaintedLeaf(ctx, Math.cos(ang) * (radius * 0.42), Math.sin(ang) * (radius * 0.42), ang, radius * 0.92, radius * 0.34, i % 2 === 0);
    }

    // 8 pétalos redondeados pintados a mano con contorno de tinta negra
    const petals = 8;
    for (let i = 0; i < petals; i++) {
      ctx.save();
      ctx.rotate((i / petals) * TAU);

      const pLen = radius * 0.98;
      const pWid = radius * 0.38;

      ctx.beginPath();
      ctx.moveTo(radius * 0.14, 0);
      ctx.bezierCurveTo(pLen * 0.38, -pWid, pLen * 0.88, -pWid * 0.82, pLen, 0);
      ctx.bezierCurveTo(pLen * 0.88, pWid * 0.82, pLen * 0.38, pWid, radius * 0.14, 0);
      ctx.closePath();

      ctx.fillStyle = outerBase;
      ctx.fill();
      ctx.lineWidth = 4.6;
      ctx.strokeStyle = PALETTE.ink;
      ctx.stroke();

      // Pincelada gouache luminosa en el lóbulo del pétalo
      ctx.beginPath();
      ctx.ellipse(pLen * 0.64, -pWid * 0.08, pLen * 0.20, pWid * 0.28, 0, 0, TAU);
      ctx.fillStyle = outerHi;
      ctx.fill();

      // Trazo decorativo crema en la punta del pétalo (estilo laca de Olinalá)
      ctx.beginPath();
      ctx.arc(pLen * 0.72, 0, pWid * 0.32, -0.75, 0.75);
      ctx.strokeStyle = PALETTE.cream;
      ctx.lineWidth = 2.6;
      ctx.stroke();

      ctx.restore();
    }

    // Corola interior secundaria (8 pequeños pétalos contrastantes)
    for (let i = 0; i < petals; i++) {
      ctx.save();
      ctx.rotate(((i + 0.5) / petals) * TAU);
      const rIn = radius * 0.50;
      const wIn = radius * 0.19;
      ctx.beginPath();
      ctx.moveTo(radius * 0.10, 0);
      ctx.quadraticCurveTo(rIn * 0.6, -wIn, rIn, 0);
      ctx.quadraticCurveTo(rIn * 0.6, wIn, radius * 0.10, 0);
      ctx.closePath();
      ctx.fillStyle = innerRing;
      ctx.fill();
      ctx.lineWidth = 3.2;
      ctx.strokeStyle = PALETTE.ink;
      ctx.stroke();
      ctx.restore();
    }

    // Botón central negro con anillo cempasúchil y puntillado artesanal
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.24, 0, TAU);
    ctx.fillStyle = PALETTE.blackLacquer;
    ctx.fill();
    ctx.lineWidth = 4.0;
    ctx.strokeStyle = PALETTE.ink;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.14, 0, TAU);
    ctx.fillStyle = innerHi;
    ctx.fill();

    // Coronita de puntos blancos/amarillos alrededor del centro
    const dots = 10;
    for (let d = 0; d < dots; d++) {
      const a = (d / dots) * TAU;
      const dr = radius * 0.31;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * dr, Math.sin(a) * dr, 3.2, 0, TAU);
      ctx.fillStyle = PALETTE.cream;
      ctx.fill();
    }

    ctx.restore();
  }

  function paintBarrelExteriorStrip(ctx) {
    const y0 = ATLAS_LAYOUT.barrelY0;
    const y1 = ATLAS_LAYOUT.barrelY1;
    const h = y1 - y0;
    const w = ATLAS_LAYOUT.size;
    const rng = mulberry32(2026);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, y0, w, h);
    ctx.clip();

    // 1. Base de madera color ámbar cálido con acabado de barniz artesanal
    const woodGrad = ctx.createLinearGradient(0, y0, 0, y1);
    woodGrad.addColorStop(0.0, "#DDA85E");   // Coronilla superior
    woodGrad.addColorStop(0.14, "#F6B450");  // Hombro ámbar luminoso
    woodGrad.addColorStop(0.32, "#E38B2B");  // Ámbar miel intenso
    woodGrad.addColorStop(0.50, "#F09D38");  // Ecuador cálido
    woodGrad.addColorStop(0.72, "#E08424");  // Ámbar tostado
    woodGrad.addColorStop(0.90, "#F2AB46");  // Hombro inferior
    woodGrad.addColorStop(1.0, "#C97119");   // Base del barril
    ctx.fillStyle = woodGrad;
    ctx.fillRect(0, y0, w, h);

    // Lavados de gouache ámbar y vetas horizontales de madera torneada (periódicas en u=0..1)
    for (let i = 0; i < 28; i++) {
      const gy = y0 + rng() * h;
      const gh = 10 + rng() * 34;
      ctx.fillStyle = i % 2 === 0 ? "#FFD27D" : "#B55B10";
      ctx.globalAlpha = 0.10 + rng() * 0.08;
      ctx.fillRect(0, gy - gh * 0.5, w, gh);
    }

    for (let i = 0; i < 26; i++) {
      const gy = y0 + ((i + 0.35) / 26) * h;
      const phase = rng() * TAU;
      const amp = 4 + rng() * 9;
      ctx.globalAlpha = 0.26 + rng() * 0.14;
      ctx.strokeStyle = i % 3 === 0 ? "#853B08" : "#B85E14";
      ctx.lineWidth = 2.2 + rng() * 4.2;
      ctx.beginPath();
      for (let s = 0; s <= 36; s++) {
        const u = s / 36;
        const px = u * w;
        const py = gy + Math.sin(u * TAU * 2 + phase) * amp + Math.cos(u * TAU * 4 + phase) * (amp * 0.35);
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;

    // 2. Franjas artesanales superiores e inferiores (rojo carmesí, amarillo cempasúchil, negro y verde)
    // Nota: dejamos amplias reservas de madera color ámbar cálido (t: 0.17..0.28 y 0.72..0.83)
    // para que luzca la madera ámbar barnizada junto con las franjas y flores!
    const stripes = [
      // Anillos de la coronilla alrededor del orificio superior del cordón
      { t0: 0.000, t1: 0.025, base: "#2B180E", hi: "#4A2C1B", lo: "#140B06", ink: 3.5, wear: 0.2 },
      { t0: 0.032, t1: 0.068, base: PALETTE.crimson, hi: PALETTE.crimsonHi, lo: PALETTE.crimsonLo, ink: 3.8, wear: 0.22 },
      { t0: 0.072, t1: 0.098, base: PALETTE.cempasuchil, hi: PALETTE.cempasuchilHi, lo: PALETTE.cempasuchilLo, ink: 3.6, wear: 0.20 },
      { t0: 0.102, t1: 0.132, base: PALETTE.blackLacquer, hi: PALETTE.blackHi, lo: "#0B0807", ink: 3.8, wear: 0.18 },
      { t0: 0.136, t1: 0.168, base: PALETTE.emerald, hi: PALETTE.emeraldHi, lo: PALETTE.emeraldLo, ink: 4.0, wear: 0.24 },

      // [Reserva superior de madera ámbar cálido con filete fino en t: 0.165 .. 0.255]
      { t0: 0.205, t1: 0.218, base: PALETTE.crimson, hi: PALETTE.crimsonHi, lo: PALETTE.crimsonLo, ink: 2.8, wear: 0.15 },

      // Franjas artesanales que enmarcan el cuerpo floral arriba (rojo carmesí, amarillo cempasúchil, negro y verde)
      { t0: 0.255, t1: 0.282, base: PALETTE.emerald, hi: PALETTE.emeraldHi, lo: PALETTE.emeraldLo, ink: 3.8, wear: 0.18 },
      { t0: 0.285, t1: 0.312, base: PALETTE.blackLacquer, hi: PALETTE.blackHi, lo: "#0B0807", ink: 3.8, wear: 0.16 },
      { t0: 0.315, t1: 0.342, base: PALETTE.crimson, hi: PALETTE.crimsonHi, lo: PALETTE.crimsonLo, ink: 3.8, wear: 0.16 },
      { t0: 0.345, t1: 0.366, base: PALETTE.cempasuchil, hi: PALETTE.cempasuchilHi, lo: PALETTE.cempasuchilLo, ink: 4.0, wear: 0.14 },

      // [Cuerpo central en MADERA COLOR ÁMBAR CÁLIDO (t: 0.366 .. 0.634) donde lucen las flores tradicionales]

      // Franjas artesanales que enmarcan el cuerpo floral abajo (amarillo cempasúchil, rojo carmesí, negro y verde)
      { t0: 0.634, t1: 0.655, base: PALETTE.cempasuchil, hi: PALETTE.cempasuchilHi, lo: PALETTE.cempasuchilLo, ink: 4.0, wear: 0.14 },
      { t0: 0.658, t1: 0.685, base: PALETTE.crimson, hi: PALETTE.crimsonHi, lo: PALETTE.crimsonLo, ink: 3.8, wear: 0.16 },
      { t0: 0.688, t1: 0.715, base: PALETTE.blackLacquer, hi: PALETTE.blackHi, lo: "#0B0807", ink: 3.8, wear: 0.16 },
      { t0: 0.718, t1: 0.745, base: PALETTE.emerald, hi: PALETTE.emeraldHi, lo: PALETTE.emeraldLo, ink: 3.8, wear: 0.18 },

      // [Reserva de madera ámbar cálido inferior en t: 0.745 .. 0.835]
      { t0: 0.782, t1: 0.795, base: PALETTE.cempasuchil, hi: PALETTE.cempasuchilHi, lo: PALETTE.cempasuchilLo, ink: 2.8, wear: 0.15 },

      // Franjas artesanales inferiores cerca de la base del barril (t: 0.835 .. 0.965)
      { t0: 0.835, t1: 0.868, base: PALETTE.emerald, hi: PALETTE.emeraldHi, lo: PALETTE.emeraldLo, ink: 3.8, wear: 0.24 },
      { t0: 0.872, t1: 0.902, base: PALETTE.blackLacquer, hi: PALETTE.blackHi, lo: "#0B0807", ink: 3.6, wear: 0.22 },
      { t0: 0.906, t1: 0.934, base: PALETTE.cempasuchil, hi: PALETTE.cempasuchilHi, lo: PALETTE.cempasuchilLo, ink: 3.6, wear: 0.25 },
      { t0: 0.938, t1: 0.972, base: PALETTE.crimson, hi: PALETTE.crimsonHi, lo: PALETTE.crimsonLo, ink: 4.0, wear: 0.30 }
    ];

    for (let i = 0; i < stripes.length; i++) {
      const s = stripes[i];
      paintStripe(ctx, w, y0 + s.t0 * h, y0 + s.t1 * h, s.base, s.hi, s.lo, s.ink, 300 + i * 29, s.wear);
    }

    // Greca / cenefa punteada artesanal en las dos reservas de madera ámbar cálido
    const amberBandsY = [y0 + 0.220 * h, y0 + 0.780 * h];
    for (let b = 0; b < amberBandsY.length; b++) {
      const by = amberBandsY[b];
      const count = 48;
      for (let m = 0; m < count; m++) {
        const px = ((m + 0.5) / count) * w;
        const dy = (m % 2 === 0 ? -1 : 1) * 20;
        ctx.beginPath();
        ctx.arc(px, by + dy, 5.2, 0, TAU);
        ctx.fillStyle = m % 2 === 0 ? PALETTE.cempasuchilHi : PALETTE.emeraldHi;
        ctx.fill();
        ctx.lineWidth = 2.4;
        ctx.strokeStyle = PALETTE.ink;
        ctx.stroke();
      }
    }

    // 3. Motivos florales tradicionales sobre la madera ámbar cálido central (6 repeticiones sin costura)
    const floralCenterY = y0 + 0.50 * h;
    const flowerCount = 6;
    const cellW = w / flowerCount;

    // Sutil lavado cálido miel detrás del friso floral para realzar el contraste artesanal
    const bellyWash = ctx.createLinearGradient(0, y0 + 0.366 * h, 0, y0 + 0.634 * h);
    bellyWash.addColorStop(0.0, "rgba(180, 82, 12, 0.22)");
    bellyWash.addColorStop(0.5, "rgba(255, 196, 88, 0.18)");
    bellyWash.addColorStop(1.0, "rgba(180, 82, 12, 0.22)");
    ctx.fillStyle = bellyWash;
    ctx.fillRect(0, y0 + 0.366 * h, w, (0.634 - 0.366) * h);

    // Guía ondulada en negro y verde esmeralda que une las flores alrededor del barril ámbar
    ctx.save();
    ctx.lineCap = "round";
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 14.5;
    ctx.beginPath();
    for (let s = 0; s <= 96; s++) {
      const u = s / 96;
      const px = u * w;
      const py = floralCenterY + Math.sin(u * TAU * flowerCount) * 42;
      if (s === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    ctx.strokeStyle = PALETTE.emerald;
    ctx.lineWidth = 8.5;
    ctx.stroke();

    ctx.strokeStyle = PALETTE.emeraldHi;
    ctx.lineWidth = 3.2;
    ctx.stroke();
    ctx.restore();

    // Hojas, capullos y flores principales (incluyendo repetición en bordes para costura perfecta u=0/1)
    for (let k = -1; k <= flowerCount; k++) {
      const cx = (k + 0.5) * cellW;
      const isCrimson = ((k % 2) + 2) % 2 === 0;

      // Hojas laterales en los arcos del tallo entre flor y flor
      const midRightX = (k + 1.0) * cellW;
      drawPaintedLeaf(ctx, midRightX - 18, floralCenterY - 26, -0.55, 58, 22, false);
      drawPaintedLeaf(ctx, midRightX - 18, floralCenterY + 26, 0.55, 58, 22, true);

      // Capullos florales secundarios arriba y abajo en el espacio intermedio
      drawFloralBud(ctx, midRightX, floralCenterY - 52, -Math.PI * 0.5, 34, !isCrimson);
      drawFloralBud(ctx, midRightX, floralCenterY + 52, Math.PI * 0.5, 34, isCrimson);

      // Flor tradicional principal (alternando Rojo Carmesí y Amarillo Cempasúchil)
      drawTraditionalFlower(ctx, cx, floralCenterY, 104, isCrimson ? "crimson" : "cempasuchil");
    }

    ctx.restore();
  }

  function paintBarrelCavityStrip(ctx) {
    // v = 0 (borde inferior redondeado del barril) -> v = 0.34 (labio del hueco) -> v = 1.0 (fondo del hueco central)
    const y0 = ATLAS_LAYOUT.cavityY0;
    const y1 = ATLAS_LAYOUT.cavityY1;
    const h = y1 - y0;
    const w = ATLAS_LAYOUT.size;
    const rng = mulberry32(5510);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, y0, w, h);
    ctx.clip();

    const grad = ctx.createLinearGradient(0, y0, 0, y1);
    grad.addColorStop(0.00, "#F3BD6E"); // Borde de madera torneada en la base
    grad.addColorStop(0.28, "#E5A44E"); // Anillo plano antes del hueco
    grad.addColorStop(0.34, "#24140B"); // Filo entintado del hueco central
    grad.addColorStop(0.42, "#7A4219"); // Entrada biselada del hueco
    grad.addColorStop(0.68, "#47230C"); // Pared cilíndrica interior profunda
    grad.addColorStop(1.00, "#1C0C05"); // Fondo oscuro del hueco central
    ctx.fillStyle = grad;
    ctx.fillRect(0, y0, w, h);

    // Vetas circulares de torno en el aro de madera y dentro del hueco
    for (let i = 0; i < 18; i++) {
      const py = y0 + (i / 18) * h;
      ctx.globalAlpha = i < 6 ? 0.25 : 0.18;
      ctx.strokeStyle = i < 6 ? "#AD631D" : "#2A1206";
      ctx.lineWidth = 2.0 + rng() * 2.5;
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(w, py);
      ctx.stroke();
    }

    // Contorno de tinta negra bien marcado en el labio del hueco central
    ctx.globalAlpha = 0.96;
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 7.5;
    ctx.beginPath();
    ctx.moveTo(0, y0 + h * 0.33);
    ctx.lineTo(w, y0 + h * 0.33);
    ctx.stroke();

    ctx.restore();
  }

  function paintHandleStrip(ctx) {
    // v = 0 (punta negra superior de la espiga) -> v = 1 (extremo inferior del mango de madera clara)
    const y0 = ATLAS_LAYOUT.handleY0;
    const y1 = ATLAS_LAYOUT.handleY1;
    const h = y1 - y0;
    const w = ATLAS_LAYOUT.size;
    const rng = mulberry32(7741);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, y0, w, h);
    ctx.clip();

    // Base de madera clara torneada (pino/ayacahuite claro, contrastando con el barril ámbar)
    const woodGrad = ctx.createLinearGradient(0, y0, 0, y1);
    woodGrad.addColorStop(0.00, PALETTE.lightWoodMid);
    woodGrad.addColorStop(0.30, PALETTE.lightWoodHi);
    woodGrad.addColorStop(0.65, PALETTE.lightWoodMid);
    woodGrad.addColorStop(0.92, "#E4BE88");
    woodGrad.addColorStop(1.00, "#BA8950");
    ctx.fillStyle = woodGrad;
    ctx.fillRect(0, y0, w, h);

    // Vetas suaves pintadas a mano a lo largo del mango
    for (let i = 0; i < 24; i++) {
      const gx = (i / 24) * w + (rng() - 0.5) * 30;
      ctx.globalAlpha = 0.22 + rng() * 0.14;
      ctx.strokeStyle = i % 2 === 0 ? "#D4A56A" : "#B88347";
      ctx.lineWidth = 3.0 + rng() * 5.0;
      ctx.beginPath();
      ctx.moveTo(gx, y0);
      ctx.bezierCurveTo(
        gx + (rng() - 0.5) * 40, y0 + h * 0.35,
        gx + (rng() - 0.5) * 40, y0 + h * 0.70,
        gx, y1
      );
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;

    // 1. PUNTA NEGRA de la espiga del mango (v: 0.00 .. 0.19)
    const blackEndY = y0 + h * 0.19;
    const tipGrad = ctx.createLinearGradient(0, y0, 0, blackEndY);
    tipGrad.addColorStop(0.00, "#382C26"); // Ligero desgaste en la coronilla por encajar el barril
    tipGrad.addColorStop(0.22, "#1C1512");
    tipGrad.addColorStop(0.75, "#140E0C");
    tipGrad.addColorStop(1.00, "#0E0A08");
    ctx.fillStyle = tipGrad;
    ctx.fillRect(0, y0, w, blackEndY - y0);

    // Sutiles marquitas circulares de madera en la puntilla por uso
    ctx.fillStyle = PALETTE.lightWoodMid;
    ctx.globalAlpha = 0.45;
    for (let i = 0; i < 26; i++) {
      const cx = rng() * w;
      const cy = y0 + rng() * 10;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 5 + rng() * 14, 1.5 + rng() * 2.2, 0, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // Filete artesanal rojo carmesí y amarillo bajo la punta negra
    paintStripe(ctx, w, blackEndY, y0 + h * 0.218, PALETTE.cempasuchil, PALETTE.cempasuchilHi, PALETTE.cempasuchilLo, 3.2, 811, 0.2);

    // 2. Sombra de tinta en el tope anular y el cuello donde se amarra el cordón (v: 0.28 .. 0.42)
    paintStripe(ctx, w, y0 + h * 0.295, y0 + h * 0.312, "#3B2212", "#59351E", "#1E1008", 2.8, 812, 0.1);
    paintStripe(ctx, w, y0 + h * 0.355, y0 + h * 0.415, "#C79A63", "#DFB580", "#9E723E", 3.2, 813, 0.0);

    // 3. Anillos tradicionales quemados/pintados a mitad de la empuñadura (como en la Foto 4)
    paintStripe(ctx, w, y0 + h * 0.620, y0 + h * 0.642, PALETTE.blackLacquer, PALETTE.blackHi, "#090706", 3.4, 814, 0.25);
    paintStripe(ctx, w, y0 + h * 0.652, y0 + h * 0.670, PALETTE.crimson, PALETTE.crimsonHi, PALETTE.crimsonLo, 3.0, 815, 0.25);
    paintStripe(ctx, w, y0 + h * 0.678, y0 + h * 0.694, PALETTE.emerald, PALETTE.emeraldHi, PALETTE.emeraldLo, 3.0, 816, 0.25);

    ctx.restore();
  }

  function paintCordStrip(ctx) {
    // Textura de cordón trenzado de algodón (trenzado diagonal de 3 cabos con trazos de tinta)
    const y0 = ATLAS_LAYOUT.cordY0;
    const y1 = ATLAS_LAYOUT.cordY1;
    const h = y1 - y0;
    const w = ATLAS_LAYOUT.size;

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, y0, w, h);
    ctx.clip();

    const baseGrad = ctx.createLinearGradient(0, y0, 0, y1);
    baseGrad.addColorStop(0.0, PALETTE.cottonLight);
    baseGrad.addColorStop(0.5, PALETTE.cottonMid);
    baseGrad.addColorStop(1.0, PALETTE.cottonLight);
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, y0, w, h);

    // Cabos diagonales del trenzado de algodón (64 repeticiones a lo largo del cordón)
    const braids = 64;
    const stepX = w / braids;
    for (let i = -2; i <= braids + 2; i++) {
      const xStart = i * stepX;

      // Sombra suave entre cabos
      ctx.strokeStyle = PALETTE.cottonShadow;
      ctx.lineWidth = stepX * 0.36;
      ctx.beginPath();
      ctx.moveTo(xStart, y0 - 10);
      ctx.lineTo(xStart + stepX * 1.5, y1 + 10);
      ctx.stroke();

      // Luz central de cada cabo de algodón
      ctx.strokeStyle = "#FFFDF7";
      ctx.lineWidth = stepX * 0.24;
      ctx.beginPath();
      ctx.moveTo(xStart + stepX * 0.42, y0 - 10);
      ctx.lineTo(xStart + stepX * 1.92, y1 + 10);
      ctx.stroke();

      // Trazo cruzado corto del trenzado (efecto espiga / trenza textil)
      ctx.strokeStyle = "#8C7352";
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(xStart + stepX * 0.2, y0 + h * 0.5);
      ctx.lineTo(xStart + stepX * 0.85, y0 + h * 0.18);
      ctx.moveTo(xStart + stepX * 0.2, y0 + h * 0.5);
      ctx.lineTo(xStart + stepX * 0.85, y0 + h * 0.82);
      ctx.stroke();

      // Acento cartoon de tinta negra en las muescas del trenzado
      ctx.strokeStyle = "#291B12";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(xStart, y0 - 6);
      ctx.lineTo(xStart + stepX * 1.5, y1 + 6);
      ctx.stroke();
    }

    ctx.restore();
  }

  function paintBaleroAtlas(ctx) {
    const S = ATLAS_LAYOUT.size;
    ctx.fillStyle = PALETTE.amberMid;
    ctx.fillRect(0, 0, S, S);

    paintBarrelExteriorStrip(ctx);
    paintBarrelCavityStrip(ctx);
    paintHandleStrip(ctx);
    paintCordStrip(ctx);
  }

  // ============================================================================
  // 2. GEOMETRÍA 3D DE LAS 3 PIEZAS: BARRIL CON HUECO, MANGO Y CORDÓN TRENZADO
  // ============================================================================

  // Construye una malla de revolución a partir de una polilínea de perfil [{ r, y, v, sharp }]
  function buildLatheMesh(profile, radialSegments, outlineThickness, outlineScaleFn) {
    const N = radialSegments;
    const P = profile.length;

    // 1. Calcular normales meridianas 2D por segmento y suavizar salvo en esquinas marcadas (sharp)
    const segNR = new Float32Array(P - 1);
    const segNY = new Float32Array(P - 1);
    for (let i = 0; i < P - 1; i++) {
      const dr = profile[i + 1].r - profile[i].r;
      const dy = profile[i + 1].y - profile[i].y;
      // Recorremos el perfil de modo que la normal exterior quede a la derecha del avance (dy, -dr) o (-dy, dr)
      // Verificación: en la pared exterior del barril bajamos desde y=+0.92 hasta y=-0.92 (dy < 0),
      // por lo que (-dy, dr) tiene componente radial -dy > 0 (hacia afuera +r).
      const nr = -dy;
      const ny = dr;
      const len = Math.hypot(nr, ny) || 1;
      segNR[i] = nr / len;
      segNY[i] = ny / len;
    }

    const vertNR = new Float32Array(P);
    const vertNY = new Float32Array(P);
    const smoothNR = new Float32Array(P);
    const smoothNY = new Float32Array(P);

    for (let i = 0; i < P; i++) {
      const nrA = i > 0 ? segNR[i - 1] : segNR[0];
      const nyA = i > 0 ? segNY[i - 1] : segNY[0];
      const nrB = i < P - 1 ? segNR[i] : segNR[P - 2];
      const nyB = i < P - 1 ? segNY[i] : segNY[P - 2];

      let snr = nrA + nrB;
      let sny = nyA + nyB;
      if (profile[i].r < 1e-4) {
        snr = 0;
        sny = sny >= 0 ? 1 : -1;
      } else {
        const sl = Math.hypot(snr, sny) || 1;
        snr /= sl;
        sny /= sl;
      }
      smoothNR[i] = snr;
      smoothNY[i] = sny;

      if (profile[i].sharp) {
        vertNR[i] = nrB;
        vertNY[i] = nyB;
      } else {
        vertNR[i] = snr;
        vertNY[i] = sny;
      }
    }

    const posArr = [];
    const normArr = [];
    const smoothNormArr = [];
    const uvArr = [];
    const indices = [];

    const outPosArr = [];
    const outNormArr = [];
    const outIndices = [];

    for (let i = 0; i < P; i++) {
      const pt = profile[i];
      const r = pt.r;
      const y = pt.y;
      const v = pt.v;
      const nr = vertNR[i], ny = vertNY[i];
      const snr = smoothNR[i], sny = smoothNY[i];
      const thick = outlineThickness * (outlineScaleFn ? outlineScaleFn(pt, i) : 1.0);

      for (let c = 0; c <= N; c++) {
        const u = c / N;
        const theta = (c % N) * (TAU / N);
        const sinT = Math.sin(theta), cosT = Math.cos(theta);

        const px = r * sinT;
        const py = y;
        const pz = r * cosT;

        const nx = nr * sinT, nz = nr * cosT;
        const snx = snr * sinT, snz = snr * cosT;

        posArr.push(px, py, pz);
        normArr.push(nx, ny, nz);
        smoothNormArr.push(snx, sny, snz);
        uvArr.push(u, v);

        outPosArr.push(px + snx * thick, py + sny * thick, pz + snz * thick);
        outNormArr.push(-snx, -sny, -snz);
      }
    }

    const stride = N + 1;
    for (let i = 0; i < P - 1; i++) {
      for (let c = 0; c < N; c++) {
        const i00 = i * stride + c;
        const i10 = i * stride + c + 1;
        const i01 = (i + 1) * stride + c;
        const i11 = (i + 1) * stride + c + 1;

        // Con dy < 0 (bajando de arriba hacia abajo) y theta creciente de izq a der (sinT, cosT):
        // p00=(arriba,izq), p10=(arriba,der), p01=(abajo,izq), p11=(abajo,der)
        // Triángulos CCW vistos desde el exterior: (i00, i01, i11) y (i00, i11, i10)
        indices.push(i00, i01, i11, i00, i11, i10);
        outIndices.push(i00, i11, i01, i00, i10, i11);
      }
    }

    return {
      positions: new Float32Array(posArr),
      normals: new Float32Array(normArr),
      smoothNormals: new Float32Array(smoothNormArr),
      uvs: new Float32Array(uvArr),
      indices: new Uint32Array(indices),
      outlinePositions: new Float32Array(outPosArr),
      outlineNormals: new Float32Array(outNormArr),
      outlineIndices: new Uint32Array(outIndices)
    };
  }

  // Perfil cerrado del Barril Redondeado con su Hueco Central Inferior bien definido
  // Silueta clásica de barril mexicano (cilindro abombado con hombros redondeados)
  function createBarrelMesh(outlineThickness) {
    const vBar0 = (ATLAS_LAYOUT.barrelY0 + 4) / ATLAS_LAYOUT.size;
    const vBar1 = (ATLAS_LAYOUT.barrelY1 - 4) / ATLAS_LAYOUT.size;
    const vCav0 = (ATLAS_LAYOUT.cavityY0 + 4) / ATLAS_LAYOUT.size;
    const vCav1 = (ATLAS_LAYOUT.cavityY1 - 4) / ATLAS_LAYOUT.size;

    const profile = [];

    // 1. Pequeña cavidad superior de salida del cordón (r: 0 -> 0.088, y: +0.84 -> +0.94)
    profile.push({ r: 0.000, y: 0.84, v: vBar0 });
    profile.push({ r: 0.072, y: 0.85, v: vBar0 });
    profile.push({ r: 0.088, y: 0.94, v: lerp(vBar0, vBar1, 0.02), sharp: true });

    // 2. Coronilla superior redondeada (r: 0.088 -> 0.54, y: +0.94 -> +0.91)
    const topCrownSteps = 6;
    for (let s = 1; s <= topCrownSteps; s++) {
      const u = s / topCrownSteps;
      const r = lerp(0.088, 0.535, u);
      const y = 0.942 - 0.032 * u * u;
      profile.push({ r, y, v: lerp(vBar0, vBar1, lerp(0.02, 0.11, u)) });
    }

    // 3. Pared exterior de barril redondeado (t: 0 -> 1, desde hombro superior +0.91 hasta inferior -0.91)
    const wallSteps = 40;
    for (let s = 1; s <= wallSteps; s++) {
      const t = s / wallSteps; // 0 arriba, 1 abajo
      const u = t * 2 - 1;     // -1 arriba, +1 abajo
      const y = -0.91 * u;

      // Curva de barril abombado (superelipse suave: lados convexos y hombros bien redondeados)
      const barrelCurve = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(u), 2.55)), 0.42);
      const cartoonAsym = 1.0 + 0.032 * (-u); // Ligeramente más robusto en el tercio superior
      let r = (0.535 + 0.255 * barrelCurve) * cartoonAsym;

      // Muescas sutiles de torno en las franjas que enmarcan las flores
      const dTop = (t - 0.29) / 0.018;
      const dBot = (t - 0.71) / 0.018;
      if (Math.abs(dTop) < 1) r -= 0.008 * (1 - dTop * dTop);
      if (Math.abs(dBot) < 1) r -= 0.008 * (1 - dBot * dBot);

      const v = lerp(vBar0, vBar1, lerp(0.11, 0.97, t));
      profile.push({ r, y, v });
    }

    // 4. Base plana/redondeada inferior y entrada al HUECO CENTRAL BIEN DEFINIDO
    const lastOuter = profile[profile.length - 1];
    profile.push({ r: lastOuter.r, y: lastOuter.y, v: vCav0, sharp: true });

    // Aro inferior de madera torneada desde r ~ 0.52 hacia el labio del hueco en r = 0.275
    const rimSteps = 8;
    for (let s = 1; s <= rimSteps; s++) {
      const t = s / rimSteps;
      const r = lerp(lastOuter.r, 0.275, t);
      const y = -0.91 - 0.022 * Math.sin(t * Math.PI);
      profile.push({ r, y, v: lerp(vCav0, vCav1, t * 0.32) });
    }

    // Bisel bien marcado de entrada al hueco central (r: 0.275 -> 0.245, y: -0.91 -> -0.84)
    profile.push({ r: 0.258, y: -0.880, v: lerp(vCav0, vCav1, 0.36), sharp: true });
    profile.push({ r: 0.245, y: -0.835, v: lerp(vCav0, vCav1, 0.42) });

    // Pared cilíndrica profunda del hueco central (subiendo desde y=-0.835 hasta y=-0.08)
    const cavWallSteps = 12;
    for (let s = 1; s <= cavWallSteps; s++) {
      const t = s / cavWallSteps;
      const r = lerp(0.245, 0.218, t);
      const y = lerp(-0.835, -0.08, t);
      profile.push({ r, y, v: lerp(vCav0, vCav1, lerp(0.42, 0.88, t)) });
    }

    // Fondo abovedado interior del hueco central
    profile.push({ r: 0.145, y: -0.01, v: lerp(vCav0, vCav1, 0.95) });
    profile.push({ r: 0.000, y: 0.02, v: vCav1 });

    return buildLatheMesh(profile, 64, outlineThickness, pt => (pt.r < 0.255 && pt.y > -0.85 ? 0.42 : 1.0));
  }

  // Perfil del Mango Delgado de Madera Clara Torneada con Punta Negra
  // En coordenadas locales del mango:
  // - Espiga superior con punta negra: y en [+0.10 .. +0.62] (encaja dentro del hueco del barril)
  // - Tope anular (collar): y en [-0.08 .. +0.10]
  // - Cuello de amarre del cordón: y en [-0.28 .. -0.08]
  // - Empuñadura torneada delgada: y en [-1.92 .. -0.28]
  function createHandleMesh(outlineThickness) {
    const vH0 = (ATLAS_LAYOUT.handleY0 + 4) / ATLAS_LAYOUT.size;
    const vH1 = (ATLAS_LAYOUT.handleY1 - 4) / ATLAS_LAYOUT.size;
    const profile = [];

    function addPt(r, y, tUV, sharp) {
      profile.push({ r, y, v: lerp(vH0, vH1, clamp(tUV, 0, 1)), sharp: !!sharp });
    }

    // 1. Coronilla redondeada de la punta negra (y: +0.62 -> +0.54)
    const tipSteps = 6;
    for (let s = 0; s <= tipSteps; s++) {
      const t = s / tipSteps;
      const ang = (1 - t) * (Math.PI * 0.5);
      const r = 0.165 * Math.cos(ang);
      const y = 0.54 + 0.08 * Math.sin(ang);
      addPt(r, y, t * 0.05, false);
    }

    // 2. Cuerpo de la espiga con punta negra (y: +0.54 -> +0.11, r: 0.165 -> 0.188)
    const pegSteps = 12;
    for (let s = 1; s <= pegSteps; s++) {
      const t = s / pegSteps;
      const y = lerp(0.54, 0.11, t);
      const r = lerp(0.165, 0.188, t);
      addPt(r, y, lerp(0.05, 0.26, t), false);
    }

    // 3. Tope anular torneado donde asienta el barril (y: +0.11 -> -0.08, r sube a 0.335)
    addPt(0.205, 0.105, 0.265, true);
    addPt(0.320, 0.085, 0.280, false);
    addPt(0.340, 0.045, 0.295, false);
    addPt(0.340, -0.025, 0.315, false);
    addPt(0.315, -0.065, 0.330, false);
    addPt(0.200, -0.085, 0.345, true);

    // 4. Cuello entallado de amarre del cordón (y: -0.085 -> -0.27)
    const neckSteps = 6;
    for (let s = 1; s <= neckSteps; s++) {
      const t = s / neckSteps;
      const y = lerp(-0.085, -0.27, t);
      const r = 0.192 - 0.024 * Math.sin(t * Math.PI);
      addPt(r, y, lerp(0.345, 0.420, t), false);
    }

    // 5. Empuñadura delgada torneada expresiva (y: -0.27 -> -1.82)
    const gripSteps = 30;
    for (let s = 1; s <= gripSteps; s++) {
      const t = s / gripSteps;
      const y = lerp(-0.27, -1.82, t);
      // Silueta estilizada: ensancha suavemente a r=0.265 en el vientre y adelgaza hacia la punta inferior
      const swell = Math.sin(Math.pow(t, 0.72) * Math.PI);
      let r = lerp(0.205, 0.095, Math.pow(t, 1.15)) + 0.088 * swell;
      // Sutil muesca del anillo negro decorativo a mitad del mango
      const dRing = (t - 0.42) / 0.03;
      if (Math.abs(dRing) < 1) r -= 0.008 * (1 - dRing * dRing);
      addPt(r, y, lerp(0.420, 0.945, t), false);
    }

    // 6. Remate inferior redondeado del mango (y: -1.82 -> -1.92)
    const botSteps = 6;
    for (let s = 1; s <= botSteps; s++) {
      const t = s / botSteps;
      const ang = t * (Math.PI * 0.5);
      const r = 0.095 * Math.cos(ang);
      const y = -1.82 - 0.10 * Math.sin(ang);
      addPt(r, y, lerp(0.945, 1.0, t), false);
    }

    return buildLatheMesh(profile, 48, outlineThickness, () => 0.85);
  }

  // Evalúa un punto en una curva Bezier cúbica 3D
  function evalBezier3(p0, p1, p2, p3, t) {
    const mt = 1 - t;
    const mt2 = mt * mt, t2 = t * t;
    const c0 = mt2 * mt, c1 = 3 * mt2 * t, c2 = 3 * mt * t2, c3 = t2 * t;
    return [
      c0 * p0[0] + c1 * p1[0] + c2 * p2[0] + c3 * p3[0],
      c0 * p0[1] + c1 * p1[1] + c2 * p2[1] + c3 * p3[1],
      c0 * p0[2] + c1 * p1[2] + c2 * p2[2] + c3 * p3[2]
    ];
  }

  // Construye un tubo 3D trenzado a lo largo de una lista de puntos de línea central
  function appendTubeSegment(acc, centerline, baseRadius, radialSegs, outlineThickness, v0, v1, twistTurns) {
    const L = centerline.length;
    if (L < 2) return;

    const tangents = [];
    for (let i = 0; i < L; i++) {
      const pPrev = centerline[Math.max(0, i - 1)];
      const pNext = centerline[Math.min(L - 1, i + 1)];
      let tx = pNext[0] - pPrev[0], ty = pNext[1] - pPrev[1], tz = pNext[2] - pPrev[2];
      const len = Math.hypot(tx, ty, tz) || 1;
      tangents.push([tx / len, ty / len, tz / len]);
    }

    // Transporte paralelo (Rotation Minimizing Frame) para evitar torsiones bruscas
    const normals = [];
    const binormals = [];
    let t0 = tangents[0];
    let up = Math.abs(t0[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    let bx = t0[1] * up[2] - t0[2] * up[1];
    let by = t0[2] * up[0] - t0[0] * up[2];
    let bz = t0[0] * up[1] - t0[1] * up[0];
    let bl = Math.hypot(bx, by, bz) || 1;
    bx /= bl; by /= bl; bz /= bl;
    let nx = by * t0[2] - bz * t0[1];
    let ny = bz * t0[0] - bx * t0[2];
    let nz = bx * t0[1] - by * t0[0];
    normals.push([nx, ny, nz]);
    binormals.push([bx, by, bz]);

    for (let i = 1; i < L; i++) {
      const ti = tangents[i];
      const prevN = normals[i - 1];
      const dot = prevN[0] * ti[0] + prevN[1] * ti[1] + prevN[2] * ti[2];
      nx = prevN[0] - dot * ti[0];
      ny = prevN[1] - dot * ti[1];
      nz = prevN[2] - dot * ti[2];
      const nl = Math.hypot(nx, ny, nz) || 1;
      nx /= nl; ny /= nl; nz /= nl;
      bx = ti[1] * nz - ti[2] * ny;
      by = ti[2] * nx - ti[0] * nz;
      bz = ti[0] * ny - ti[1] * nx;
      normals.push([nx, ny, nz]);
      binormals.push([bx, by, bz]);
    }

    const baseVert = acc.pos.length / 3;
    const stride = radialSegs + 1;

    for (let i = 0; i < L; i++) {
      const u = i / (L - 1);
      const cPt = centerline[i];
      const N = normals[i];
      const B = binormals[i];

      for (let s = 0; s <= radialSegs; s++) {
        const vFrac = s / radialSegs;
        const ang = (s % radialSegs) * (TAU / radialSegs);
        // Relieve helicoidal de 3 cabos trenzados
        const braidWave = 1.0 + 0.08 * Math.cos(3 * ang + u * TAU * twistTurns);
        const r = baseRadius * braidWave;

        const cosA = Math.cos(ang), sinA = Math.sin(ang);
        const rnx = N[0] * cosA + B[0] * sinA;
        const rny = N[1] * cosA + B[1] * sinA;
        const rnz = N[2] * cosA + B[2] * sinA;

        const px = cPt[0] + rnx * r;
        const py = cPt[1] + rny * r;
        const pz = cPt[2] + rnz * r;

        acc.pos.push(px, py, pz);
        acc.norm.push(rnx, rny, rnz);
        acc.smoothNorm.push(rnx, rny, rnz);
        acc.uv.push(u, lerp(v0, v1, vFrac));

        acc.outPos.push(px + rnx * outlineThickness, py + rny * outlineThickness, pz + rnz * outlineThickness);
        acc.outNorm.push(-rnx, -rny, -rnz);
      }
    }

    for (let i = 0; i < L - 1; i++) {
      for (let s = 0; s < radialSegs; s++) {
        const i00 = baseVert + i * stride + s;
        const i10 = baseVert + i * stride + s + 1;
        const i01 = baseVert + (i + 1) * stride + s;
        const i11 = baseVert + (i + 1) * stride + s + 1;

        acc.idx.push(i00, i10, i11, i00, i11, i01);
        acc.outIdx.push(i00, i11, i10, i00, i01, i11);
      }
    }
  }

  // Transforma un punto 3D por rotación Z + traslación
  function transformPointZ(pt, pos, rotZ) {
    const cz = Math.cos(rotZ), sz = Math.sin(rotZ);
    return [
      pos[0] + cz * pt[0] - sz * pt[1],
      pos[1] + sz * pt[0] + cz * pt[1],
      pos[2] + pt[2]
    ];
  }

  function transformDirZ(dir, rotZ) {
    const cz = Math.cos(rotZ), sz = Math.sin(rotZ);
    return [
      cz * dir[0] - sz * dir[1],
      sz * dir[0] + cz * dir[1],
      dir[2]
    ];
  }

  /**
   * Construye el cordón trenzado de algodón completo (vueltas de amarre en el mango +
   * nudo superior del barril + lazo dinámico 3D que une ambas piezas).
   */
  function createCordMesh(barrelPose, handlePose, outlineThickness) {
    const vC0 = (ATLAS_LAYOUT.cordY0 + 6) / ATLAS_LAYOUT.size;
    const vC1 = (ATLAS_LAYOUT.cordY1 - 6) / ATLAS_LAYOUT.size;
    const acc = { pos: [], norm: [], smoothNorm: [], uv: [], idx: [], outPos: [], outNorm: [], outIdx: [] };

    const cordRadius = 0.044;
    const cordOutline = outlineThickness * 0.65;

    // 1. Tres vueltas apretadas de cordón trenzado alrededor del cuello del mango (y_local: -0.11 a -0.25)
    const coilPts = [];
    const coilSteps = 64;
    const coilTurns = 3.15;
    for (let i = 0; i <= coilSteps; i++) {
      const t = i / coilSteps;
      const ang = t * TAU * coilTurns + 0.35;
      const ly = lerp(-0.11, -0.245, t);
      const lr = 0.212;
      const localPt = [lr * Math.sin(ang), ly, lr * Math.cos(ang)];
      coilPts.push(transformPointZ(localPt, handlePose.pos, handlePose.rotZ));
    }
    appendTubeSegment(acc, coilPts, cordRadius * 0.96, 12, cordOutline, vC0, vC1, 22);

    // 2. Cordón trenzado saliendo por el orificio superior del barril y trazando un amplio arco exterior
    const topHoleWorld = transformPointZ([0, 0.88, 0], barrelPose.pos, barrelPose.rotZ);
    const topUpDir = transformDirZ([0, 1.0, 0], barrelPose.rotZ);
    const sepX = handlePose.pos[0] - barrelPose.pos[0];
    const openBlend = smoothstep(0.35, 0.95, sepX);

    // En pose vertical amarra por el costado izquierdo; en pose abierta amarra hacia el centro entre ambas piezas
    const tieLocalX = lerp(-0.21, -0.18, openBlend);
    const tieWorld = transformPointZ([tieLocalX, -0.17, 0.04], handlePose.pos, handlePose.rotZ);

    const a0 = topHoleWorld;
    const a1 = [
      a0[0] + topUpDir[0] * 0.48 + lerp(-0.14, 0.55, openBlend),
      a0[1] + topUpDir[1] * 0.52 + lerp(0.0, 0.25, openBlend),
      a0[2] + 0.08
    ];
    const midKnot = [
      lerp(Math.min(a0[0], tieWorld[0]) - 1.12, 0.22, openBlend),
      lerp(0.55 * a0[1] + 0.45 * tieWorld[1] + 0.15, 0.82, openBlend),
      0.16
    ];
    const a2 = [
      midKnot[0] + lerp(0.22, -0.45, openBlend),
      lerp(a0[1] + 0.36, 1.45, openBlend),
      0.14
    ];

    const b0 = midKnot;
    const b1 = [
      midKnot[0] - lerp(0.22, -0.32, openBlend),
      lerp(midKnot[1] - (a2[1] - midKnot[1]), 0.18, openBlend),
      0.16
    ];
    const b2 = [
      tieWorld[0] + lerp(-0.82, -0.48, openBlend),
      tieWorld[1] - lerp(0.34, 0.42, openBlend),
      -0.12
    ];
    const b3 = tieWorld;

    const mainCordPts = [];
    const halfSamples = 36;
    for (let i = 0; i <= halfSamples; i++) {
      mainCordPts.push(evalBezier3(a0, a1, a2, b0, i / halfSamples));
    }
    for (let i = 1; i <= halfSamples; i++) {
      mainCordPts.push(evalBezier3(b0, b1, b2, b3, i / halfSamples));
    }
    appendTubeSegment(acc, mainCordPts, cordRadius, 14, cordOutline, vC0, vC1, 32);

    return {
      positions: new Float32Array(acc.pos),
      normals: new Float32Array(acc.norm),
      smoothNormals: new Float32Array(acc.smoothNorm),
      uvs: new Float32Array(acc.uv),
      indices: new Uint32Array(acc.idx),
      outlinePositions: new Float32Array(acc.outPos),
      outlineNormals: new Float32Array(acc.outNorm),
      outlineIndices: new Uint32Array(acc.outIdx)
    };
  }

  // Transforma una malla completa por (pos, rotZ)
  function transformMeshZ(mesh, pos, rotZ) {
    const N = mesh.positions.length / 3;
    const out = {
      positions: new Float32Array(mesh.positions.length),
      normals: new Float32Array(mesh.normals.length),
      smoothNormals: new Float32Array(mesh.smoothNormals.length),
      uvs: new Float32Array(mesh.uvs),
      indices: new Uint32Array(mesh.indices),
      outlinePositions: new Float32Array(mesh.outlinePositions.length),
      outlineNormals: new Float32Array(mesh.outlineNormals.length),
      outlineIndices: new Uint32Array(mesh.outlineIndices)
    };
    const cz = Math.cos(rotZ), sz = Math.sin(rotZ);
    for (let i = 0; i < N; i++) {
      const id = i * 3;
      const px = mesh.positions[id], py = mesh.positions[id + 1], pz = mesh.positions[id + 2];
      out.positions[id]     = pos[0] + cz * px - sz * py;
      out.positions[id + 1] = pos[1] + sz * px + cz * py;
      out.positions[id + 2] = pos[2] + pz;

      const nx = mesh.normals[id], ny = mesh.normals[id + 1], nz = mesh.normals[id + 2];
      out.normals[id]     = cz * nx - sz * ny;
      out.normals[id + 1] = sz * nx + cz * ny;
      out.normals[id + 2] = nz;

      const snx = mesh.smoothNormals[id], sny = mesh.smoothNormals[id + 1], snz = mesh.smoothNormals[id + 2];
      out.smoothNormals[id]     = cz * snx - sz * sny;
      out.smoothNormals[id + 1] = sz * snx + cz * sny;
      out.smoothNormals[id + 2] = snz;

      const opx = mesh.outlinePositions[id], opy = mesh.outlinePositions[id + 1], opz = mesh.outlinePositions[id + 2];
      out.outlinePositions[id]     = pos[0] + cz * opx - sz * opy;
      out.outlinePositions[id + 1] = pos[1] + sz * opx + cz * opy;
      out.outlinePositions[id + 2] = pos[2] + opz;

      const onx = mesh.outlineNormals[id], ony = mesh.outlineNormals[id + 1], onz = mesh.outlineNormals[id + 2];
      out.outlineNormals[id]     = cz * onx - sz * ony;
      out.outlineNormals[id + 1] = sz * onx + cz * ony;
      out.outlineNormals[id + 2] = onz;
    }
    return out;
  }

  // Poses predefinidas listas para animación web
  function getPoseTransform(poseName) {
    if (poseName === "landed") {
      // Barril ensartado en la espiga del mango
      return {
        barrel: { pos: [0.0, 0.88, 0.0], rotZ: 0.0 },
        handle: { pos: [0.0, -0.05, 0.0], rotZ: 0.0 }
      };
    }
    if (poseName === "missed") {
      return {
        barrel: { pos: [0.65, 0.12, 0.0], rotZ: 25 * DEG },
        handle: { pos: [0.02, -0.05, 0.0], rotZ: 0.0 }
      };
    }
    if (poseName === "open") {
      // Pose de exhibición lado a lado (como Fotos 1 y 3): muestra de frente el hueco central y la punta negra
      return {
        barrel: { pos: [-0.82, 0.38, 0.0], rotZ: 22 * DEG },
        handle: { pos: [0.84, -0.05, 0.0], rotZ: -18 * DEG }
      };
    }
    // Pose por defecto ("showcase"): Barril en vuelo expresivo justo encima de la punta negra del mango,
    // dejando ver claramente tanto el hueco central inferior del barril como la punta negra del mango
    return {
      barrel: { pos: [-0.08, 1.18, 0.0], rotZ: 13 * DEG },
      handle: { pos: [0.08, -0.36, 0.0], rotZ: -5 * DEG }
    };
  }

  function createBaleroGeometry(options) {
    const opts = options || {};
    const outlineThickness = typeof opts.outlineThickness === "number" ? opts.outlineThickness : 0.028;
    const poseName = opts.pose || "showcase";
    const pose = getPoseTransform(poseName);

    const barrelLocal = createBarrelMesh(outlineThickness);
    const handleLocal = createHandleMesh(outlineThickness);

    const barrelWorld = transformMeshZ(barrelLocal, pose.barrel.pos, pose.barrel.rotZ);
    const handleWorld = transformMeshZ(handleLocal, pose.handle.pos, pose.handle.rotZ);
    const cordWorld = createCordMesh(pose.barrel, pose.handle, outlineThickness);

    return {
      barrelLocal,
      handleLocal,
      barrelWorld,
      handleWorld,
      cordWorld,
      pose,
      outlineThickness
    };
  }

  // ============================================================================
  // 3. EXPORTADOR BINARIO GLTF 2.0 (.GLB) CON NODOS SEPARADOS PARA ANIMACIÓN WEB
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

  /**
   * Exporta el archivo .glb con nodos separados y nombrados para animación web:
   * - Balero_Barril (con su origen local en el centro del barril)
   * - Balero_Mango (con su origen local en el tope del mango)
   * - Balero_Cordon (cordón trenzado conectando ambas piezas)
   * + sus mallas de contorno Toon correspondientes (KHR_materials_unlit).
   */
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

    function addPartAccessors(partMesh) {
      const posView = addBufferChunk(partMesh.positions, 34962);
      const normView = addBufferChunk(partMesh.normals, 34962);
      const uvView = addBufferChunk(partMesh.uvs, 34962);
      const idxView = addBufferChunk(partMesh.indices, 34963);
      const bounds = computeMinMax(partMesh.positions, 3);

      const posAcc = accessors.length;
      accessors.push({
        bufferView: posView,
        componentType: 5126,
        count: partMesh.positions.length / 3,
        type: "VEC3",
        min: bounds.min,
        max: bounds.max
      });
      const normAcc = accessors.length;
      accessors.push({
        bufferView: normView,
        componentType: 5126,
        count: partMesh.normals.length / 3,
        type: "VEC3"
      });
      const uvAcc = accessors.length;
      accessors.push({
        bufferView: uvView,
        componentType: 5126,
        count: partMesh.uvs.length / 2,
        type: "VEC2"
      });
      const idxAcc = accessors.length;
      accessors.push({
        bufferView: idxView,
        componentType: 5125,
        count: partMesh.indices.length,
        type: "SCALAR"
      });

      let outPosAcc = -1, outNormAcc = -1, outIdxAcc = -1;
      if (withOutline) {
        const oPosView = addBufferChunk(partMesh.outlinePositions, 34962);
        const oNormView = addBufferChunk(partMesh.outlineNormals, 34962);
        const oIdxView = addBufferChunk(partMesh.outlineIndices, 34963);
        const oBounds = computeMinMax(partMesh.outlinePositions, 3);

        outPosAcc = accessors.length;
        accessors.push({
          bufferView: oPosView,
          componentType: 5126,
          count: partMesh.outlinePositions.length / 3,
          type: "VEC3",
          min: oBounds.min,
          max: oBounds.max
        });
        outNormAcc = accessors.length;
        accessors.push({
          bufferView: oNormView,
          componentType: 5126,
          count: partMesh.outlineNormals.length / 3,
          type: "VEC3"
        });
        outIdxAcc = accessors.length;
        accessors.push({
          bufferView: oIdxView,
          componentType: 5125,
          count: partMesh.outlineIndices.length,
          type: "SCALAR"
        });
      }

      return { posAcc, normAcc, uvAcc, idxAcc, outPosAcc, outNormAcc, outIdxAcc };
    }

    const parts = [
      { name: "Balero_Barril", meshData: geometry.barrelWorld },
      { name: "Balero_Mango", meshData: geometry.handleWorld },
      { name: "Balero_Cordon", meshData: geometry.cordWorld }
    ];

    const meshes = [];
    const nodes = [{ name: "Balero_Mexicano_Root", children: [], translation: [0, 0, 0] }];

    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      const acc = addPartAccessors(p.meshData);
      const primitives = [{
        attributes: { POSITION: acc.posAcc, NORMAL: acc.normAcc, TEXCOORD_0: acc.uvAcc },
        indices: acc.idxAcc,
        material: 0
      }];
      if (withOutline) {
        primitives.push({
          attributes: { POSITION: acc.outPosAcc, NORMAL: acc.outNormAcc },
          indices: acc.outIdxAcc,
          material: 1
        });
      }
      const meshIdx = meshes.length;
      meshes.push({ name: p.name, primitives });
      const nodeIdx = nodes.length;
      nodes.push({ name: p.name, mesh: meshIdx });
      nodes[0].children.push(nodeIdx);
    }

    const pngView = addBufferChunk(pngBytes, undefined);

    const materials = [
      {
        name: "Balero_Barniz_HandPainted",
        pbrMetallicRoughness: {
          baseColorTexture: { index: 0 },
          metallicFactor: 0.0,
          roughnessFactor: 0.46
        },
        doubleSided: false
      }
    ];

    if (withOutline) {
      materials.push({
        name: "Tinta_Negra_ToonOutline",
        pbrMetallicRoughness: {
          baseColorFactor: [0.08, 0.048, 0.035, 1.0],
          metallicFactor: 0.0,
          roughnessFactor: 1.0
        },
        extensions: { KHR_materials_unlit: {} },
        doubleSided: false
      });
    }

    const gltf = {
      asset: {
        version: "2.0",
        generator: "Balero3D · La Mesa Cívica INE"
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
        name: "balero-atlas"
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
  // 4. VISOR E INTERACCIÓN WEBGL CEL-SHADED + ANIMACIÓN DE CAPIRUCHO / ENSARTAR
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

  function mat4FromTRS(tx, ty, tz, rotY, rotX, rotZ) {
    const cy = Math.cos(rotY), sy = Math.sin(rotY);
    const cx = Math.cos(rotX), sx = Math.sin(rotX);
    const cz = Math.cos(rotZ), sz = Math.sin(rotZ);

    const mY = mat4Identity();
    mY[0] = cy; mY[2] = -sy; mY[8] = sy; mY[10] = cy;

    const mX = mat4Identity();
    mX[5] = cx; mX[6] = sx; mX[9] = -sx; mX[10] = cx;

    const mZ = mat4Identity();
    mZ[0] = cz; mZ[1] = sz; mZ[4] = -sz; mZ[5] = cz;

    const rot = mat4Multiply(mY, mat4Multiply(mX, mZ));
    const tr = mat4Identity();
    tr[12] = tx; tr[13] = ty; tr[14] = tz;
    return mat4Multiply(tr, rot);
  }

  const VERT_SURFACE = `
    attribute vec3 aPos;
    attribute vec3 aNormal;
    attribute vec2 aUV;
    uniform mat4 uScene;
    uniform mat4 uPart;
    uniform mat4 uVP;
    varying vec3 vWorldPos;
    varying vec3 vNormal;
    varying vec2 vUV;
    void main() {
      mat4 M = uScene * uPart;
      vec4 wp = M * vec4(aPos, 1.0);
      vWorldPos = wp.xyz;
      vNormal = normalize(mat3(M) * aNormal);
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

      // Rampa cel-shaded cálida de 3 bandas ("Las Leyendas": La Llorona / Charro Negro)
      float band1 = smoothstep(-0.16, -0.05, ndl);
      float band2 = smoothstep(0.32, 0.42, ndl);

      vec3 shadowTint = vec3(0.64, 0.46, 0.36);
      vec3 midTint    = vec3(0.96, 0.89, 0.79);
      vec3 litTint    = vec3(1.10, 1.03, 0.93);

      vec3 shade = mix(shadowTint, midTint, band1);
      shade = mix(shade, litTint, band2);

      // Oclusión profunda dentro del hueco central (vUV.y entre 0.56 y 0.71)
      float isCavityInside = step(0.585, vUV.y) * step(vUV.y, 0.708);
      shade = mix(shade, vec3(0.36, 0.24, 0.18), isCavityInside * 0.65);

      // Rim light cálido dorado en siluetas
      float fresnel = 1.0 - max(dot(N, V), 0.0);
      float rimMask = smoothstep(0.65, 0.76, fresnel) * (1.0 - isCavityInside);
      vec3 rimColor = vec3(1.0, 0.82, 0.44) * rimMask * 0.26;

      // Acabado de barniz artesanal pintado a mano:
      // Intenso en el barril lacado (vUV.y < 0.55) y en la punta negra del mango,
      // satinado en la madera clara del mango y mate en el cordón de algodón (vUV.y > 0.89)
      float isGlossyBarrel = step(vUV.y, 0.55);
      float isCord = step(0.89, vUV.y);
      float varnishStrength = mix(0.11, 0.32, isGlossyBarrel) * (1.0 - isCord);

      float specRaw = pow(max(dot(N, H), 0.0), 38.0);
      float specSoft = smoothstep(0.22, 0.30, specRaw);
      float specSharp = smoothstep(0.58, 0.66, specRaw);
      vec3 specColor = vec3(1.0, 0.96, 0.85) * (specSoft * 0.45 + specSharp * 0.65) * varnishStrength;

      // Sutil línea de tinta en bordes rasantes
      float edgeInk = smoothstep(0.84, 0.95, fresnel);
      vec3 finalRGB = tex.rgb * shade + rimColor + specColor;
      finalRGB = mix(finalRGB, vec3(0.09, 0.05, 0.035), edgeInk * 0.26);

      gl_FragColor = vec4(finalRGB, 1.0);
    }
  `;

  const VERT_OUTLINE = `
    attribute vec3 aPos;
    attribute vec3 aSmoothNormal;
    uniform mat4 uScene;
    uniform mat4 uPart;
    uniform mat4 uVP;
    uniform float uOutlineScale;
    void main() {
      mat4 M = uScene * uPart;
      vec3 extruded = aPos + normalize(aSmoothNormal) * uOutlineScale;
      gl_Position = uVP * (M * vec4(extruded, 1.0));
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
      outlineWidth: 0.030,
      autoRotate: true,
      autoRotateSpeed: 0.42,
      pose: "showcase",
      resting: false,
      restingScale: 1,
      onPoseChange: null,
      onTrickComplete: null
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
    paintBaleroAtlas(ctx2d);

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

    const barrelMesh = createBarrelMesh(opts.outlineWidth);
    const handleMesh = createHandleMesh(opts.outlineWidth);

    function createPartGPU(mesh, dynamic) {
      const usage = dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW;
      const posBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
      gl.bufferData(gl.ARRAY_BUFFER, mesh.positions, usage);

      const normBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, normBuf);
      gl.bufferData(gl.ARRAY_BUFFER, mesh.normals, usage);

      const smoothNormBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, smoothNormBuf);
      gl.bufferData(gl.ARRAY_BUFFER, mesh.smoothNormals, usage);

      const uvBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
      gl.bufferData(gl.ARRAY_BUFFER, mesh.uvs, usage);

      const idxBuf = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, usage);

      return { posBuf, normBuf, smoothNormBuf, uvBuf, idxBuf, count: mesh.indices.length };
    }

    const initialPose = getPoseTransform(opts.pose);
    const initialCord = createCordMesh(initialPose.barrel, initialPose.handle, opts.outlineWidth);

    const barrelGPU = createPartGPU(barrelMesh, false);
    const handleGPU = createPartGPU(handleMesh, false);
    const cordGPU = createPartGPU(initialCord, true);

    function updateCordGPU(bPose, hPose) {
      const cordMesh = createCordMesh(bPose, hPose, state.outlineWidth);
      gl.bindBuffer(gl.ARRAY_BUFFER, cordGPU.posBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, cordMesh.positions);
      gl.bindBuffer(gl.ARRAY_BUFFER, cordGPU.normBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, cordMesh.normals);
      gl.bindBuffer(gl.ARRAY_BUFFER, cordGPU.smoothNormBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, cordMesh.smoothNormals);
    }

    const surfProg = createProgram(gl, VERT_SURFACE, FRAG_SURFACE);
    const outProg = createProgram(gl, VERT_OUTLINE, FRAG_OUTLINE);

    const surfLoc = {
      aPos: gl.getAttribLocation(surfProg, "aPos"),
      aNormal: gl.getAttribLocation(surfProg, "aNormal"),
      aUV: gl.getAttribLocation(surfProg, "aUV"),
      uScene: gl.getUniformLocation(surfProg, "uScene"),
      uPart: gl.getUniformLocation(surfProg, "uPart"),
      uVP: gl.getUniformLocation(surfProg, "uVP"),
      uAtlas: gl.getUniformLocation(surfProg, "uAtlas"),
      uCameraPos: gl.getUniformLocation(surfProg, "uCameraPos"),
      uKeyLight: gl.getUniformLocation(surfProg, "uKeyLight")
    };

    const outLoc = {
      aPos: gl.getAttribLocation(outProg, "aPos"),
      aSmoothNormal: gl.getAttribLocation(outProg, "aSmoothNormal"),
      uScene: gl.getUniformLocation(outProg, "uScene"),
      uPart: gl.getUniformLocation(outProg, "uPart"),
      uVP: gl.getUniformLocation(outProg, "uVP"),
      uOutlineScale: gl.getUniformLocation(outProg, "uOutlineScale"),
      uInkColor: gl.getUniformLocation(outProg, "uInkColor")
    };

    const state = {
      rotY: 0.25,
      pitchX: 10 * DEG,
      restingRoll: opts.resting ? -78 * DEG : 0,
      velY: 0,
      autoRotate: !!opts.autoRotate,
      outlineWidth: opts.outlineWidth,
      poseName: opts.pose,
      barrelPose: { pos: initialPose.barrel.pos.slice(), rotZ: initialPose.barrel.rotZ, spinY: 0 },
      handlePose: { pos: initialPose.handle.pos.slice(), rotZ: initialPose.handle.rotZ },
      trickActive: false,
      trickStartTime: 0,
      trickDuration: 1950,
      trickSuccess: true,
      poseTransition: false,
      transStartTime: 0,
      transDuration: 520,
      fromPose: null,
      toPose: null,
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

    // Evalúa la trayectoria animada de "¡Ensartar el balero!" (Capirucho)
    function evaluateTrickPose(t) {
      // Fase 1 (0.00 .. 0.28): El mango da un pulso hacia abajo y el barril cuelga y toma vuelo
      // Fase 2 (0.28 .. 0.76): El barril sube en parábola girando sobre sí mismo
      // Fase 3 (0.76 .. 1.00): El hueco central encaja en la punta negra con asentamiento elástico
      if (t < 0.28) {
        const u = smoothstep(0, 1, t / 0.28);
        return {
          barrel: {
            pos: [lerp(-0.15, -0.82, u), lerp(1.05, -0.55, u), 0],
            rotZ: lerp(12 * DEG, 145 * DEG, u),
            spinY: u * 1.5
          },
          handle: {
            pos: [lerp(0.05, 0.18, u), lerp(-0.25, -0.42, u), 0],
            rotZ: lerp(-4 * DEG, -16 * DEG, u)
          }
        };
      }
      if (t < 0.78) {
        const u = (t - 0.28) / 0.50;
        const arc = Math.sin(u * Math.PI);
        const ease = smoothstep(0, 1, u);
        return {
          barrel: {
            pos: [
              lerp(-0.82, 0.0, ease) - arc * 0.45,
              lerp(-0.55, 1.32, ease) + arc * 0.48,
              0
            ],
            rotZ: lerp(145 * DEG, 360 * DEG, ease),
            spinY: 1.5 + ease * TAU * 2
          },
          handle: {
            pos: [lerp(0.18, 0.0, ease), lerp(-0.42, -0.05, ease), 0],
            rotZ: lerp(-16 * DEG, 0, ease)
          }
        };
      }
      if (!state.trickSuccess) {
        const u = smoothstep(0, 1, (t - 0.78) / 0.22);
        return {
          barrel: { pos: [lerp(0, 0.65, u), lerp(1.32, 0.12, u), 0], rotZ: lerp(TAU, TAU + 25 * DEG, u), spinY: (1 - u) * (1.5 + TAU * 2) },
          handle: { pos: [lerp(0, 0.02, u), -0.05, 0], rotZ: 0 }
        };
      }
      const u = (t - 0.78) / 0.22;
      const drop = 1 - Math.pow(1 - Math.min(1, u * 1.4), 3);
      const bounce = Math.sin(u * Math.PI * 2.5) * Math.exp(-u * 5) * 0.06;
      return {
        barrel: {
          pos: [0.0, lerp(1.32, 0.88, drop) + bounce, 0],
          rotZ: bounce * 0.4,
          spinY: 0
        },
        handle: {
          pos: [0.0, -0.05 - bounce * 0.4, 0],
          rotZ: 0
        }
      };
    }

    function drawPartPass(gpu, partMat, isOutline, outlineScale) {
      if (isOutline) {
        gl.bindBuffer(gl.ARRAY_BUFFER, gpu.posBuf);
        gl.enableVertexAttribArray(outLoc.aPos);
        gl.vertexAttribPointer(outLoc.aPos, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, gpu.smoothNormBuf);
        gl.enableVertexAttribArray(outLoc.aSmoothNormal);
        gl.vertexAttribPointer(outLoc.aSmoothNormal, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gpu.idxBuf);
        gl.uniformMatrix4fv(outLoc.uPart, false, partMat);
        gl.uniform1f(outLoc.uOutlineScale, outlineScale);
        gl.drawElements(gl.TRIANGLES, gpu.count, gl.UNSIGNED_INT, 0);
      } else {
        gl.bindBuffer(gl.ARRAY_BUFFER, gpu.posBuf);
        gl.enableVertexAttribArray(surfLoc.aPos);
        gl.vertexAttribPointer(surfLoc.aPos, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, gpu.normBuf);
        gl.enableVertexAttribArray(surfLoc.aNormal);
        gl.vertexAttribPointer(surfLoc.aNormal, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, gpu.uvBuf);
        gl.enableVertexAttribArray(surfLoc.aUV);
        gl.vertexAttribPointer(surfLoc.aUV, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gpu.idxBuf);
        gl.uniformMatrix4fv(surfLoc.uPart, false, partMat);
        gl.drawElements(gl.TRIANGLES, gpu.count, gl.UNSIGNED_INT, 0);
      }
    }

    function render(now) {
      if (state.destroyed || state.paused) return;
      const dt = Math.min(0.05, Math.max(0.001, (now - state.lastFrameTime) / 1000));
      state.lastFrameTime = now;

      let cordNeedsUpdate = false;

      if (state.trickActive) {
        const t = clamp((now - state.trickStartTime) / state.trickDuration, 0, 1);
        const p = evaluateTrickPose(t);
        state.barrelPose.pos = p.barrel.pos;
        state.barrelPose.rotZ = p.barrel.rotZ;
        state.barrelPose.spinY = p.barrel.spinY || 0;
        state.handlePose.pos = p.handle.pos;
        state.handlePose.rotZ = p.handle.rotZ;
        cordNeedsUpdate = true;

        if (t >= 1) {
          state.trickActive = false;
          state.poseName = state.trickSuccess ? "landed" : "missed";
          if (typeof opts.onPoseChange === "function") opts.onPoseChange(state.poseName);
          if (typeof opts.onTrickComplete === "function") opts.onTrickComplete(state.trickSuccess);
        }
      } else if (state.poseTransition) {
        const t = smoothstep(0, 1, (now - state.transStartTime) / state.transDuration);
        for (let c = 0; c < 3; c++) {
          state.barrelPose.pos[c] = lerp(state.fromPose.barrel.pos[c], state.toPose.barrel.pos[c], t);
          state.handlePose.pos[c] = lerp(state.fromPose.handle.pos[c], state.toPose.handle.pos[c], t);
        }
        state.barrelPose.rotZ = lerp(state.fromPose.barrel.rotZ, state.toPose.barrel.rotZ, t);
        state.handlePose.rotZ = lerp(state.fromPose.handle.rotZ, state.toPose.handle.rotZ, t);
        state.barrelPose.spinY = 0;
        cordNeedsUpdate = true;
        if (t >= 1) state.poseTransition = false;
      }

      if (cordNeedsUpdate) {
        updateCordGPU(state.barrelPose, state.handlePose);
      }

      if (!state.dragging) {
        if (Math.abs(state.velY) > 0.005) {
          state.rotY += state.velY * dt;
          state.velY *= Math.pow(0.22, dt);
          if (Math.abs(state.velY) <= 0.005) state.velY = 0;
        } else if (state.autoRotate) {
          state.rotY += opts.autoRotateSpeed * dt;
        }
      }

      resize();
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.CULL_FACE);

      const aspect = canvas.width / Math.max(1, canvas.height);
      const baseFov = aspect < 0.85 ? 44 * DEG : 36 * DEG;
      const restingScale = state.restingRoll ? Math.max(0.1, Number(opts.restingScale) || 1) : 1;
      const fov = 2 * Math.atan(Math.tan(baseFov / 2) / restingScale);
      const eye = [0, 0.15, 7.65];
      const proj = mat4Perspective(fov, aspect, 0.5, 25.0);
      const view = mat4LookAt(eye, [0, 0.08, 0], [0, 1, 0]);
      const vp = mat4Multiply(proj, view);

      const sceneMat = mat4FromTRS(0, 0, 0, state.rotY, state.pitchX, state.restingRoll);
      const barrelMat = mat4FromTRS(
        state.barrelPose.pos[0], state.barrelPose.pos[1], state.barrelPose.pos[2],
        state.barrelPose.spinY || 0, 0, state.barrelPose.rotZ
      );
      const handleMat = mat4FromTRS(
        state.handlePose.pos[0], state.handlePose.pos[1], state.handlePose.pos[2],
        0, 0, state.handlePose.rotZ
      );
      const cordMat = mat4Identity();

      // PASADA 1: Contorno de tinta negra (Toon Outline)
      if (state.outlineWidth > 0.0005) {
        gl.useProgram(outProg);
        gl.cullFace(gl.FRONT);
        gl.uniformMatrix4fv(outLoc.uScene, false, sceneMat);
        gl.uniformMatrix4fv(outLoc.uVP, false, vp);
        gl.uniform3f(outLoc.uInkColor, 0.082, 0.051, 0.039);

        drawPartPass(barrelGPU, barrelMat, true, state.outlineWidth);
        drawPartPass(handleGPU, handleMat, true, state.outlineWidth * 0.86);
        drawPartPass(cordGPU, cordMat, true, state.outlineWidth * 0.65);
      }

      // PASADA 2: Superficie Cel-Shaded con Acabado de Barniz Hand-Painted
      gl.useProgram(surfProg);
      gl.cullFace(gl.BACK);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(surfLoc.uAtlas, 0);
      gl.uniformMatrix4fv(surfLoc.uScene, false, sceneMat);
      gl.uniformMatrix4fv(surfLoc.uVP, false, vp);
      gl.uniform3f(surfLoc.uCameraPos, eye[0], eye[1], eye[2]);
      gl.uniform3f(surfLoc.uKeyLight, 2.3, 3.2, 3.5);

      drawPartPass(barrelGPU, barrelMat, false, 0);
      drawPartPass(handleGPU, handleMat, false, 0);
      drawPartPass(cordGPU, cordMat, false, 0);

      state.rafId = requestAnimationFrame(render);
    }

    function onPointerDown(e) {
      state.dragging = true;
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
      const dt = Math.max(0.004, (now - state.lastMoveTime) / 1000);

      const deltaY = dx * 0.011;
      state.rotY += deltaY;
      state.pitchX = clamp(state.pitchX + dy * 0.006, -34 * DEG, 42 * DEG);
      state.velY = clamp(deltaY / dt, -16, 16);

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
    }

    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    state.rafId = requestAnimationFrame(render);

    function setPose(poseName, instant = false) {
      const target = getPoseTransform(poseName);
      state.trickActive = false;
      if (instant) {
        state.poseTransition = false;
        state.barrelPose = { pos: target.barrel.pos.slice(), rotZ: target.barrel.rotZ, spinY: 0 };
        state.handlePose = { pos: target.handle.pos.slice(), rotZ: target.handle.rotZ };
        state.poseName = poseName;
        updateCordGPU(state.barrelPose, state.handlePose);
        if (typeof opts.onPoseChange === "function") opts.onPoseChange(poseName);
        return;
      }
      state.fromPose = {
        barrel: { pos: state.barrelPose.pos.slice(), rotZ: state.barrelPose.rotZ },
        handle: { pos: state.handlePose.pos.slice(), rotZ: state.handlePose.rotZ }
      };
      state.toPose = target;
      state.transStartTime = performance.now();
      state.poseTransition = true;
      state.poseName = poseName;
      if (typeof opts.onPoseChange === "function") opts.onPoseChange(poseName);
    }

    function playCapirucho(instant = false) {
      state.poseTransition = false;
      state.trickStartTime = performance.now();
      state.trickDuration = instant ? 1 : 1950;
      state.trickSuccess = true;
      state.trickActive = true;
    }

    function playMiss(instant = false) {
      state.poseTransition = false;
      state.trickStartTime = performance.now();
      state.trickDuration = instant ? 1 : 1950;
      state.trickSuccess = false;
      state.trickActive = true;
    }

    async function exportGLB(includeOutline) {
      const blob = await new Promise(resolve => atlasCanvas.toBlob(resolve, "image/png"));
      const pngBytes = new Uint8Array(await blob.arrayBuffer());
      const currentGeo = createBaleroGeometry({
        outlineThickness: state.outlineWidth,
        pose: state.poseName
      });
      const glbBytes = buildGLBBuffer(currentGeo, pngBytes, includeOutline);
      return new Blob([glbBytes], { type: "model/gltf-binary" });
    }

    function setPaused(paused) {
      if (state.destroyed || state.paused === !!paused) return;
      state.paused = !!paused;
      if (state.paused) { cancelAnimationFrame(state.rafId); state.rafId = 0; }
      else { state.lastFrameTime = performance.now(); state.rafId = requestAnimationFrame(render); }
    }

    function setResting(resting) {
      state.restingRoll = resting ? -78 * DEG : 0;
      state.pitchX = 10 * DEG;
      state.velY = 0;
    }

    function setAutoRotate(enabled) {
      state.autoRotate = !!enabled;
    }

    function setOutlineWidth(w) {
      state.outlineWidth = clamp(Number(w) || 0, 0, 0.08);
    }

    function resetCamera() {
      state.pitchX = 10 * DEG;
      state.rotY = 0.25;
      state.velY = 0;
    }

    function destroy() {
      if (state.destroyed) return;
      state.destroyed = true;
      cancelAnimationFrame(state.rafId);
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      for (const part of [barrelGPU, handleGPU, cordGPU]) {
        for (const buffer of [part.posBuf, part.normBuf, part.smoothNormBuf, part.uvBuf, part.idxBuf]) gl.deleteBuffer(buffer);
      }
      gl.deleteTexture(tex);
      gl.deleteProgram(surfProg);
      gl.deleteProgram(outProg);
    }

    return {
      playCapirucho,
      playMiss,
      setPose,
      setPaused,
      setResting,
      exportGLB,
      setAutoRotate,
      setOutlineWidth,
      resetCamera,
      atlasCanvas,
      destroy
    };
  }

  return {
    PALETTE,
    ATLAS_LAYOUT,
    paintBaleroAtlas,
    createBaleroGeometry,
    buildGLBBuffer,
    createViewer
  };
});
