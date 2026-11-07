import Phaser from 'phaser';
import {
  DEBUG_BOX_LINE_WIDTH,
  DEBUG_HITBOX_COLOR,
  DEBUG_HURTBOX_COLOR,
  DEBUG_TOGGLE_KEY,
  DEFAULT_GAME_MODE,
  FIXED_STEP_MS,
  FIGHTER_HEIGHT,
  FIGHTER_PLAYER_1_SHEET,
  FIGHTER_PLAYER_1_TEXTURE,
  FIGHTER_PLAYER_2_SHEET,
  FIGHTER_PLAYER_2_TEXTURE,
  FIGHTER_SPRITE_ANIMATIONS,
  FIGHTER_SPRITE_FRAME_HEIGHT,
  FIGHTER_SPRITE_FRAME_WIDTH,
  GAME_HEIGHT,
  GAME_WIDTH,
  GROUND_Y,
  HUD_CONTROLS_Y,
  HUD_TITLE_Y,
  KO_SPRITE_ALPHA,
  PLAYER_1_START_X,
  PLAYER_2_START_X,
  PROJECTILE_COLOR,
  ROUND_CONTINUE_KEY,
  SCREEN_SHAKE_BLOCK_FRAMES,
  SCREEN_SHAKE_BLOCK_INTENSITY,
  SCREEN_SHAKE_HIT_FRAMES,
  SCREEN_SHAKE_HIT_INTENSITY,
  SCREEN_SHAKE_KO_FRAMES,
  SCREEN_SHAKE_KO_INTENSITY,
  STAGE_LEFT,
  STAGE_RIGHT,
  type GameMode,
} from '../config';
import { Fighter, type CombatBox, type FighterInput } from '../entities/Fighter';
import { Projectile } from '../entities/Projectile';
import { AISystem } from '../systems/AISystem';
import { CombatSystem } from '../systems/CombatSystem';
import { InputSystem, type PlayerInput } from '../systems/InputSystem';
import { MedalSystem, type MedalSlot } from '../systems/MedalSystem';
import { RoundSystem, type RoundWinner } from '../systems/RoundSystem';
import { SoundSystem } from '../systems/SoundSystem';
import { Hud, type MedalSlotStatus } from '../ui/Hud';

const FIGHTER_TEXTURES = [FIGHTER_PLAYER_1_TEXTURE, FIGHTER_PLAYER_2_TEXTURE] as const;

export class FightScene extends Phaser.Scene {
  private fighters!: [Fighter, Fighter];
  private fighterSprites!: [Phaser.GameObjects.Sprite, Phaser.GameObjects.Sprite];
  private currentSpriteAnimations: [string | null, string | null] = [null, null];
  private inputSystem!: InputSystem;
  private aiSystem: AISystem | null = null;
  private gameMode: GameMode = DEFAULT_GAME_MODE;
  private combatSystem!: CombatSystem;
  private medalSystem!: MedalSystem;
  private roundSystem!: RoundSystem;
  private hud!: Hud;
  private soundSystem!: SoundSystem;
  private debugKey!: Phaser.Input.Keyboard.Key;
  private roundContinueKey!: Phaser.Input.Keyboard.Key;
  private debugGraphics!: Phaser.GameObjects.Graphics;
  private projectiles: Projectile[] = [];
  private readonly projectileVisuals = new Map<Projectile, Phaser.GameObjects.Ellipse>();
  private accumulator = 0;
  private debugEnabled = false;

  public constructor() {
    super('FightScene');
  }

  public init(data: { mode?: GameMode } = {}): void {
    this.gameMode = data.mode ?? DEFAULT_GAME_MODE;
  }

  public preload(): void {
    this.load.spritesheet(FIGHTER_PLAYER_1_TEXTURE, FIGHTER_PLAYER_1_SHEET, {
      frameWidth: FIGHTER_SPRITE_FRAME_WIDTH,
      frameHeight: FIGHTER_SPRITE_FRAME_HEIGHT,
    });
    this.load.spritesheet(FIGHTER_PLAYER_2_TEXTURE, FIGHTER_PLAYER_2_SHEET, {
      frameWidth: FIGHTER_SPRITE_FRAME_WIDTH,
      frameHeight: FIGHTER_SPRITE_FRAME_HEIGHT,
    });
  }

