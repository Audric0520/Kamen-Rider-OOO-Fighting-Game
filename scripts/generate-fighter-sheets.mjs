import { mkdir, writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FRAME_WIDTH = 64;
const FRAME_HEIGHT = 112;
const PIXEL_SCALE = 2;
const LOGICAL_WIDTH = FRAME_WIDTH / PIXEL_SCALE;
const LOGICAL_HEIGHT = FRAME_HEIGHT / PIXEL_SCALE;
const COLUMNS = 6;
const ROWS = 5;
const SHEET_WIDTH = COLUMNS * FRAME_WIDTH;
const SHEET_HEIGHT = ROWS * FRAME_HEIGHT;

const STATES = [
  { name: 'IDLE', count: 4 },
  { name: 'WALK', count: 6 },
  { name: 'JUMP', count: 2 },
  { name: 'ATTACK', count: 4 },
  { name: 'BLOCK', count: 2 },
  { name: 'HITSTUN', count: 2 },
  { name: 'SWAP', count: 4 },
  { name: 'KO', count: 3 },
];

const PALETTES = [
  { filename: 'fighter-p1.png', accent: '#e54da8', accentLight: '#ff96d2' },
  { filename: 'fighter-p2.png', accent: '#32bdda', accentLight: '#92f0ff' },
];
const COLORS = {
  outline: '#101728',
  outlineLight: '#27334a',
  armor: '#c7d1dd',
  armorLight: '#eef4fa',
  armorShade: '#77859a',
  joint: '#37445a',
  visor: '#ffe477',
  visorShade: '#d8a83d',
  boot: '#5c3442',
  white: '#ffffff',
};

function rgba(color) {
  const hex = color.replace('#', '');
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
    255,
  ];
}

function makeCanvas() {
  return new Uint8Array(SHEET_WIDTH * SHEET_HEIGHT * 4);
}

function drawRect(canvas, frameIndex, x, y, width, height, color, palette) {
  const resolved = rgba(palette?.[color] ?? color);
  const frameX = (frameIndex % COLUMNS) * FRAME_WIDTH;
  const frameY = Math.floor(frameIndex / COLUMNS) * FRAME_HEIGHT;
  for (let py = y; py < y + height; py += 1) {
    for (let px = x; px < x + width; px += 1) {
      for (let scaleY = 0; scaleY < PIXEL_SCALE; scaleY += 1) {
        for (let scaleX = 0; scaleX < PIXEL_SCALE; scaleX += 1) {
          const targetX = frameX + px * PIXEL_SCALE + scaleX;
          const targetY = frameY + py * PIXEL_SCALE + scaleY;
          if (
            targetX < frameX || targetX >= frameX + FRAME_WIDTH
            || targetY < frameY || targetY >= frameY + FRAME_HEIGHT
          ) {
            continue;
          }
          const offset = (targetY * SHEET_WIDTH + targetX) * 4;
          canvas.set(resolved, offset);
        }
      }
    }
  }
}

