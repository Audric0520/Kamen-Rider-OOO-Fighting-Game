import Phaser from 'phaser';
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  HUD_BACKGROUND_COLOR,
  HUD_HEALTH_BAR_HEIGHT,
  HUD_HEALTH_BAR_WIDTH,
  HUD_HEALTH_BAR_Y,
  HUD_LABEL_Y,
  HUD_MARGIN,
  HUD_SCORE_Y,
  HUD_TIMER_Y,
  MAX_HEALTH,
  PLAYER_1_HEALTH_COLOR,
  PLAYER_2_HEALTH_COLOR,
  ROUND_OVERLAY_ALPHA,
  ROUND_OVERLAY_COLOR,
  ROUND_PANEL_COLOR,
  ROUND_PANEL_DETAIL_Y,
  ROUND_PANEL_HEIGHT,
  ROUND_PANEL_PROMPT_Y,
  ROUND_PANEL_TITLE_Y,
  ROUND_PANEL_WIDTH,
  SECONDS_PER_MINUTE,
  FIXED_UPDATES_PER_SECOND,
} from '../config';

/** Match HUD and round-end presentation; match rules stay in RoundSystem. */
export class Hud {
  private readonly player1Fill: Phaser.GameObjects.Rectangle;
  private readonly player2Fill: Phaser.GameObjects.Rectangle;
  private readonly timerText: Phaser.GameObjects.Text;
  private readonly scoreText: Phaser.GameObjects.Text;
  private readonly overlayBackground: Phaser.GameObjects.Rectangle;
  private readonly overlayPanel: Phaser.GameObjects.Rectangle;
  private readonly overlayTitle: Phaser.GameObjects.Text;
  private readonly overlayDetail: Phaser.GameObjects.Text;
  private readonly overlayPrompt: Phaser.GameObjects.Text;

  public constructor(scene: Phaser.Scene) {
    scene.add.text(HUD_MARGIN, HUD_LABEL_Y, 'PLAYER 1', {
      color: '#f5d0fe',
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
    });
    scene.add.text(GAME_WIDTH / 2, HUD_LABEL_Y, 'TIME', {
      color: '#cbd5e1',
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);
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

    this.timerText = scene.add.text(GAME_WIDTH / 2, HUD_TIMER_Y, '2:00', {
      color: '#f8fafc',
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.scoreText = scene.add.text(GAME_WIDTH / 2, HUD_SCORE_Y, '', {
      color: '#e2e8f0',
      fontFamily: 'Arial, sans-serif',
      fontSize: '15px',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.overlayBackground = scene.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      ROUND_OVERLAY_COLOR,
    ).setAlpha(ROUND_OVERLAY_ALPHA).setVisible(false);
    this.overlayPanel = scene.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      ROUND_PANEL_WIDTH,
      ROUND_PANEL_HEIGHT,
      ROUND_PANEL_COLOR,
    ).setStrokeStyle(2, 0x64748b).setVisible(false);
    this.overlayTitle = scene.add.text(GAME_WIDTH / 2, ROUND_PANEL_TITLE_Y, '', {
      color: '#f8fafc',
      fontFamily: 'Arial, sans-serif',
      fontSize: '28px',
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5).setVisible(false);
    this.overlayDetail = scene.add.text(GAME_WIDTH / 2, ROUND_PANEL_DETAIL_Y, '', {
      color: '#cbd5e1',
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      align: 'center',
    }).setOrigin(0.5).setVisible(false);
    this.overlayPrompt = scene.add.text(GAME_WIDTH / 2, ROUND_PANEL_PROMPT_Y, '', {
      color: '#67e8f9',
      fontFamily: 'Arial, sans-serif',
      fontSize: '15px',
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5).setVisible(false);
  }

  public updateHealth(player1Health: number, player2Health: number): void {
    this.player1Fill.setScale(player1Health / MAX_HEALTH, 1);
    this.player2Fill.setScale(player2Health / MAX_HEALTH, 1);
  }

  public updateTimer(remainingFrames: number): void {
    const totalSeconds = Math.ceil(remainingFrames / FIXED_UPDATES_PER_SECOND);
    const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
    const seconds = totalSeconds % SECONDS_PER_MINUTE;
    this.timerText.setText(`${minutes}:${seconds.toString().padStart(2, '0')}`);
  }

  public updateScore(roundNumber: number, player1Wins: number, player2Wins: number): void {
    this.scoreText.setText(`ROUND ${roundNumber}     P1 ${player1Wins} — ${player2Wins} P2`);
  }

  public showRoundEnd(title: string, detail: string, prompt: string): void {
    this.overlayTitle.setText(title);
    this.overlayDetail.setText(detail);
    this.overlayPrompt.setText(prompt);
    this.overlayBackground.setVisible(true);
    this.overlayPanel.setVisible(true);
    this.overlayTitle.setVisible(true);
    this.overlayDetail.setVisible(true);
    this.overlayPrompt.setVisible(true);
  }

  public hideRoundEnd(): void {
    this.overlayBackground.setVisible(false);
    this.overlayPanel.setVisible(false);
    this.overlayTitle.setVisible(false);
    this.overlayDetail.setVisible(false);
    this.overlayPrompt.setVisible(false);
  }
}