  public create(): void {
    this.cameras.main.setBackgroundColor('#111827');

    this.add.text(GAME_WIDTH / 2, HUD_TITLE_Y, 'OOO Fighter', {
      color: '#f9fafb',
      fontFamily: 'Arial, sans-serif',
      fontSize: '32px',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const controlsText = this.gameMode === 'cpu'
      ? 'P1: A / D move (double-tap dash), W jump, S block, J / K / L attack, U / I / O swap\nCPU: fights automatically'
      : 'P1: A / D move (double-tap dash), W jump, S block, J / K / L attack, U / I / O swap\nP2: arrows move (double-tap dash), Down block, Numpad 1 / 2 / 3 attack, 4 / 5 / 6 swap';
    this.add.text(GAME_WIDTH / 2, HUD_CONTROLS_Y, controlsText, {
      color: '#cbd5e1',
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
    }).setOrigin(0.5);

    const stage = this.add.graphics();
    stage.fillStyle(0x1e293b, 1);
    stage.fillRect(STAGE_LEFT, GROUND_Y + 2, STAGE_RIGHT - STAGE_LEFT, GAME_HEIGHT - GROUND_Y - 42);
    stage.lineStyle(4, 0x64748b, 1);
    stage.lineBetween(STAGE_LEFT, GROUND_Y, STAGE_RIGHT, GROUND_Y);
    stage.lineStyle(2, 0x334155, 1);
    stage.lineBetween(STAGE_LEFT, GROUND_Y, STAGE_LEFT, GAME_HEIGHT - 42);
    stage.lineBetween(STAGE_RIGHT, GROUND_Y, STAGE_RIGHT, GAME_HEIGHT - 42);

    this.createFighterAnimations();
    this.currentSpriteAnimations = [null, null];
    this.medalSystem = new MedalSystem();
    this.aiSystem = this.gameMode === 'cpu' ? new AISystem() : null;
    this.fighters = this.createFighters();
    this.fighterSprites = [
      this.createFighterVisual(this.fighters[0], 0),
      this.createFighterVisual(this.fighters[1], 1),
    ];

    this.inputSystem = new InputSystem(this);
    this.combatSystem = new CombatSystem();
    this.roundSystem = new RoundSystem();
    this.hud = new Hud(this, this.gameMode === 'cpu' ? 'CPU' : 'PLAYER 2');
    this.soundSystem = new SoundSystem();

    const keyboard = this.input.keyboard;
    if (!keyboard) {
      throw new Error('Keyboard input is unavailable in this browser.');
    }
    this.debugKey = keyboard.addKey(DEBUG_TOGGLE_KEY);
    this.roundContinueKey = keyboard.addKey(ROUND_CONTINUE_KEY);
    this.debugGraphics = this.add.graphics();
    this.updateHud();
    this.syncFighterVisuals();
  }

  public update(_time: number, delta: number): void {
    if (Phaser.Input.Keyboard.JustDown(this.debugKey)) {
      this.debugEnabled = !this.debugEnabled;
    }

    const continuePressed = Phaser.Input.Keyboard.JustDown(this.roundContinueKey);
    if (continuePressed && this.roundSystem.status !== 'playing') {
      this.soundSystem.play('confirm');
      this.continueAfterRound();
    }

    this.accumulator += delta;

    while (this.accumulator >= FIXED_STEP_MS && this.roundSystem.status === 'playing') {
      this.medalSystem.advanceCooldowns(this.fighters[0]);
      this.medalSystem.advanceCooldowns(this.fighters[1]);
      const player1Input = this.inputSystem.readPlayerInput(1);
      const aiDecision = this.aiSystem?.update(
        this.fighters[0],
        this.fighters[1],
        this.medalSystem,
      ) ?? null;
      let player2Input: FighterInput;
      let manualPlayer2Input: PlayerInput | null = null;
      if (aiDecision) {
        player2Input = aiDecision.input;
      } else {
        manualPlayer2Input = this.inputSystem.readPlayerInput(2);
        player2Input = manualPlayer2Input;
      }
      const statesBefore: [Fighter['state'], Fighter['state']] = [
        this.fighters[0].state,
        this.fighters[1].state,
      ];
      const groundedBefore: [boolean, boolean] = [
        this.fighters[0].grounded,
        this.fighters[1].grounded,
      ];
      this.fighters[0].update(player1Input);
      this.fighters[1].update(player2Input);
      this.playActionSound(player1Input, statesBefore[0], groundedBefore[0], this.fighters[0]);
      this.playActionSound(player2Input, statesBefore[1], groundedBefore[1], this.fighters[1]);

      const player1Swapped = this.processSwapInput(this.fighters[0], player1Input);
      let player2Swapped = false;
      if (aiDecision?.swapSlot) {
        player2Swapped = this.medalSystem.trySwap(this.fighters[1], aiDecision.swapSlot);
      } else if (manualPlayer2Input) {
        player2Swapped = this.processSwapInput(this.fighters[1], manualPlayer2Input);
      }
      if (player1Swapped || player2Swapped) {
        this.soundSystem.play('swap');
      }

      this.fighters[0].faceTowards(this.fighters[1].x);
      this.fighters[1].faceTowards(this.fighters[0].x);
      this.spawnSpecialProjectiles();
      this.resolveCombatFeedback();
      this.roundSystem.update(this.fighters[0], this.fighters[1]);
      if (this.roundSystem.status !== 'playing') {
        this.clearProjectiles();
      }
      this.accumulator -= FIXED_STEP_MS;
    }

    if (this.roundSystem.status !== 'playing') {
      this.accumulator = 0;
    }

    this.updateHud();
    this.syncFighterVisuals();
    this.syncProjectileVisuals();
    this.drawDebugOverlay();
  }

  private createFighters(): [Fighter, Fighter] {
    const fighters: [Fighter, Fighter] = [
      new Fighter(PLAYER_1_START_X),
      new Fighter(PLAYER_2_START_X),
    ];
    fighters.forEach((fighter) => this.medalSystem.initializeFighter(fighter));
    fighters[0].faceTowards(fighters[1].x);
    fighters[1].faceTowards(fighters[0].x);
    return fighters;
  }

  private createFighterVisual(
    fighter: Fighter,
    playerIndex: 0 | 1,
  ): Phaser.GameObjects.Sprite {
    // Sprite dimensions are visual-only; Fighter retains its own hurtbox and attack data.
    const sprite = this.add.sprite(
      fighter.x,
      fighter.y + FIGHTER_HEIGHT,
      FIGHTER_TEXTURES[playerIndex],
      0,
    );
    sprite.setOrigin(0.5, 1);
    sprite.setFlipX(fighter.facing === -1);
    sprite.setDepth(2);
    return sprite;
  }

  private createFighterAnimations(): void {
    for (const textureKey of FIGHTER_TEXTURES) {
      for (const [state, definition] of Object.entries(FIGHTER_SPRITE_ANIMATIONS)) {
        const key = `${textureKey}-${state.toLowerCase()}`;
        if (this.anims.exists(key)) {
          continue;
        }
        this.anims.create({
          key,
          frames: this.anims.generateFrameNumbers(textureKey, {
            frames: [...definition.frames],
          }),
          frameRate: definition.frameRate,
          repeat: definition.repeat,
        });
      }
    }
  }

  private continueAfterRound(): void {
    this.clearProjectiles();
    if (this.roundSystem.status === 'round-end') {
      this.roundSystem.startNextRound();
      this.fighters = this.createFighters();
    } else if (this.roundSystem.status === 'match-end') {
      this.roundSystem.restartMatch();
      this.fighters = this.createFighters();
    }
    this.aiSystem?.reset();
  }

  private playActionSound(
    input: FighterInput,
    stateBefore: Fighter['state'],
    groundedBefore: boolean,
    fighter: Fighter,
  ): void {
    if (stateBefore !== 'ATTACK' && fighter.state === 'ATTACK') {
      if (input.specialPressed) {
        this.soundSystem.play('special');
      } else if (input.heavyAttackPressed) {
        this.soundSystem.play('heavyAttack');
      } else if (input.lightAttackPressed) {
        this.soundSystem.play('lightAttack');
      }
    }

    if (groundedBefore && !fighter.grounded && input.jumpPressed) {
      this.soundSystem.play('jump');
    }
  }

  private resolveCombatFeedback(): void {
    const healthBefore: [number, number] = [this.fighters[0].health, this.fighters[1].health];
    this.combatSystem.resolve(this.fighters, this.projectiles);

    let landedHit = false;
    let blockedHit = false;
    let knockout = false;
    this.fighters.forEach((fighter, index) => {
      if (fighter.health >= healthBefore[index]) {
        return;
      }

      if (fighter.state === 'BLOCK') {
        blockedHit = true;
        this.soundSystem.play('block');
      } else {
        landedHit = true;
        this.soundSystem.play('hit');
      }
      knockout ||= fighter.state === 'KO';
    });

    if (knockout) {
      this.soundSystem.play('ko');
      this.cameras.main.shake(
        SCREEN_SHAKE_KO_FRAMES * FIXED_STEP_MS,
        SCREEN_SHAKE_KO_INTENSITY,
      );
    } else if (landedHit) {
      this.cameras.main.shake(
        SCREEN_SHAKE_HIT_FRAMES * FIXED_STEP_MS,
        SCREEN_SHAKE_HIT_INTENSITY,
      );
    } else if (blockedHit) {
      this.cameras.main.shake(
        SCREEN_SHAKE_BLOCK_FRAMES * FIXED_STEP_MS,
        SCREEN_SHAKE_BLOCK_INTENSITY,
      );
    }
  }

  private processSwapInput(fighter: Fighter, input: PlayerInput): boolean {
    const slot: MedalSlot | null = input.swapHeadPressed
      ? 'head'
      : input.swapArmsPressed
        ? 'arms'
        : input.swapLegsPressed
          ? 'legs'
          : null;
    return slot !== null && this.medalSystem.trySwap(fighter, slot);
  }

  private getMedalStatuses(fighter: Fighter): MedalSlotStatus[] {
    const loadout = this.medalSystem.getLoadout(fighter);
    const cooldowns = this.medalSystem.getCooldowns(fighter);
    return (['head', 'arms', 'legs'] as const).map((slot) => ({
      slot,
      medalName: this.medalSystem.getMedal(loadout[slot]).name,
      cooldownFrames: cooldowns[slot],
    }));
  }

  private spawnSpecialProjectiles(): void {
    for (const fighter of this.fighters) {
      const request = fighter.consumeSpecialProjectile();
      if (request) {
        this.projectiles.push(new Projectile(fighter, request));
      }
    }
  }

  private syncProjectileVisuals(): void {
    const activeProjectiles = this.projectiles.filter((projectile) => projectile.active);
    const activeSet = new Set(activeProjectiles);
    for (const [projectile, visual] of this.projectileVisuals) {
      if (!activeSet.has(projectile)) {
        visual.destroy();
        this.projectileVisuals.delete(projectile);
      }
    }

    for (const projectile of activeProjectiles) {
      let visual = this.projectileVisuals.get(projectile);
      if (!visual) {
        visual = this.add.ellipse(
          projectile.x,
          projectile.y,
          projectile.width,
          projectile.height,
          PROJECTILE_COLOR,
        );
        this.projectileVisuals.set(projectile, visual);
      }
      visual.setPosition(projectile.x, projectile.y);
    }
    this.projectiles = activeProjectiles;
  }

  private clearProjectiles(): void {
    for (const visual of this.projectileVisuals.values()) {
      visual.destroy();
    }
    this.projectileVisuals.clear();
    this.projectiles = [];
  }

  private updateHud(): void {
    this.hud.updateHealth(this.fighters[0].health, this.fighters[1].health);
    this.hud.updateTimer(this.roundSystem.remainingFrames);
    this.hud.updateScore(
      this.roundSystem.roundNumber,
      this.roundSystem.player1RoundWins,
      this.roundSystem.player2RoundWins,
    );
    this.hud.updateMedals(
      this.getMedalStatuses(this.fighters[0]),
      this.getMedalStatuses(this.fighters[1]),
      this.medalSystem.getActiveSetBonus(this.fighters[0])?.name ?? null,
      this.medalSystem.getActiveSetBonus(this.fighters[1])?.name ?? null,
    );

    if (this.roundSystem.status === 'playing') {
      this.hud.hideRoundEnd();
      return;
    }

    const opponentScoreLabel = this.gameMode === 'cpu' ? 'CPU' : 'P2';
    const score = `P1 ${this.roundSystem.player1RoundWins} — ${this.roundSystem.player2RoundWins} ${opponentScoreLabel}`;
    if (this.roundSystem.status === 'round-end') {
      this.hud.showRoundEnd(
        this.roundTitle(this.roundSystem.roundWinner, this.roundSystem.roundNumber),
        `Round score: ${score}`,
        'Press Enter to start the next round',
      );
      return;
    }

    const matchWinnerLabel = this.gameMode === 'cpu' && this.roundSystem.matchWinner === 2
      ? 'CPU'
      : `PLAYER ${this.roundSystem.matchWinner}`;
    const matchTitle = this.roundSystem.matchWinner === 'draw'
      ? 'MATCH DRAW'
      : `${matchWinnerLabel} WINS THE MATCH`;
    this.hud.showRoundEnd(
      matchTitle,
      `Final score: ${score}`,
      'Press Enter to play again',
    );
  }

  private roundTitle(winner: RoundWinner | null, roundNumber: number): string {
    if (winner === 'draw' || winner === null) {
      return `ROUND ${roundNumber} DRAW`;
    }
    const winnerLabel = this.gameMode === 'cpu' && winner === 2
      ? 'CPU'
      : `PLAYER ${winner}`;
    return `${winnerLabel} WINS ROUND ${roundNumber}`;
  }

  private syncFighterVisuals(): void {
    this.fighters.forEach((fighter, index) => {
      const sprite = this.fighterSprites[index];
      sprite.setPosition(fighter.x, fighter.y + FIGHTER_HEIGHT);
      sprite.setFlipX(fighter.facing === -1);
      sprite.setAlpha(fighter.state === 'KO' ? KO_SPRITE_ALPHA : 1);

      const animationKey = `${FIGHTER_TEXTURES[index]}-${fighter.state.toLowerCase()}`;
      if (this.currentSpriteAnimations[index] !== animationKey) {
        sprite.play(animationKey, true);
        this.currentSpriteAnimations[index] = animationKey;
      }
    });
  }

  private drawDebugOverlay(): void {
    this.debugGraphics.clear();
    if (!this.debugEnabled) {
      return;
    }

    this.fighters.forEach((fighter) => {
      this.drawDebugBox(fighter.getHurtbox(), DEBUG_HURTBOX_COLOR);
      const attackHitbox = fighter.getAttackHitbox();
      if (attackHitbox) {
        this.drawDebugBox(attackHitbox, DEBUG_HITBOX_COLOR);
      }
    });
    this.projectiles.forEach((projectile) => {
      this.drawDebugBox(projectile.getHitbox(), DEBUG_HITBOX_COLOR);
    });
  }

  private drawDebugBox(box: CombatBox, color: number): void {
    this.debugGraphics.fillStyle(color, 0.2);
    this.debugGraphics.fillRect(box.x, box.y, box.width, box.height);
    this.debugGraphics.lineStyle(DEBUG_BOX_LINE_WIDTH, color, 1);
    this.debugGraphics.strokeRect(box.x, box.y, box.width, box.height);
  }
}