function drawStandingFighter(canvas, frameIndex, state, pose, palette) {
  const center = 16 + pose.lean;
  const bob = pose.bob ?? 0;
  const headY = 3 + bob;
  const torsoY = 19 + bob;
  const legsY = 40 + bob;

  const leftArmX = state === 'ATTACK' ? 23 : state === 'BLOCK' ? 20 : 5 + (pose.armSwing ?? 0);
  const leftArmY = state === 'JUMP' ? 16 : state === 'ATTACK' ? 24 : state === 'BLOCK' ? 19 : 24 + bob;
  const leftArmW = state === 'ATTACK' ? 8 : 4;
  const leftArmH = state === 'JUMP' ? 10 : state === 'ATTACK' ? 4 : 11;
  const rightArmX = state === 'BLOCK' ? 10 : 23 - (pose.armSwing ?? 0);
  const rightArmY = state === 'JUMP' ? 16 : state === 'BLOCK' ? 21 : 24 + bob;
  const rightArmW = state === 'BLOCK' ? 8 : 4;
  const rightArmH = state === 'JUMP' ? 10 : 11;

  const legSwing = pose.legSwing ?? 0;
  const leftLegX = 10 + legSwing;
  const rightLegX = 17 - legSwing;
  const leftLegHeight = state === 'JUMP' ? 7 : 9;
  const rightLegHeight = state === 'JUMP' ? 8 : 9;
  const leftLegY = state === 'JUMP' ? 40 + bob : legsY;
  const rightLegY = state === 'JUMP' ? 38 + bob : legsY;

  // Boots and legs are drawn first so the belt and torso sit cleanly over them.
  drawRect(canvas, frameIndex, leftLegX - 2, leftLegY + leftLegHeight - 2, 7, 5, COLORS.outline);
  drawRect(canvas, frameIndex, leftLegX - 1, leftLegY + leftLegHeight - 1, 5, 3, COLORS.boot);
  drawRect(canvas, frameIndex, rightLegX - 1, rightLegY + rightLegHeight - 2, 7, 5, COLORS.outline);
  drawRect(canvas, frameIndex, rightLegX, rightLegY + rightLegHeight - 1, 5, 3, COLORS.boot);
  drawRect(canvas, frameIndex, leftLegX, leftLegY, 4, leftLegHeight, COLORS.outline);
  drawRect(canvas, frameIndex, leftLegX + 1, leftLegY + 1, 2, leftLegHeight - 2, COLORS.armorShade);
  drawRect(canvas, frameIndex, rightLegX, rightLegY, 4, rightLegHeight, COLORS.outline);
  drawRect(canvas, frameIndex, rightLegX + 1, rightLegY + 1, 2, rightLegHeight - 2, COLORS.armor);
  drawRect(canvas, frameIndex, leftLegX + 1, leftLegY + 3, 2, 1, palette.accent);
  drawRect(canvas, frameIndex, rightLegX + 1, rightLegY + 3, 2, 1, palette.accent);

  // Arms, joints, and fists.
  drawRect(canvas, frameIndex, leftArmX - 1, leftArmY - 1, leftArmW + 2, leftArmH + 2, COLORS.outline);
  drawRect(canvas, frameIndex, leftArmX, leftArmY, leftArmW, leftArmH, COLORS.armorShade);
  drawRect(canvas, frameIndex, leftArmX, leftArmY + Math.max(2, leftArmH - 3), leftArmW, 3, palette.accent);
  drawRect(canvas, frameIndex, leftArmX - 1, leftArmY + leftArmH - 1, leftArmW + 2, 3, COLORS.outline);
  drawRect(canvas, frameIndex, leftArmX, leftArmY + leftArmH, leftArmW, 1, COLORS.armorLight);
  drawRect(canvas, frameIndex, rightArmX - 1, rightArmY - 1, rightArmW + 2, rightArmH + 2, COLORS.outline);
  drawRect(canvas, frameIndex, rightArmX, rightArmY, rightArmW, rightArmH, COLORS.armor);
  drawRect(canvas, frameIndex, rightArmX, rightArmY + Math.max(2, rightArmH - 3), rightArmW, 3, palette.accent);
  drawRect(canvas, frameIndex, rightArmX - 1, rightArmY + rightArmH - 1, rightArmW + 2, 3, COLORS.outline);
  drawRect(canvas, frameIndex, rightArmX, rightArmY + rightArmH, rightArmW, 1, COLORS.armorLight);

  // Chest armor, waist, and medal belt.
  drawRect(canvas, frameIndex, center - 10, torsoY - 1, 20, 18, COLORS.outline);
  drawRect(canvas, frameIndex, center - 8, torsoY + 1, 16, 13, COLORS.armorShade);
  drawRect(canvas, frameIndex, center - 6, torsoY + 2, 12, 10, COLORS.armor);
  drawRect(canvas, frameIndex, center - 8, torsoY + 2, 3, 7, palette.accent);
  drawRect(canvas, frameIndex, center + 5, torsoY + 2, 3, 7, palette.accentLight);
  drawRect(canvas, frameIndex, center - 4, torsoY + 4, 8, 2, COLORS.outlineLight);
  drawRect(canvas, frameIndex, center - 4, torsoY + 7, 8, 2, COLORS.armorLight);
  drawRect(canvas, frameIndex, center - 11, torsoY, 4, 5, COLORS.outline);
  drawRect(canvas, frameIndex, center + 7, torsoY, 4, 5, COLORS.outline);
  drawRect(canvas, frameIndex, center - 10, torsoY + 1, 3, 3, COLORS.armor);
  drawRect(canvas, frameIndex, center + 7, torsoY + 1, 3, 3, COLORS.armorShade);
  drawRect(canvas, frameIndex, center - 8, torsoY + 14, 16, 5, COLORS.outline);
  drawRect(canvas, frameIndex, center - 7, torsoY + 15, 14, 3, COLORS.joint);
  drawRect(canvas, frameIndex, center - 3, torsoY + 15, 6, 3, palette.accent);
  drawRect(canvas, frameIndex, center - 1, torsoY + 16, 2, 1, COLORS.visor);

  // Helmet shell, crest, visor, and side fins.
  drawRect(canvas, frameIndex, center - 8, headY + 2, 16, 12, COLORS.outline);
  drawRect(canvas, frameIndex, center - 6, headY, 12, 14, COLORS.outline);
  drawRect(canvas, frameIndex, center - 4, headY + 1, 8, 1, COLORS.armorLight);
  drawRect(canvas, frameIndex, center - 5, headY + 2, 10, 9, COLORS.armorShade);
  drawRect(canvas, frameIndex, center - 4, headY + 3, 8, 7, COLORS.armor);
  drawRect(canvas, frameIndex, center - 5, headY + 6, 10, 4, COLORS.outline);
  drawRect(canvas, frameIndex, center - 4, headY + 7, 8, 2, COLORS.visorShade);
  drawRect(canvas, frameIndex, center - 3, headY + 7, 6, 1, COLORS.visor);
  drawRect(canvas, frameIndex, center - 2, headY + 11, 4, 2, palette.accent);
  drawRect(canvas, frameIndex, center - 1, headY - 2, 2, 4, palette.accent);
  drawRect(canvas, frameIndex, center - 10, headY + 5, 3, 5, COLORS.outline);
  drawRect(canvas, frameIndex, center + 7, headY + 5, 3, 5, COLORS.outline);
  drawRect(canvas, frameIndex, center - 9, headY + 6, 2, 2, palette.accent);
  drawRect(canvas, frameIndex, center + 7, headY + 6, 2, 2, palette.accentLight);

  if (state === 'ATTACK') {
    drawRect(canvas, frameIndex, 30, 22 + bob, 2, 2, palette.accentLight);
    drawRect(canvas, frameIndex, 28, 20 + bob, 2, 1, palette.accent);
    drawRect(canvas, frameIndex, 30, 25 + bob, 1, 2, COLORS.visor);
  } else if (state === 'BLOCK') {
    drawRect(canvas, frameIndex, 25, 18 + bob, 4, 2, palette.accentLight);
    drawRect(canvas, frameIndex, 27, 20 + bob, 2, 5, palette.accent);
  } else if (state === 'SWAP') {
    drawRect(canvas, frameIndex, 3, 13 + bob, 2, 2, palette.accentLight);
    drawRect(canvas, frameIndex, 27, 12 + bob, 2, 2, palette.accentLight);
    drawRect(canvas, frameIndex, 6, 9 + bob, 1, 2, COLORS.visor);
    drawRect(canvas, frameIndex, 25, 7 + bob, 1, 2, COLORS.visor);
  } else if (state === 'HITSTUN' && pose.flash) {
    drawRect(canvas, frameIndex, center - 5, headY + 6, 10, 3, COLORS.white);
    drawRect(canvas, frameIndex, center - 8, torsoY + 4, 16, 4, COLORS.white);
  }
}

