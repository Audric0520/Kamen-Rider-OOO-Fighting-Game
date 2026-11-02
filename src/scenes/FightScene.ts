import Phaser from 'phaser';
import {
  DEBUG_BOX_LINE_WIDTH,
  DEBUG_HITBOX_COLOR,
  DEBUG_HURTBOX_COLOR,
  DEBUG_TOGGLE_KEY,
  FIXED_STEP_MS,
  FIGHTER_FACING_MARKER_HEIGHT,
  FIGHTER_FACING_MARKER_INSET,
  FIGHTER_FACING_MARKER_WIDTH,
  FIGHTER_HEIGHT,
  FIGHTER_WIDTH,
  GAME_HEIGHT,
  GAME_WIDTH,
  GROUND_Y,
  HUD_CONTROLS_Y,
  HUD_TITLE_Y,
  KO_FIGHTER_COLOR,
  PLAYER_1_START_X,
  PLAYER_2_START_X,
  STAGE_LEFT,
  STAGE_RIGHT,
} from '../config';
import { Fighter, type CombatBox } from '../entities/Fighter';
import { CombatSystem } from '../systems/CombatSystem';
import { InputSystem } from '../systems/InputSystem';
import { Hud } from '../ui/Hud';

const FIGHTER_BODY_COLORS: [number, number] = [0xd946ef, 0x0891b2];
const FIGHTER_MARKER_COLORS: [number, number] = [0xf5d0fe, 0xa5f3fc];

export class FightScene extends Phaser.Scene {
  private fighters!: [Fighter, Fighter];
  private fighterShapes!: [Phaser.GameObjects.Rectangle, Phaser.GameObjects.Rectangle];
  private facingMarkers!: [Phaser.GameObjects.Rectangle, Phaser.GameObjects.Rectangle];
  private inputSystem!: InputSystem;
  private combatSystem!: CombatSystem;
  private hud!: Hud;
  private debugKey!: Phaser.Input.Keyboard.Key;
  private debugGraphics!: Phaser.GameObjects.Graphics;
  private accumulator = 0;
  private debugEnabled = false;

  public constructor() {
    super('FightScene');
  }

  public create(): void {
    this.cameras.main.setBackgroundColor('#111827');

    this.add.text(GAME_WIDTH / 2, HUD_TITLE_Y, 'OOO Fighter', {
      color: '#f9fafb',
      fontFamily: 'Arial, sans-serif',
      fontSize: '32px',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, HUD_CONTROLS_Y, 'P1: A / D move, W jump, J / K attack     |     P2: ← / → move, ↑ jump, Numpad 1 / 2 attack', {
      color: '#cbd5e1',
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
    }).setOrigin(0.5);

    const stage = this.add.graphics();
    stage.fillStyle(0x1e293b, 1);
    stage.fillRect(STAGE_LEFT, GROUND_Y + 2, STAGE_RIGHT - STAGE_LEFT, GAME_HEIGHT - GROUND_Y - 42);
    stage.lineStyle(4, 0x64748b, 1);
    stage.lineBetween(STAGE_LEFT, GROUND_Y, STAGE_RIGHT, GROUND_Y);
    stage.lineStyle(2, 0x334155, 1);
    stage.lineBetween(STAGE_LEFT, GROUND_Y, STAGE_LEFT, GAME_HEIGHT - 42);
    stage.lineBetween(STAGE_RIGHT, GROUND_Y, STAGE_RIGHT, GAME_HEIGHT - 42);

    this.fighters = [new Fighter(PLAYER_1_START_X), new Fighter(PLAYER_2_START_X)];
    this.fighters[0].faceTowards(this.fighters[1].x);
    this.fighters[1].faceTowards(this.fighters[0].x);

    const player1Visual = this.createFighterVisual(this.fighters[0], 0);
    const player2Visual = this.createFighterVisual(this.fighters[1], 1);
    this.fighterShapes = [player1Visual[0], player2Visual[0]];
    this.facingMarkers = [player1Visual[1], player2Visual[1]];

    this.inputSystem = new InputSystem(this);
    this.combatSystem = new CombatSystem();
    this.hud = new Hud(this);
    this.hud.updateHealth(this.fighters[0].health, this.fighters[1].health);

    const keyboard = this.input.keyboard;
    if (!keyboard) {
      throw new Error('Keyboard input is unavailable in this browser.');
    }
    this.debugKey = keyboard.addKey(DEBUG_TOGGLE_KEY);
    this.debugGraphics = this.add.graphics();
    this.syncFighterVisuals();
  }

  public update(_time: number, delta: number): void {
    if (Phaser.Input.Keyboard.JustDown(this.debugKey)) {
      this.debugEnabled = !this.debugEnabled;
    }

    this.accumulator += delta;

    while (this.accumulator >= FIXED_STEP_MS) {
      this.fighters[0].update(this.inputSystem.readPlayerInput(1));
      this.fighters[1].update(this.inputSystem.readPlayerInput(2));
      this.fighters[0].faceTowards(this.fighters[1].x);
      this.fighters[1].faceTowards(this.fighters[0].x);
      this.combatSystem.resolve(this.fighters);
      this.accumulator -= FIXED_STEP_MS;
    }

    this.hud.updateHealth(this.fighters[0].health, this.fighters[1].health);
    this.syncFighterVisuals();
    this.drawDebugOverlay();
  }

  private createFighterVisual(
    fighter: Fighter,
    playerIndex: 0 | 1,
  ): [Phaser.GameObjects.Rectangle, Phaser.GameObjects.Rectangle] {
    const body = this.add.rectangle(
      fighter.x,
      fighter.y + FIGHTER_HEIGHT / 2,
      FIGHTER_WIDTH,
      FIGHTER_HEIGHT,
      FIGHTER_BODY_COLORS[playerIndex],
    );
    body.setStrokeStyle(3, FIGHTER_MARKER_COLORS[playerIndex]);

    const facingMarker = this.add.rectangle(
      fighter.x,
      fighter.y + FIGHTER_HEIGHT / 3,
      FIGHTER_FACING_MARKER_WIDTH,
      FIGHTER_FACING_MARKER_HEIGHT,
      FIGHTER_MARKER_COLORS[playerIndex],
    );

    return [body, facingMarker];
  }

  private syncFighterVisuals(): void {
    this.fighters.forEach((fighter, index) => {
      this.fighterShapes[index].setPosition(
        fighter.x,
        fighter.y + FIGHTER_HEIGHT / 2,
      );
      this.fighterShapes[index].setFillStyle(
        fighter.state === 'KO' ? KO_FIGHTER_COLOR : FIGHTER_BODY_COLORS[index],
      );
      this.facingMarkers[index].setPosition(
        fighter.x + fighter.facing * (
          FIGHTER_WIDTH / 2
          - FIGHTER_FACING_MARKER_INSET
          - FIGHTER_FACING_MARKER_WIDTH / 2
        ),
        fighter.y + FIGHTER_HEIGHT / 3,
      );
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
  }

  private drawDebugBox(box: CombatBox, color: number): void {
    this.debugGraphics.fillStyle(color, 0.2);
    this.debugGraphics.fillRect(box.x, box.y, box.width, box.height);
    this.debugGraphics.lineStyle(DEBUG_BOX_LINE_WIDTH, color, 1);
    this.debugGraphics.strokeRect(box.x, box.y, box.width, box.height);
  }
}
