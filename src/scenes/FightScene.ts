import Phaser from 'phaser';
import {
  FIXED_STEP_MS,
  FIGHTER_FACING_MARKER_HEIGHT,
  FIGHTER_FACING_MARKER_INSET,
  FIGHTER_FACING_MARKER_WIDTH,
  FIGHTER_HEIGHT,
  FIGHTER_WIDTH,
  GAME_HEIGHT,
  GAME_WIDTH,
  GROUND_Y,
  PLAYER_1_START_X,
  PLAYER_2_START_X,
  STAGE_LEFT,
  STAGE_RIGHT,
} from '../config';
import { Fighter } from '../entities/Fighter';
import { InputSystem } from '../systems/InputSystem';

export class FightScene extends Phaser.Scene {
  private fighters!: [Fighter, Fighter];
  private fighterShapes!: [Phaser.GameObjects.Rectangle, Phaser.GameObjects.Rectangle];
  private facingMarkers!: [Phaser.GameObjects.Rectangle, Phaser.GameObjects.Rectangle];
  private inputSystem!: InputSystem;
  private accumulator = 0;

  public constructor() {
    super('FightScene');
  }

  public create(): void {
    this.cameras.main.setBackgroundColor('#111827');

    this.add.text(GAME_WIDTH / 2, 48, 'OOO Fighter', {
      color: '#f9fafb',
      fontFamily: 'Arial, sans-serif',
      fontSize: '32px',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 88, 'P1: A / D move, W jump     |     P2: ← / → move, ↑ jump', {
      color: '#cbd5e1',
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
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

    const [player1Shape, player1Marker] = this.createFighterVisual(
      this.fighters[0],
      0xd946ef,
      0xf5d0fe,
    );
    const [player2Shape, player2Marker] = this.createFighterVisual(
      this.fighters[1],
      0x0891b2,
      0xa5f3fc,
    );
    this.fighterShapes = [player1Shape, player2Shape];
    this.facingMarkers = [player1Marker, player2Marker];

    this.inputSystem = new InputSystem(this);
    this.syncFighterVisuals();
  }

  public update(_time: number, delta: number): void {
    this.accumulator += delta;

    while (this.accumulator >= FIXED_STEP_MS) {
      this.fighters[0].update(this.inputSystem.readPlayerInput(1));
      this.fighters[1].update(this.inputSystem.readPlayerInput(2));
      this.fighters[0].faceTowards(this.fighters[1].x);
      this.fighters[1].faceTowards(this.fighters[0].x);
      this.accumulator -= FIXED_STEP_MS;
    }

    this.syncFighterVisuals();
  }

  private createFighterVisual(
    fighter: Fighter,
    bodyColor: number,
    markerColor: number,
  ): [Phaser.GameObjects.Rectangle, Phaser.GameObjects.Rectangle] {
    const body = this.add.rectangle(
      fighter.x,
      fighter.y + FIGHTER_HEIGHT / 2,
      FIGHTER_WIDTH,
      FIGHTER_HEIGHT,
      bodyColor,
    );
    body.setStrokeStyle(3, markerColor);

    const facingMarker = this.add.rectangle(
      fighter.x,
      fighter.y + FIGHTER_HEIGHT / 3,
      FIGHTER_FACING_MARKER_WIDTH,
      FIGHTER_FACING_MARKER_HEIGHT,
      markerColor,
    );

    return [body, facingMarker];
  }

  private syncFighterVisuals(): void {
    this.fighters.forEach((fighter, index) => {
      this.fighterShapes[index].setPosition(
        fighter.x,
        fighter.y + FIGHTER_HEIGHT / 2,
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
}
