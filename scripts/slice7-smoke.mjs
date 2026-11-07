import assert from 'node:assert/strict';
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
  const [
    { Fighter },
    { MedalSystem },
    { CombatSystem },
    { Projectile },
    { DirectionTapTracker },
  ] = await Promise.all([
    server.ssrLoadModule('/src/entities/Fighter.ts'),
    server.ssrLoadModule('/src/systems/MedalSystem.ts'),
    server.ssrLoadModule('/src/systems/CombatSystem.ts'),
    server.ssrLoadModule('/src/entities/Projectile.ts'),
    server.ssrLoadModule('/src/systems/DirectionTapTracker.ts'),
  ]);
  const medals = new MedalSystem();

  const tatobaLight = new Fighter(240);
  medals.initializeFighter(tatobaLight);
  assert.equal(medals.getActiveSetBonus(tatobaLight), null, 'TaToBa has no same-color bonus');
  tatobaLight.update(input({ lightAttackPressed: true }));
  assert.equal(tatobaLight.getCurrentAttackDefinition().damage, 30, 'Tora light keeps two 30-damage hits');

  const tatobaHeavy = new Fighter(240);
  medals.initializeFighter(tatobaHeavy);
  tatobaHeavy.update(input({ heavyAttackPressed: true }));
  assert.equal(tatobaHeavy.getCurrentAttackDefinition().damage, 40, 'Tora heavy keeps three 40-damage hits');

  const swapper = new Fighter(240);
  medals.initializeFighter(swapper);
  assert.equal(medals.trySwap(swapper, 'head'), true);
  assert.equal(swapper.state, 'SWAP');
  assert.equal(medals.getCooldowns(swapper).head, 180);
  assert.equal(medals.trySwap(swapper, 'arms'), false, 'SWAP lock prevents another swap');
  for (let frame = 0; frame < 12; frame += 1) swapper.update(input());
  assert.equal(swapper.state, 'IDLE', 'SWAP lock lasts 12 simulation frames');
  assert.equal(medals.trySwap(swapper, 'arms'), true, 'cooldowns are independent by slot');
  assert.equal(medals.getCooldowns(swapper).head, 180);
  assert.equal(medals.getCooldowns(swapper).arms, 180);

  const gatakiriba = new Fighter(240);
  medals.applyLoadout(gatakiriba, { head: 'kuwagata', arms: 'kamakiri', legs: 'batta' });
  assert.equal(medals.getActiveSetBonus(gatakiriba).name, 'Gatakiriba');
  gatakiriba.update(input({ left: true }));
  assert.equal(gatakiriba.x, 234.25, 'Gatakiriba movement multiplier is 1.15');
  const gatakiribaAttack = new Fighter(240);
  medals.applyLoadout(gatakiribaAttack, { head: 'kuwagata', arms: 'kamakiri', legs: 'batta' });
  gatakiribaAttack.update(input({ lightAttackPressed: true }));
  assert.equal(gatakiribaAttack.getCurrentAttackDefinition().hitstunFrames, 22, 'Gatakiriba adds 8 hitstun frames');

  const latoratar = new Fighter(240);
  medals.applyLoadout(latoratar, { head: 'lion', arms: 'tora', legs: 'cheetah' });
  assert.equal(medals.getActiveSetBonus(latoratar).name, 'LaToraTar');
  latoratar.update(input({ heavyAttackPressed: true }));
  assert.equal(latoratar.getCurrentAttackDefinition().damage, 44, 'LaToraTar damage multiplier is 1.1');
  const cheetahDash = new Fighter(240);
  medals.applyLoadout(cheetahDash, { head: 'lion', arms: 'tora', legs: 'cheetah' });
  cheetahDash.update(input({ dashDirection: 1 }));
  assert.equal(cheetahDash.x, 257.5, 'LaToraTar multiplies Cheetah dash speed by 1.25');

  const lion = new Fighter(240);
  medals.applyLoadout(lion, { head: 'lion', arms: 'tora', legs: 'cheetah' });
  lion.update(input({ specialPressed: true }));
  for (let frame = 0; frame < 10; frame += 1) lion.update(input());
  assert.equal(lion.getAttackHitbox().width, 112, 'Lion special uses its close-range flash hitbox');
  assert.equal(lion.getCurrentAttackDefinition().blockstunFrames, 8);
  const lionTarget = new Fighter(320);
  new CombatSystem().resolve([lion, lionTarget]);
  assert.equal(lionTarget.health, 923, 'Lion special damage receives the LaToraTar boost');

  const kuwagata = new Fighter(240);
  medals.applyLoadout(kuwagata, { head: 'kuwagata', arms: 'kamakiri', legs: 'batta' });
  kuwagata.update(input({ specialPressed: true }));
  for (let frame = 0; frame < 14; frame += 1) kuwagata.update(input());
  assert.equal(kuwagata.x, 280, 'Kuwagata lunge moves 8 px/frame for 5 active frames');

  const taka = new Fighter(240);
  medals.applyLoadout(taka, { head: 'taka', arms: 'kujaku', legs: 'condor' });
  assert.equal(medals.getActiveSetBonus(taka).name, 'Tajadol');
  taka.update(input({ specialPressed: true }));
  for (let frame = 0; frame < 14; frame += 1) taka.update(input());
  const request = taka.consumeSpecialProjectile();
  assert.ok(request, 'Taka special creates a projectile during its active frames');
  assert.deepEqual(request.burnOnHit, {
    damagePerTick: 4,
    tickIntervalFrames: 30,
    durationFrames: 120,
  });

  const target = new Fighter(330);
  const projectile = new Projectile(taka, request);
  const combat = new CombatSystem();
  for (let frame = 0; frame < 4 && projectile.active; frame += 1) {
    combat.resolve([taka, target], [projectile]);
  }
  assert.equal(target.health, 940, 'Taka projectile deals its medal-data damage');
  assert.equal(projectile.active, false, 'projectile is removed on contact');
  for (let frame = 0; frame < 30; frame += 1) target.update(input());
  assert.equal(target.health, 936, 'Tajadol burn deals 4 damage after 30 frames');
  target.applyBurn(request.burnOnHit);
  for (let frame = 0; frame < 29; frame += 1) target.update(input());
  assert.equal(target.health, 936, 'burn reapplication refreshes rather than stacks');
  target.update(input());
  assert.equal(target.health, 932, 'refreshed burn ticks after its full interval');

  const tapTracker = new DirectionTapTracker();
  assert.equal(tapTracker.advance(false, true), null, 'first movement tap does not dash');
  for (let frame = 0; frame < 9; frame += 1) tapTracker.advance(false, false);
  assert.equal(tapTracker.advance(false, true), 1, 'second same-direction tap within 10 frames dashes');
  const expiredTapTracker = new DirectionTapTracker();
  expiredTapTracker.advance(true, false);
  for (let frame = 0; frame < 10; frame += 1) expiredTapTracker.advance(false, false);
  assert.equal(expiredTapTracker.advance(true, false), null, 'tap outside the 10-frame window does not dash');

  console.log('Slice 7 smoke tests passed.');
} finally {
  await server.close();
}
