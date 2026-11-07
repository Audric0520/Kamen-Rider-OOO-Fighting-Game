import assert from 'node:assert/strict';
import { createServer } from 'vite';

const server = await createServer({
  configFile: 'vite.config.ts',
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, hmr: false },
});

const blankInput = {
  left: false,
  right: false,
  jumpPressed: false,
  lightAttackPressed: false,
  heavyAttackPressed: false,
  specialPressed: false,
  blockHeld: false,
  dashDirection: null,
};

try {
  const [{ Fighter }, { MedalSystem }, { AISystem }] = await Promise.all([
    server.ssrLoadModule('/src/entities/Fighter.ts'),
    server.ssrLoadModule('/src/systems/MedalSystem.ts'),
    server.ssrLoadModule('/src/systems/AISystem.ts'),
  ]);
  const medals = new MedalSystem();

  const humanFar = new Fighter(100);
  const cpuFar = new Fighter(800);
  medals.initializeFighter(humanFar);
  medals.initializeFighter(cpuFar);
  const approachAI = new AISystem(() => 0.99);
  let decision;
  for (let frame = 0; frame < 5; frame += 1) {
    decision = approachAI.update(humanFar, cpuFar, medals);
    assert.equal(decision.input.left, false, 'AI waits for its configured decision frame');
  }
  decision = approachAI.update(humanFar, cpuFar, medals);
  assert.equal(decision.input.left, true, 'AI approaches when outside its available attack range');

  const humanInRange = new Fighter(300);
  const cpuInRange = new Fighter(600);
  medals.initializeFighter(humanInRange);
  medals.initializeFighter(cpuInRange);
  const attackAI = new AISystem(() => 0.99);
  for (let frame = 0; frame < 6; frame += 1) {
    decision = attackAI.update(humanInRange, cpuInRange, medals);
  }
  assert.equal(decision.input.specialPressed, true, 'AI attacks with its Taka projectile at data-derived range');

  const humanMidRange = new Fighter(300);
  const cpuMidRange = new Fighter(500);
  medals.initializeFighter(humanMidRange);
  medals.initializeFighter(cpuMidRange);
  const swapAI = new AISystem(() => 0.99);
  for (let frame = 0; frame < 6; frame += 1) {
    decision = swapAI.update(humanMidRange, cpuMidRange, medals);
  }
  assert.equal(decision.swapSlot, 'head', 'AI requests a distance-based Head medal swap');
  assert.equal(medals.trySwap(cpuMidRange, decision.swapSlot), true);
  assert.equal(medals.getLoadout(cpuMidRange).head, 'lion', 'existing slot cycling/cooldown rules remain in force');

  const humanThreat = new Fighter(310);
  const cpuThreat = new Fighter(350);
  medals.initializeFighter(humanThreat);
  medals.initializeFighter(cpuThreat);
  humanThreat.update({ ...blankInput, lightAttackPressed: true });
  const blockingAI = new AISystem(() => 0.1);
  for (let frame = 0; frame < 6; frame += 1) {
    decision = blockingAI.update(humanThreat, cpuThreat, medals);
  }
  assert.equal(decision.input.blockHeld, true, 'AI sometimes blocks an in-range attack');
  const failingBlockAI = new AISystem(() => 0.99);
  for (let frame = 0; frame < 6; frame += 1) {
    decision = failingBlockAI.update(humanThreat, cpuThreat, medals);
  }
  assert.equal(decision.input.blockHeld, false, 'block chance is limited by the configured probability');

  console.log('Slice 8 AI smoke tests passed.');
} finally {
  await server.close();
}