function drawKnockedOut(canvas, frameIndex, pose, palette) {
  const bodyY = 41 + pose.bob;
  drawRect(canvas, frameIndex, 2, bodyY + 2, 28, 8, COLORS.outline);
  drawRect(canvas, frameIndex, 4, bodyY, 9, 10, COLORS.armorShade);
  drawRect(canvas, frameIndex, 5, bodyY + 2, 6, 3, COLORS.visor);
  drawRect(canvas, frameIndex, 12, bodyY + 2, 9, 7, COLORS.armor);
  drawRect(canvas, frameIndex, 15, bodyY + 3, 4, 3, palette.accent);
  drawRect(canvas, frameIndex, 20, bodyY + 4, 6, 4, COLORS.armorShade);
  drawRect(canvas, frameIndex, 24, bodyY + 3, 6, 3, COLORS.boot);
  drawRect(canvas, frameIndex, 2, bodyY, 4, 2, COLORS.outlineLight);
  if (pose.spark) {
    drawRect(canvas, frameIndex, 7, bodyY - 5, 2, 2, palette.accentLight);
    drawRect(canvas, frameIndex, 4, bodyY - 7, 1, 2, COLORS.visor);
    drawRect(canvas, frameIndex, 10, bodyY - 8, 1, 2, COLORS.visor);
  }
}

