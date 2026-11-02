import Phaser from 'phaser';
import {
  GAME_WIDTH,
  HUD_BACKGROUND_COLOR,
  HUD_HEALTH_BAR_HEIGHT,
  HUD_HEALTH_BAR_WIDTH,
  HUD_HEALTH_BAR_Y,
  HUD_LABEL_Y,
  HUD_MARGIN,
  MAX_HEALTH,
  PLAYER_1_HEALTH_COLOR,
  PLAYER_2_HEALTH_COLOR,
} from '../config';

/** Lightweight health-bar presentation; match rules stay in the fighter/combat model. */
export class Hud {
  private readonly player1Fill: Phaser.GameObjects.Rectangle;
  private readonly player2Fill: Phaser.GameObjects.Rectangle;

  public constructor(scene: Phaser.Scene) {
    scene.add.text(HUD_MARGIN, HUD_LABEL_Y, 'PLAYER 1', {
      color: '#f5d0fe',
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
    });
    scene.add.text(GAME_WIDTH - HUD_MARGIN, HUD_LABEL_Y, 'PLAYER 2', {
      color: '#a5f3fc',
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
    }).setOrigin(1, 0);

    scene.add.rectangle(
      HUD_MARGIN,
      HUD_HEALTH_BAR_Y,
      HUD_HEALTH_BAR_WIDTH,
      HUD_HEALTH_BAR_HEIGHT,
      HUD_BACKGROUND_COLOR,
    ).setOrigin(0, 0.5);
    scene.add.rectangle(
      GAME_WIDTH - HUD_MARGIN,
      HUD_HEALTH_BAR_Y,
      HUD_HEALTH_BAR_WIDTH,
      HUD_HEALTH_BAR_HEIGHT,
      HUD_BACKGROUND_COLOR,
    ).setOrigin(1, 0.5);

    this.player1Fill = scene.add.rectangle(
      HUD_MARGIN,
      HUD_HEALTH_BAR_Y,
      HUD_HEALTH_BAR_WIDTH,
      HUD_HEALTH_BAR_HEIGHT,
      PLAYER_1_HEALTH_COLOR,
    ).setOrigin(0, 0.5);
    this.player2Fill = scene.add.rectangle(
      GAME_WIDTH - HUD_MARGIN,
      HUD_HEALTH_BAR_Y,
      HUD_HEALTH_BAR_WIDTH,
      HUD_HEALTH_BAR_HEIGHT,
      PLAYER_2_HEALTH_COLOR,
    ).setOrigin(1, 0.5);
  }

  public updateHealth(player1Health: number, player2Health: number): void {
    this.player1Fill.setScale(player1Health / MAX_HEALTH, 1);
    this.player2Fill.setScale(player2Health / MAX_HEALTH, 1);
  }
}
