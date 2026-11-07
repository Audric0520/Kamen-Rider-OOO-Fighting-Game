import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';

const server = await createServer({
  configFile: 'vite.config.ts',
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, hmr: false },
});

const input = (overrides = {}) => ({
  left: false,
  right: false,
  jumpPressed: false,
  lightAttackPressed: false,
  heavyAttackPressed: false,
  specialPressed: false,
  blockHeld: false,
  dashDirection: null,
  ...overrides,
});

try {
  const [{ Fighter }, { MedalSystem }, config] = await Promise.all([
    server.ssrLoadModule('/src/entities/Fighter.ts'),
    server.ssrLoadModule('/src/systems/MedalSystem.ts'),
    server.ssrLoadModule('/src/config.ts'),
  ]);
  const medals = new MedalSystem();
  const medalData = JSON.parse(await readFile('src/data/medals.json', 'utf8'));
  const kujaku = medalData.find(({ id }) => id === 'kujaku');
  const kamakiri = medalData.find(({ id }) => id === 'kamakiri');
  const tora = medalData.find(({ id }) => id === 'tora');

  assert.equal(kujaku.light.damage, 43, 'Kujaku light gets a conservative damage buff');
  assert.equal(kujaku.heavy.damage, 76, 'Kujaku heavy gets a conservative damage buff');
  assert.equal(kamakiri.light.damage, 38, 'Kamakiri light gets a conservative damage buff');
  assert.equal(kamakiri.heavy.damage, 76, 'Kamakiri heavy gets a conservative damage buff');
  assert.equal(tora.light.damage, 60, 'Tora light remains two 30-damage hits');
  assert.equal(tora.light.hitCount, 2);
  assert.equal(tora.heavy.damage, 120, 'Tora heavy remains three 40-damage hits');
  assert.equal(tora.heavy.hitCount, 3);

  for (const [label, value] of [
    ['Kujaku light', kujaku.light.damage / 40],
    ['Kujaku heavy', kujaku.heavy.damage / 70],
    ['Kamakiri light', kamakiri.light.damage / 35],
    ['Kamakiri heavy', kamakiri.heavy.damage / 70],
  ]) {
    assert.ok(value <= 1.1 && value >= 0.9, `${label} stays within the approved ±10% cap`);
  }

  const kujakuFighter = new Fighter(240);
  medals.applyLoadout(kujakuFighter, { head: 'taka', arms: 'kujaku', legs: 'condor' });
  kujakuFighter.update(input({ lightAttackPressed: true }));
  assert.equal(kujakuFighter.getCurrentAttackDefinition().damage, 39, 'Kujaku modifier is applied to tuned light damage');

  const kamakiriFighter = new Fighter(240);
  medals.applyLoadout(kamakiriFighter, { head: 'kuwagata', arms: 'kamakiri', legs: 'batta' });
  kamakiriFighter.update(input({ heavyAttackPressed: true }));
  assert.equal(kamakiriFighter.getCurrentAttackDefinition().damage, 65, 'Kamakiri modifier is applied to tuned heavy damage');

  assert.equal(config.SCREEN_SHAKE_HIT_FRAMES, 8);
  assert.equal(config.SCREEN_SHAKE_BLOCK_FRAMES, 4);
  assert.equal(config.SCREEN_SHAKE_KO_FRAMES, 12);
  assert.ok(config.SCREEN_SHAKE_HIT_INTENSITY > config.SCREEN_SHAKE_BLOCK_INTENSITY);
  assert.ok(config.SCREEN_SHAKE_KO_INTENSITY > config.SCREEN_SHAKE_HIT_INTENSITY);
  for (const effect of Object.values(config.SOUND_EFFECTS)) {
    assert.ok(effect.length > 0, 'each sound cue includes at least one tone');
    assert.ok(effect.every(({ durationFrames }) => durationFrames > 0), 'sound durations use positive frame counts');
  }
  assert.ok(config.SOUND_EFFECTS.menuMove && config.SOUND_EFFECTS.ko);

  const menuSource = await readFile('src/scenes/MenuScene.ts', 'utf8');
  const fightSource = await readFile('src/scenes/FightScene.ts', 'utf8');
  assert.match(menuSource, /OOO FIGHTER/, 'the menu presents a title screen');
  assert.match(menuSource, /this\.soundSystem\.play\('confirm'\)/, 'menu confirmation has a sound cue');
  assert.match(fightSource, /resolveCombatFeedback/, 'combat feedback is routed through hit detection');
  assert.match(fightSource, /SCREEN_SHAKE_KO_FRAMES/, 'KO screen shake uses config tuning');

  console.log('Slice 10 polish smoke tests passed.');
} finally {
  await server.close();
}
