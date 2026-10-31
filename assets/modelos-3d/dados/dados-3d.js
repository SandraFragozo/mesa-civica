/**
 * Dados3D — Modelo 3D estilizado de un par de dados mexicanos clásicos de esquinas redondeadas
 * Estética de dibujo animado mexicano estilo "Las Leyendas", sombreado cel-shaded cálido 2D/3D,
 * contornos gruesos de tinta negra (inked toon shader), color blanco hueso / marfil cálido con
 * desgaste artesanal en bordes y puntos circulares (1 al 6) ligeramente hundidos en negro carbón.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.Dados3D = factory();
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

  const PALETTE = {
    ivoryBright: "#FCF8EE",
    ivoryBase: "#F6EDD8",
    ivoryWarm: "#EADAB8",
    edgeWear: "#DEC69A",
    edgeChip: "#CCA974",
    charcoalCore: "#14100E",
    charcoalMid: "#241D1A",
    charcoalRim: "#3C312B",
    ink: "#140C08"
  };

  // Coordenadas normalizadas en [-1, +1]^2 de los puntos (pips) para las 6 caras (1 a 6)
  const PIP_OFFSET = 0.465;
  const PIP_LAYOUTS = {
    1: [[0, 0]],
    2: [[-PIP_OFFSET, -PIP_OFFSET], [PIP_OFFSET, PIP_OFFSET]],
    3: [[-PIP_OFFSET, -PIP_OFFSET], [0, 0], [PIP_OFFSET, PIP_OFFSET]],
    4: [
      [-PIP_OFFSET, -PIP_OFFSET], [PIP_OFFSET, -PIP_OFFSET],
      [-PIP_OFFSET,  PIP_OFFSET], [PIP_OFFSET,  PIP_OFFSET]
    ],
    5: [
      [-PIP_OFFSET, -PIP_OFFSET], [PIP_OFFSET, -PIP_OFFSET],
      [0, 0],
      [-PIP_OFFSET,  PIP_OFFSET], [PIP_OFFSET,  PIP_OFFSET]
    ],
    6: [
      [-PIP_OFFSET, -PIP_OFFSET], [PIP_OFFSET, -PIP_OFFSET],
      [-PIP_OFFSET,  0],          [PIP_OFFSET,  0],
      [-PIP_OFFSET,  PIP_OFFSET], [PIP_OFFSET,  PIP_OFFSET]
    ]
  };

  // ============================================================================
  // 1. ATLAS DE TEXTURAS HAND-PAINTED (2048 x 2048)
  // ============================================================================
  // 6 celdas cuadradas de 682x682 en las 2 primeras filas (caras 1 a 6)
  // + franja inferior de marfil cálido para biseles/esquinas compartidas
  const ATLAS_LAYOUT = {
    size: 2048,
    cellW: 682,
    cellH: 682,
    pad: 56
  };

  // Fracción plana de cada cara antes del inicio del bisel redondeado
  const FLAT_ALPHA = 0.74;

  function drawRoundedRectPath(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w * 0.5, h * 0.5);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x + rr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.closePath();
  }

  function paintDieFaceCell(ctx, faceNumber) {
    const idx = faceNumber - 1;
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const x0 = col * ATLAS_LAYOUT.cellW;
    const y0 = row * ATLAS_LAYOUT.cellH;
    const w = ATLAS_LAYOUT.cellW;
    const h = ATLAS_LAYOUT.cellH;
    const rng = mulberry32(1000 + faceNumber * 409);

    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, y0, w, h);
    ctx.clip();

    // 1. Fondo continuo blanco hueso / marfil cálido en toda la celda (incluyendo bisel redondeado)
    const baseGrad = ctx.createLinearGradient(x0, y0, x0 + w, y0 + h);
    baseGrad.addColorStop(0.0, PALETTE.ivoryBright);
    baseGrad.addColorStop(0.55, PALETTE.ivoryBase);
    baseGrad.addColorStop(1.0, PALETTE.ivoryWarm);
    ctx.fillStyle = baseGrad;
    ctx.fillRect(x0, y0, w, h);

    const innerX = x0 + ATLAS_LAYOUT.pad;
    const innerY = y0 + ATLAS_LAYOUT.pad;
    const innerW = w - ATLAS_LAYOUT.pad * 2;
    const innerH = h - ATLAS_LAYOUT.pad * 2;
    const cx = innerX + innerW * 0.5;
    const cy = innerY + innerH * 0.5;

    // Caja de la cara plana (|u| <= FLAT_ALPHA)
    const flatMargin = ((1 - FLAT_ALPHA) * 0.5) * innerW;
    const fx = innerX + flatMargin;
    const fy = innerY + flatMargin;
    const fw = innerW - flatMargin * 2;
    const fh = innerH - flatMargin * 2;

    // 2. Luz suave de hueso pulido en el plano central de la cara
    const faceGrad = ctx.createLinearGradient(fx, fy, fx + fw, fy + fh);
    faceGrad.addColorStop(0.0, "#FFFDF7");
    faceGrad.addColorStop(0.60, PALETTE.ivoryBright);
    faceGrad.addColorStop(1.0, PALETTE.ivoryBase);
    drawRoundedRectPath(ctx, fx - 18, fy - 18, fw + 36, fh + 36, 72);
    ctx.fillStyle = faceGrad;
    ctx.fill();

    // Pinceladas pictóricas sutiles de gouache cálido y textura de hueso tallado
    for (let i = 0; i < 26; i++) {
      const bx = innerX + rng() * innerW;
      const by = innerY + rng() * innerH;
      const rx = 20 + rng() * 58;
      const ry = 12 + rng() * 34;
      const rot = (rng() - 0.5) * Math.PI;
      ctx.fillStyle = i % 2 === 0 ? "#FFFDF8" : "#EAD8B6";
      ctx.globalAlpha = 0.13 + rng() * 0.08;
      ctx.beginPath();
      ctx.ellipse(bx, by, rx, ry, rot, 0, TAU);
      ctx.fill();
    }

    // Finas vetas orgánicas de marfil / hueso muy suaves
    for (let i = 0; i < 8; i++) {
      const sy = fy + rng() * fh;
      ctx.strokeStyle = i % 2 === 0 ? "#E3CEAA" : "#FFFDF9";
      ctx.globalAlpha = 0.18;
      ctx.lineWidth = 1.4 + rng() * 2.0;
      ctx.beginPath();
      ctx.moveTo(innerX + 16, sy);
      ctx.quadraticCurveTo(cx, sy + (rng() - 0.5) * 24, innerX + innerW - 16, sy + (rng() - 0.5) * 12);
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;

    // 3. Ligero desgaste artesanal pintado a mano en los bordes y esquinas exteriores (|u| -> 1)
    ctx.strokeStyle = PALETTE.edgeWear;
    ctx.lineWidth = 22;
    ctx.globalAlpha = 0.45;
    drawRoundedRectPath(ctx, innerX + 6, innerY + 6, innerW - 12, innerH - 12, 36);
    ctx.stroke();

    for (let i = 0; i < 42; i++) {
      const side = i % 4;
      const t = 0.06 + rng() * 0.88;
      let wx, wy, wrx, wry;
      if (side === 0) { wx = innerX + t * innerW; wy = innerY + (rng() - 0.3) * 14; wrx = 10 + rng() * 20; wry = 4 + rng() * 7; }
      else if (side === 1) { wx = innerX + t * innerW; wy = innerY + innerH - (rng() - 0.3) * 14; wrx = 10 + rng() * 20; wry = 4 + rng() * 7; }
      else if (side === 2) { wx = innerX + (rng() - 0.3) * 14; wy = innerY + t * innerH; wrx = 4 + rng() * 7; wry = 10 + rng() * 20; }
      else { wx = innerX + innerW - (rng() - 0.3) * 14; wy = innerY + t * innerH; wrx = 4 + rng() * 7; wry = 10 + rng() * 20; }

      ctx.fillStyle = i % 3 === 0 ? "#FFFDF8" : PALETTE.edgeChip;
      ctx.globalAlpha = 0.34;
      ctx.beginPath();
      ctx.ellipse(wx, wy, wrx, wry, 0, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // 4. Filete luminoso sutil en la transición del bisel + línea de tinta toon en las 12 aristas exteriores
    drawRoundedRectPath(ctx, fx, fy, fw, fh, 54);
    ctx.strokeStyle = "#FFFDF9";
    ctx.globalAlpha = 0.65;
    ctx.lineWidth = 4.5;
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    // Trazo de tinta negra toon justo en la costura exterior de las 12 aristas del dado (innerX..innerW)
    drawRoundedRectPath(ctx, innerX, innerY, innerW, innerH, 24);
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 8.5;
    ctx.stroke();

    // 5. Puntos circulares (del 1 al 6) ligeramente hundidos y pintados a mano en negro carbón profundo
    const pips = PIP_LAYOUTS[faceNumber] || PIP_LAYOUTS[1];
    // El punto central del 1 es tradicionalmente un poquito más grande y expresivo
    const pipRadiusNorm = faceNumber === 1 ? 0.190 : 0.158;
    const pipRadiusPx = pipRadiusNorm * (innerW * 0.5);

    for (let p = 0; p < pips.length; p++) {
      const [pu, pv] = pips[p];
      const px = cx + pu * (innerW * 0.5);
      const py = cy + pv * (innerH * 0.5);

      // a) Sombreado de la cuenca cóncava hundida en el marfil (sombra cálida arriba-izq, luz abajo-der)
      ctx.beginPath();
      ctx.arc(px - 2.6, py - 2.6, pipRadiusPx * 1.11, 0, TAU);
      ctx.fillStyle = "#D4BA8E";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(px + 2.8, py + 2.8, pipRadiusPx * 1.10, 0, TAU);
      ctx.fillStyle = "#FFFDF7";
      ctx.fill();

      // b) Base del punto pintado a mano en negro carbón profundo
      const pipGrad = ctx.createLinearGradient(px - pipRadiusPx, py - pipRadiusPx, px + pipRadiusPx, py + pipRadiusPx);
      pipGrad.addColorStop(0.0, "#0C0908");
      pipGrad.addColorStop(0.58, PALETTE.charcoalCore);
      pipGrad.addColorStop(1.0, PALETTE.charcoalMid);

      ctx.beginPath();
      ctx.arc(px, py, pipRadiusPx, 0, TAU);
      ctx.fillStyle = pipGrad;
      ctx.fill();

      // c) Anillo de tinta negra profunda en el borde de la cuenca
      ctx.lineWidth = 4.0;
      ctx.strokeStyle = "#080504";
      ctx.stroke();

      // d) Media luna de reflejo cálido interno (como en las imágenes de referencia 2 y 3)
      ctx.beginPath();
      ctx.arc(px, py, pipRadiusPx * 0.75, 0.18 * Math.PI, 0.78 * Math.PI);
      ctx.strokeStyle = "#55473E";
      ctx.lineWidth = pipRadiusPx * 0.16;
      ctx.lineCap = "round";
      ctx.stroke();

      // Chispa especular cartoon pintada a pincel
      ctx.beginPath();
      ctx.ellipse(
        px - pipRadiusPx * 0.34,
        py - pipRadiusPx * 0.34,
        pipRadiusPx * 0.20,
        pipRadiusPx * 0.11,
        -0.65,
        0,
        TAU
      );
      ctx.fillStyle = "#6E5D52";
      ctx.fill();
    }

    ctx.restore();
  }

  function paintDadosAtlas(ctx) {
    const S = ATLAS_LAYOUT.size;
    ctx.fillStyle = PALETTE.ivoryWarm;
    ctx.fillRect(0, 0, S, S);

    for (let f = 1; f <= 6; f++) {
      paintDieFaceCell(ctx, f);
    }
  }

  // ============================================================================
  // 2. GEOMETRÍA 3D DE DADOS REDONDEADOS CON PUNTOS HUNDIDOS Y SILUETA EXPRESIVA
  // ============================================================================
  // Definición de las 6 caras de un dado estándar (caras opuestas suman 7):
  // +Z: 1, -Z: 6, +Y: 2, -Y: 5, +X: 3, -X: 4
  const CUBE_FACES = [
    { faceNum: 1, normal: [ 0,  0,  1], right: [ 1,  0,  0], up: [ 0,  1,  0] }, // +Z
    { faceNum: 2, normal: [ 0,  1,  0], right: [ 1,  0,  0], up: [ 0,  0, -1] }, // +Y
    { faceNum: 3, normal: [ 1,  0,  0], right: [ 0,  0, -1], up: [ 0,  1,  0] }, // +X
    { faceNum: 4, normal: [-1,  0,  0], right: [ 0,  0,  1], up: [ 0,  1,  0] }, // -X
    { faceNum: 5, normal: [ 0, -1,  0], right: [ 1,  0,  0], up: [ 0,  0,  1] }, // -Y
    { faceNum: 6, normal: [ 0,  0, -1], right: [-1,  0,  0], up: [ 0,  1,  0] }  // -Z
  ];

  // Evalúa la posición 3D, normal de iluminación y normal suave de contorno para un punto (u, v) en [-1, 1]^2
  // sobre la cara `faceDef`, incluyendo esquinas redondeadas, puntos cóncavos hundidos y asimetría cartoon
  function evaluateDieSurfacePoint(faceDef, u, v, variantSeed) {
    const N = faceDef.normal;
    const R = faceDef.right;
    const U = faceDef.up;

    // Punto en el cubo unitario [-1, +1]^3 (ojo: v en UV crece hacia abajo, por lo que worldUp usa -v)
    const ux = N[0] + R[0] * u - U[0] * v;
    const uy = N[1] + R[1] * u - U[1] * v;
    const uz = N[2] + R[2] * u - U[2] * v;

    // Caja núcleo [-FLAT_ALPHA, +FLAT_ALPHA]^3 y vector hacia la esquina/borde redondeado
    const cx = clamp(ux, -FLAT_ALPHA, FLAT_ALPHA);
    const cy = clamp(uy, -FLAT_ALPHA, FLAT_ALPHA);
    const cz = clamp(uz, -FLAT_ALPHA, FLAT_ALPHA);

    let dx = ux - cx, dy = uy - cy, dz = uz - cz;
    const dLen = Math.hypot(dx, dy, dz) || 1;
    const rnx = dx / dLen, rny = dy / dLen, rnz = dz / dLen;

    // Radio del núcleo plano B y radio de esquina redondeada Rb (B + Rb = 0.765)
    const B = 0.57;
    const Rb = 0.195;
    const scaleCore = B / FLAT_ALPHA;

    let px = cx * scaleCore + rnx * Rb;
    let py = cy * scaleCore + rny * Rb;
    let pz = cz * scaleCore + rnz * Rb;

    let nx = rnx, ny = rny, nz = rnz;

    // Hundimiento cóncavo 3D real de los puntos circulares (del 1 al 6)
    const pips = PIP_LAYOUTS[faceDef.faceNum];
    const pipRad = faceDef.faceNum === 1 ? 0.190 : 0.158;
    const pipDepth = 0.048;

    for (let i = 0; i < pips.length; i++) {
      const du = u - pips[i][0];
      const dv = v - pips[i][1];
      const dist = Math.hypot(du, dv);
      if (dist < pipRad) {
        const q = dist / pipRad;
        const falloff = (1 - q * q) * (1 - q * q);
        const indent = pipDepth * falloff;
        px -= N[0] * indent;
        py -= N[1] * indent;
        pz -= N[2] * indent;

        // Inclinación suave de la normal dentro de la cavidad cóncava del punto
        const slope = (4 * pipDepth * q * (1 - q * q)) / pipRad;
        const dirU = dist > 1e-5 ? du / dist : 0;
        const dirV = dist > 1e-5 ? dv / dist : 0;
        nx += (R[0] * dirU - U[0] * dirV) * slope * 0.85;
        ny += (R[1] * dirU - U[1] * dirV) * slope * 0.85;
        nz += (R[2] * dirU - U[2] * dirV) * slope * 0.85;
        const nl = Math.hypot(nx, ny, nz) || 1;
        nx /= nl; ny /= nl; nz /= nl;
        break;
      }
    }

    // Silueta caricaturizada ligeramente asimétrica (estilo prop artesanal "Las Leyendas")
    const s = variantSeed === 1 ? 1 : -1;
    const taperY = 1.0 + 0.036 * py * s;
    const skewX = 0.024 * py * s;
    const bulge = 1.0 + 0.018 * Math.sin(px * 2.1 + s) * Math.cos(pz * 2.1);

    px = (px * taperY + skewX) * bulge;
    py = py * (1.0 - 0.015 * s) * bulge;
    pz = pz * (1.0 + 0.025 * px * s) * bulge;

    return {
      pos: [px, py, pz],
      norm: [nx, ny, nz],
      smoothNorm: [rnx, rny, rnz]
    };
  }

  function createSingleDieMesh(variantSeed, outlineThickness) {
    const G = 26; // 26x26 quads por cara = 6,760 tris por dado (ligero y nítido)
    const posArr = [];
    const normArr = [];
    const smoothNormArr = [];
    const uvArr = [];
    const indices = [];

    const outPosArr = [];
    const outNormArr = [];
    const outIndices = [];

    for (let f = 0; f < 6; f++) {
      const faceDef = CUBE_FACES[f];
      const cellCol = f % 3;
      const cellRow = Math.floor(f / 3);
      const uMin = (cellCol * ATLAS_LAYOUT.cellW + ATLAS_LAYOUT.pad) / ATLAS_LAYOUT.size;
      const uMax = ((cellCol + 1) * ATLAS_LAYOUT.cellW - ATLAS_LAYOUT.pad) / ATLAS_LAYOUT.size;
      const vMin = (cellRow * ATLAS_LAYOUT.cellH + ATLAS_LAYOUT.pad) / ATLAS_LAYOUT.size;
      const vMax = ((cellRow + 1) * ATLAS_LAYOUT.cellH - ATLAS_LAYOUT.pad) / ATLAS_LAYOUT.size;

      const baseVert = posArr.length / 3;
      const stride = G + 1;

      for (let iy = 0; iy <= G; iy++) {
        const ty = iy / G;
        const vLocal = ty * 2 - 1; // -1 arriba, +1 abajo
        const vTex = lerp(vMin, vMax, ty);

        for (let ix = 0; ix <= G; ix++) {
          const tx = ix / G;
          const uLocal = tx * 2 - 1; // -1 izq, +1 der
          const uTex = lerp(uMin, uMax, tx);

          const pt = evaluateDieSurfacePoint(faceDef, uLocal, vLocal, variantSeed);
          const [px, py, pz] = pt.pos;
          const [nx, ny, nz] = pt.norm;
          const [snx, sny, snz] = pt.smoothNorm;

          posArr.push(px, py, pz);
          normArr.push(nx, ny, nz);
          smoothNormArr.push(snx, sny, snz);
          uvArr.push(uTex, vTex);

          outPosArr.push(
            px + snx * outlineThickness,
            py + sny * outlineThickness,
            pz + snz * outlineThickness
          );
          outNormArr.push(-snx, -sny, -snz);
        }
      }

      for (let iy = 0; iy < G; iy++) {
        for (let ix = 0; ix < G; ix++) {
          const i00 = baseVert + iy * stride + ix;
          const i10 = baseVert + iy * stride + ix + 1;
          const i01 = baseVert + (iy + 1) * stride + ix;
          const i11 = baseVert + (iy + 1) * stride + ix + 1;

          // Con right (+u) hacia la derecha y down (+v) hacia abajo, CCW visto desde afuera es:
          // (i00, i01, i11) y (i00, i11, i10)
          indices.push(i00, i01, i11, i00, i11, i10);
          outIndices.push(i00, i11, i01, i00, i10, i11);
        }
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

  // Rotación Euler YXZ de un vector 3D
  function rotateVec3YXZ(v, rx, ry, rz) {
    const cx = Math.cos(rx), sx = Math.sin(rx);
    const cy = Math.cos(ry), sy = Math.sin(ry);
    const cz = Math.cos(rz), sz = Math.sin(rz);

    // 1. Z
    const x1 = cz * v[0] - sz * v[1];
    const y1 = sz * v[0] + cz * v[1];
    const z1 = v[2];
    // 2. X
    const x2 = x1;
    const y2 = cx * y1 - sx * z1;
    const z2 = sx * y1 + cx * z1;
    // 3. Y
    return [
      cy * x2 + sy * z2,
      y2,
      -sy * x2 + cy * z2
    ];
  }

  function transformDieMesh(mesh, pos, rot) {
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

    const [rx, ry, rz] = rot;
    for (let i = 0; i < N; i++) {
      const id = i * 3;
      const p = rotateVec3YXZ([mesh.positions[id], mesh.positions[id + 1], mesh.positions[id + 2]], rx, ry, rz);
      out.positions[id]     = p[0] + pos[0];
      out.positions[id + 1] = p[1] + pos[1];
      out.positions[id + 2] = p[2] + pos[2];

      const n = rotateVec3YXZ([mesh.normals[id], mesh.normals[id + 1], mesh.normals[id + 2]], rx, ry, rz);
      out.normals[id] = n[0]; out.normals[id + 1] = n[1]; out.normals[id + 2] = n[2];

      const sn = rotateVec3YXZ([mesh.smoothNormals[id], mesh.smoothNormals[id + 1], mesh.smoothNormals[id + 2]], rx, ry, rz);
      out.smoothNormals[id] = sn[0]; out.smoothNormals[id + 1] = sn[1]; out.smoothNormals[id + 2] = sn[2];

      const op = rotateVec3YXZ([mesh.outlinePositions[id], mesh.outlinePositions[id + 1], mesh.outlinePositions[id + 2]], rx, ry, rz);
      out.outlinePositions[id]     = op[0] + pos[0];
      out.outlinePositions[id + 1] = op[1] + pos[1];
      out.outlinePositions[id + 2] = op[2] + pos[2];

      const on = rotateVec3YXZ([mesh.outlineNormals[id], mesh.outlineNormals[id + 1], mesh.outlineNormals[id + 2]], rx, ry, rz);
      out.outlineNormals[id] = on[0]; out.outlineNormals[id + 1] = on[1]; out.outlineNormals[id + 2] = on[2];
    }
    return out;
  }

  // Orientaciones canónicas Euler [rx, ry, rz] para que la cara `n` quede mirando hacia arriba/frente
  const FACE_ROTATIONS = {
    1: [ 22 * DEG, -28 * DEG,   8 * DEG],
    2: [ 68 * DEG,  24 * DEG, -14 * DEG],
    3: [ 20 * DEG, -68 * DEG,  12 * DEG],
    4: [ 24 * DEG,  66 * DEG, -10 * DEG],
    5: [-66 * DEG, -26 * DEG,  15 * DEG],
    6: [ 24 * DEG, 152 * DEG, -12 * DEG]
  };

  function getPairPose(poseName, faceA, faceB) {
    const fA = faceA || 5;
    const fB = faceB || 6;
    if (poseName === "table") {
      // Composición clásica sobre mesa (como Imagen de Referencia 1)
      return {
        dieA: { pos: [-0.92, -0.20,  0.22], rot: [-18 * DEG,  34 * DEG,   4 * DEG], value: fA },
        dieB: { pos: [ 0.94,  0.18, -0.22], rot: [ 22 * DEG, -28 * DEG, -14 * DEG], value: fB }
      };
    }
    // Composición dinámica en el aire (como Imágenes de Referencia 2 y 3)
    const baseA = FACE_ROTATIONS[fA] || FACE_ROTATIONS[5];
    const baseB = FACE_ROTATIONS[fB] || FACE_ROTATIONS[6];
    return {
      dieA: { pos: [-0.90, -0.52,  0.18], rot: [baseA[0], baseA[1] + 0.18, baseA[2]], value: fA },
      dieB: { pos: [ 0.90,  0.54, -0.18], rot: [baseB[0] + 0.15, baseB[1] - 0.22, baseB[2] - 0.18], value: fB }
    };
  }

  function createDadosGeometry(options) {
    const opts = options || {};
    const outlineThickness = typeof opts.outlineThickness === "number" ? opts.outlineThickness : 0.042;
    const pose = getPairPose(opts.pose || "dynamic", opts.faceA || 5, opts.faceB || 6);

    const dieALocal = createSingleDieMesh(1, outlineThickness);
    const dieBLocal = createSingleDieMesh(2, outlineThickness);

    const dieAWorld = transformDieMesh(dieALocal, pose.dieA.pos, pose.dieA.rot);
    const dieBWorld = transformDieMesh(dieBLocal, pose.dieB.pos, pose.dieB.rot);

    return {
      dieALocal,
      dieBLocal,
      dieAWorld,
      dieBWorld,
      pose,
      outlineThickness
    };
  }

  // ============================================================================
  // 3. EXPORTADOR BINARIO GLTF 2.0 (.GLB) CON NODOS INDEPENDIENTES
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
      { name: "Dado_Izquierdo", meshData: geometry.dieAWorld },
      { name: "Dado_Derecho", meshData: geometry.dieBWorld }
    ];

    const meshes = [];
    const nodes = [{ name: "Dados_Mexicanos_Root", children: [], translation: [0, 0, 0] }];

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
        name: "Dados_Marfil_HandPainted",
        pbrMetallicRoughness: {
          baseColorTexture: { index: 0 },
          metallicFactor: 0.0,
          roughnessFactor: 0.58
        },
        doubleSided: false
      }
    ];

    if (withOutline) {
      materials.push({
        name: "Tinta_Negra_ToonOutline",
        pbrMetallicRoughness: {
          baseColorFactor: [0.075, 0.045, 0.032, 1.0],
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
        generator: "Dados3D · La Mesa Cívica INE"
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
        wrapS: 33071,
        wrapT: 33071
      }],
      images: [{
        bufferView: pngView,
        mimeType: "image/png",
        name: "dados-atlas"
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
  // 4. VISOR E INTERACCIÓN WEBGL CEL-SHADED + LANZAMIENTO DE DADOS
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

  function mat4FromTRS(tx, ty, tz, rx, ry, rz) {
    const cx = Math.cos(rx), sx = Math.sin(rx);
    const cy = Math.cos(ry), sy = Math.sin(ry);
    const cz = Math.cos(rz), sz = Math.sin(rz);

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

      // Rampa cel-shaded 2D/3D cálida de 3 escalones (cara iluminada marfil, cara media pergamino, cara sombra sepia)
      float band1 = smoothstep(-0.15, -0.04, ndl);
      float band2 = smoothstep(0.35, 0.44, ndl);

      vec3 shadowTint = vec3(0.73, 0.64, 0.54);
      vec3 midTint    = vec3(0.93, 0.87, 0.78);
      vec3 litTint    = vec3(1.06, 1.02, 0.96);

      vec3 shade = mix(shadowTint, midTint, band1);
      shade = mix(shade, litTint, band2);

      // Rim light cálido ámbar en biseles redondeados
      float fresnel = 1.0 - max(dot(N, V), 0.0);
      float rimMask = smoothstep(0.68, 0.78, fresnel);
      vec3 rimColor = vec3(1.0, 0.88, 0.64) * rimMask * 0.20;

      // Brillo especular cartoon tanto en biseles como en el esmalte negro carbón de los puntos hundidos
      float specRaw = pow(max(dot(N, H), 0.0), 32.0);
      float specToon = smoothstep(0.48, 0.56, specRaw);
      vec3 specColor = vec3(1.0, 0.97, 0.90) * specToon * 0.18;

      gl_FragColor = vec4(tex.rgb * shade + rimColor + specColor, 1.0);
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
      outlineWidth: 0.042,
      autoRotate: true,
      autoRotateSpeed: 0.40,
      pose: "dynamic",
      faceA: 5,
      faceB: 6,
      onRollResult: null
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
    paintDadosAtlas(ctx2d);

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlasCanvas);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const aniso = gl.getExtension("EXT_texture_filter_anisotropic") ||
                  gl.getExtension("WEBKIT_EXT_texture_filter_anisotropic");
    if (aniso) {
      const maxAniso = gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
      gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, maxAniso));
    }

    const dieAMesh = createSingleDieMesh(1, opts.outlineWidth);
    const dieBMesh = createSingleDieMesh(2, opts.outlineWidth);

    function createPartGPU(mesh) {
      const posBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
      gl.bufferData(gl.ARRAY_BUFFER, mesh.positions, gl.STATIC_DRAW);

      const normBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, normBuf);
      gl.bufferData(gl.ARRAY_BUFFER, mesh.normals, gl.STATIC_DRAW);

      const smoothNormBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, smoothNormBuf);
      gl.bufferData(gl.ARRAY_BUFFER, mesh.smoothNormals, gl.STATIC_DRAW);

      const uvBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
      gl.bufferData(gl.ARRAY_BUFFER, mesh.uvs, gl.STATIC_DRAW);

      const idxBuf = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);

      return { posBuf, normBuf, smoothNormBuf, uvBuf, idxBuf, count: mesh.indices.length };
    }

    const dieAGPU = createPartGPU(dieAMesh);
    const dieBGPU = createPartGPU(dieBMesh);

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

    const initialPose = getPairPose(opts.pose, opts.faceA, opts.faceB);
    const state = {
      rotY: 0,
      cameraScale: opts.cameraScale || 1,
      pitchX: 6 * DEG,
      velY: 0,
      autoRotate: !!opts.autoRotate,
      outlineWidth: opts.outlineWidth,
      poseName: opts.pose,
      faceA: opts.faceA,
      faceB: opts.faceB,
      dieA: { pos: initialPose.dieA.pos.slice(), rot: initialPose.dieA.rot.slice() },
      dieB: { pos: initialPose.dieB.pos.slice(), rot: initialPose.dieB.rot.slice() },
      rolling: false,
      rollStartTime: 0,
      rollDuration: 1550,
      startA: null,
      startB: null,
      targetA: null,
      targetB: null,
      dragging: false,
      lastPointerX: 0,
      lastPointerY: 0,
      lastMoveTime: 0,
      rafId: 0,
      lastFrameTime: performance.now(),
      paused: false,
      destroyed: false
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

      if (state.rolling) {
        const t = clamp((now - state.rollStartTime) / state.rollDuration, 0, 1);
        const ease = 1 - Math.pow(1 - t, 3.6);
        const hop = Math.sin(t * Math.PI) * (1 - t * 0.35) * 0.68;

        for (let c = 0; c < 3; c++) {
          state.dieA.pos[c] = lerp(state.startA.pos[c], state.targetA.pos[c], ease);
          state.dieB.pos[c] = lerp(state.startB.pos[c], state.targetB.pos[c], ease);
          state.dieA.rot[c] = lerp(state.startA.rot[c], state.targetA.rot[c], ease);
          state.dieB.rot[c] = lerp(state.startB.rot[c], state.targetB.rot[c], ease);
        }
        state.dieA.pos[1] += hop;
        state.dieB.pos[1] += hop * 0.85;

        if (t >= 1) {
          state.rolling = false;
          if (typeof opts.onRollResult === "function") {
            opts.onRollResult({ faceA: state.faceA, faceB: state.faceB, sum: state.faceA + state.faceB });
          }
        }
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
      const fov = aspect < 0.85 ? 44 * DEG : 35 * DEG;
      const eye = [0, 0.20, 6.65 * state.cameraScale];
      const proj = mat4Perspective(fov, aspect, 0.5, 25.0);
      const view = mat4LookAt(eye, [0, 0.0, 0], [0, 1, 0]);
      const vp = mat4Multiply(proj, view);

      const sceneMat = mat4FromTRS(0, 0, 0, state.pitchX, state.rotY, 0);
      const dieAMat = mat4FromTRS(
        state.dieA.pos[0], state.dieA.pos[1], state.dieA.pos[2],
        state.dieA.rot[0], state.dieA.rot[1], state.dieA.rot[2]
      );
      const dieBMat = mat4FromTRS(
        state.dieB.pos[0], state.dieB.pos[1], state.dieB.pos[2],
        state.dieB.rot[0], state.dieB.rot[1], state.dieB.rot[2]
      );

      if (state.outlineWidth > 0.0005) {
        gl.useProgram(outProg);
        gl.cullFace(gl.FRONT);
        gl.uniformMatrix4fv(outLoc.uScene, false, sceneMat);
        gl.uniformMatrix4fv(outLoc.uVP, false, vp);
        gl.uniform3f(outLoc.uInkColor, 0.078, 0.047, 0.032);

        drawPartPass(dieAGPU, dieAMat, true, state.outlineWidth);
        drawPartPass(dieBGPU, dieBMat, true, state.outlineWidth);
      }

      gl.useProgram(surfProg);
      gl.cullFace(gl.BACK);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(surfLoc.uAtlas, 0);
      gl.uniformMatrix4fv(surfLoc.uScene, false, sceneMat);
      gl.uniformMatrix4fv(surfLoc.uVP, false, vp);
      gl.uniform3f(surfLoc.uCameraPos, eye[0], eye[1], eye[2]);
      gl.uniform3f(surfLoc.uKeyLight, 2.4, 3.3, 3.6);

      drawPartPass(dieAGPU, dieAMat, false, 0);
      drawPartPass(dieBGPU, dieBMat, false, 0);

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
      state.pitchX = clamp(state.pitchX + dy * 0.006, -38 * DEG, 42 * DEG);
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

    function rollDice(forcedA, forcedB, instant = false) {
      const fA = forcedA || (1 + Math.floor(Math.random() * 6));
      const fB = forcedB || (1 + Math.floor(Math.random() * 6));
      state.faceA = fA;
      state.faceB = fB;

      const target = getPairPose(state.poseName, fA, fB);
      if (instant) {
        state.dieA = { pos: target.dieA.pos.slice(), rot: target.dieA.rot.slice() };
        state.dieB = { pos: target.dieB.pos.slice(), rot: target.dieB.rot.slice() };
        state.rolling = false;
        const result = { faceA: fA, faceB: fB, sum: fA + fB };
        if (typeof opts.onRollResult === "function") opts.onRollResult(result);
        return result;
      }
      state.dieA.rot = state.dieA.rot.map(angle => Math.atan2(Math.sin(angle), Math.cos(angle)));
      state.dieB.rot = state.dieB.rot.map(angle => Math.atan2(Math.sin(angle), Math.cos(angle)));
      state.startA = { pos: state.dieA.pos.slice(), rot: state.dieA.rot.slice() };
      state.startB = { pos: state.dieB.pos.slice(), rot: state.dieB.rot.slice() };

      const turnsA = [TAU * 2, TAU * 2, TAU];
      const turnsB = [-TAU * 2, TAU * 2, -TAU];
      state.targetA = {
        pos: target.dieA.pos.slice(),
        rot: [target.dieA.rot[0] + turnsA[0], target.dieA.rot[1] + turnsA[1], target.dieA.rot[2] + turnsA[2]]
      };
      state.targetB = {
        pos: target.dieB.pos.slice(),
        rot: [target.dieB.rot[0] + turnsB[0], target.dieB.rot[1] + turnsB[1], target.dieB.rot[2] + turnsB[2]]
      };
      state.rollStartTime = performance.now();
      state.rolling = true;
      return { faceA: fA, faceB: fB, sum: fA + fB };
    }

    function setPose(poseName, instant = false) {
      state.poseName = poseName;
      if (instant) {
        const pose = getPairPose(poseName, state.faceA, state.faceB);
        state.dieA = { pos: pose.dieA.pos.slice(), rot: pose.dieA.rot.slice() };
        state.dieB = { pos: pose.dieB.pos.slice(), rot: pose.dieB.rot.slice() };
        state.rolling = false;
      } else rollDice(state.faceA, state.faceB);
    }

    function rotateBy(degrees) {
      state.rotY += degrees * DEG;
      state.velY = 0;
    }

    async function exportGLB(includeOutline) {
      const blob = await new Promise(resolve => atlasCanvas.toBlob(resolve, "image/png"));
      const pngBytes = new Uint8Array(await blob.arrayBuffer());
      const currentGeo = createDadosGeometry({
        outlineThickness: state.outlineWidth,
        pose: state.poseName,
        faceA: state.faceA,
        faceB: state.faceB
      });
      const glbBytes = buildGLBBuffer(currentGeo, pngBytes, includeOutline);
      return new Blob([glbBytes], { type: "model/gltf-binary" });
    }

    function setAutoRotate(enabled) {
      state.autoRotate = !!enabled;
    }

    function setOutlineWidth(w) {
      state.outlineWidth = clamp(Number(w) || 0, 0, 0.08);
    }

    function setCameraScale(scale) {
      state.cameraScale = clamp(scale, 1, 2);
    }

    function resetCamera() {
      state.pitchX = 6 * DEG;
      state.rotY = 0;
      state.velY = 0;
    }

    function setPaused(paused) {
      if (state.destroyed || state.paused === !!paused) return;
      state.paused = !!paused;
      if (state.paused) cancelAnimationFrame(state.rafId);
      else {
        state.lastFrameTime = performance.now();
        state.rafId = requestAnimationFrame(render);
      }
    }

    function destroy() {
      if (state.destroyed) return;
      state.destroyed = true;
      cancelAnimationFrame(state.rafId);
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      for (const gpu of [dieAGPU, dieBGPU]) {
        gl.deleteBuffer(gpu.posBuf);
        gl.deleteBuffer(gpu.normBuf);
        gl.deleteBuffer(gpu.smoothNormBuf);
        gl.deleteBuffer(gpu.uvBuf);
        gl.deleteBuffer(gpu.idxBuf);
      }
      gl.deleteTexture(tex);
      gl.deleteProgram(surfProg);
      gl.deleteProgram(outProg);
      atlasCanvas.width = 0;
      atlasCanvas.height = 0;
    }

    return {
      rollDice,
      setPose,
      exportGLB,
      setAutoRotate,
      rotateBy,
      setPaused,
      setOutlineWidth,
      resetCamera,
      setCameraScale,
      atlasCanvas,
      destroy
    };
  }

  return {
    PALETTE,
    PIP_LAYOUTS,
    ATLAS_LAYOUT,
    paintDadosAtlas,
    createDadosGeometry,
    buildGLBBuffer,
    createViewer
  };
});

