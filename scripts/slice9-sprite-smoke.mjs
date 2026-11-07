import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';

const server = await createServer({
  configFile: 'vite.config.ts',
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, hmr: false },
});

try {
  const config = await server.ssrLoadModule('/src/config.ts');
  const {
    FIGHTER_PLAYER_1_SHEET,
    FIGHTER_PLAYER_2_SHEET,
    FIGHTER_SPRITE_ANIMATIONS,
    FIGHTER_SPRITE_FRAME_HEIGHT,
    FIGHTER_SPRITE_FRAME_WIDTH,
  } = config;
  const player1Bytes = await readFile(`public${FIGHTER_PLAYER_1_SHEET}`);
  const player2Bytes = await readFile(`public${FIGHTER_PLAYER_2_SHEET}`);
  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  for (const [label, bytes] of [['P1', player1Bytes], ['P2', player2Bytes]]) {
    assert.deepEqual(bytes.subarray(0, 8), pngSignature, `${label} sheet is a PNG`);
    assert.equal(bytes.readUInt32BE(16), 384, `${label} sheet has six 64-pixel columns`);
    assert.equal(bytes.readUInt32BE(20), 560, `${label} sheet has five 112-pixel rows`);
  }
  assert.notDeepEqual(player1Bytes, player2Bytes, 'players have distinct accent palettes');

  const animationFrames = Object.values(FIGHTER_SPRITE_ANIMATIONS).flatMap(({ frames }) => frames);
  assert.equal(animationFrames.length, 27, 'spritesheet defines frames for all eight fighter states');
  assert.equal(new Set(animationFrames).size, animationFrames.length, 'animation states use distinct frames');
  assert.ok(
    Math.max(...animationFrames) < (384 / FIGHTER_SPRITE_FRAME_WIDTH) * (560 / FIGHTER_SPRITE_FRAME_HEIGHT),
    'all configured animation frames fit inside the sprite atlas',
  );

  console.log('Slice 9 sprite-sheet smoke tests passed.');
} finally {
  await server.close();
}