function makeFrame(canvas, frameIndex, state, frameInState, palette) {
  if (state === 'KO') {
    drawKnockedOut(canvas, frameIndex, { bob: frameInState % 2, spark: frameInState === 0 }, palette);
    return;
  }

  const poses = {
    IDLE: [
      { lean: 0, bob: 0, armSwing: 0, legSwing: 0 },
      { lean: 0, bob: 0, armSwing: 0, legSwing: 0 },
      { lean: 0, bob: 1, armSwing: 0, legSwing: 0 },
      { lean: 0, bob: 0, armSwing: 0, legSwing: 0 },
    ],
    WALK: [
      { lean: 0, bob: 0, armSwing: 0, legSwing: -2 },
      { lean: 1, bob: 1, armSwing: 1, legSwing: -1 },
      { lean: 1, bob: 0, armSwing: 2, legSwing: 1 },
      { lean: 0, bob: 1, armSwing: 0, legSwing: 2 },
      { lean: -1, bob: 0, armSwing: -1, legSwing: 1 },
      { lean: 0, bob: 1, armSwing: -2, legSwing: -1 },
    ],
    JUMP: [
      { lean: 0, bob: 0, armSwing: 1, legSwing: 0 },
      { lean: 1, bob: -1, armSwing: 2, legSwing: 1 },
    ],
    ATTACK: [
      { lean: 0, bob: 0, armSwing: 0, legSwing: -1 },
      { lean: 2, bob: 0, armSwing: 0, legSwing: 1 },
      { lean: 1, bob: 0, armSwing: 0, legSwing: 1 },
      { lean: -1, bob: 0, armSwing: 0, legSwing: 0 },
    ],
    BLOCK: [
      { lean: -1, bob: 0, armSwing: 0, legSwing: 0 },
      { lean: 0, bob: 0, armSwing: 0, legSwing: 0 },
    ],
    HITSTUN: [
      { lean: -3, bob: 0, armSwing: -1, legSwing: -1, flash: true },
      { lean: -2, bob: 1, armSwing: -2, legSwing: 1, flash: false },
    ],
    SWAP: [
      { lean: 0, bob: 0, armSwing: 2, legSwing: 0 },
      { lean: 1, bob: -1, armSwing: 1, legSwing: 0 },
      { lean: 0, bob: 1, armSwing: -1, legSwing: 0 },
      { lean: -1, bob: 0, armSwing: -2, legSwing: 0 },
    ],
  };
  const pose = poses[state][frameInState];
  drawStandingFighter(canvas, frameIndex, state, pose, palette);
}

const crcTable = new Uint32Array(256);
for (let index = 0; index < 256; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  crcTable[index] = value >>> 0;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(name, data) {
  const type = Buffer.from(name, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([type, data])), 0);
  return Buffer.concat([length, type, data, checksum]);
}

function encodePNG(pixels) {
  const scanlines = Buffer.alloc((SHEET_WIDTH * 4 + 1) * SHEET_HEIGHT);
  for (let y = 0; y < SHEET_HEIGHT; y += 1) {
    const rowOffset = y * (SHEET_WIDTH * 4 + 1);
    scanlines[rowOffset] = 0;
    const sourceStart = y * SHEET_WIDTH * 4;
    Buffer.from(pixels.buffer, pixels.byteOffset + sourceStart, SHEET_WIDTH * 4)
      .copy(scanlines, rowOffset + 1);
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(SHEET_WIDTH, 0);
  header.writeUInt32BE(SHEET_HEIGHT, 4);
  header[8] = 8;
  header[9] = 6;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(scanlines)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function buildSheet(palette) {
  const canvas = makeCanvas();
  let frameIndex = 0;
  for (const state of STATES) {
    for (let frame = 0; frame < state.count; frame += 1) {
      makeFrame(canvas, frameIndex, state.name, frame, palette);
      frameIndex += 1;
    }
  }
  return encodePNG(canvas);
}

await mkdir(resolve(ROOT, 'public/assets'), { recursive: true });
for (const palette of PALETTES) {
  const output = resolve(ROOT, 'public/assets', palette.filename);
  await writeFile(output, buildSheet(palette));
  console.log(`Wrote ${output} (${COLUMNS}x${ROWS} cells, ${LOGICAL_WIDTH}x${LOGICAL_HEIGHT} source pixels per cell)`);
}
