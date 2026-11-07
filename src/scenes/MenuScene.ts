import Phaser from 'phaser';
import {
  FIGHTER_PLAYER_1_SHEET,
  FIGHTER_PLAYER_1_TEXTURE,
  FIGHTER_PLAYER_2_SHEET,
  FIGHTER_PLAYER_2_TEXTURE,
  FIGHTER_SPRITE_ANIMATIONS,
  FIGHTER_SPRITE_FRAME_HEIGHT,
  FIGHTER_SPRITE_FRAME_WIDTH,
  GAME_WIDTH,
  MENU_ACCENT_COLOR,
  MENU_BACKGROUND_COLOR,
  MENU_DOWN_KEY,
  MENU_FIGHTER_Y,
  MENU_HELP_Y,
  MENU_OPTION_SPACING,
  MENU_OPTIONS_START_Y,
  MENU_PANEL_HEIGHT,
  MENU_PANEL_WIDTH,
  MENU_PANEL_Y,
  MENU_P1_COLOR,
  MENU_P2_COLOR,
  MENU_SUBTITLE_Y,
  MENU_TITLE_Y,
  MENU_UP_KEY,
  ROUND_CONTINUE_KEY,
  type GameMode,
} from '../config';
import { SoundSystem } from '../systems/SoundSystem';

const MODE_OPTIONS: ReadonlyArray<{ mode: GameMode; label: string }> = [
  { mode: 'cpu', label: '1 PLAYER VS CPU' },
  { mode: 'two-player', label: '2 PLAYERS' },
];

/** Title and mode selection screen. */
export class MenuScene extends Phaser.Scene {
  private selectedIndex = 1;
  private optionTexts: Phaser.GameObjects.Text[] = [];
  private optionPanels: Phaser.GameObjects.Rectangle[] = [];
  private upKey!: Phaser.Input.Keyboard.Key;
  private downKey!: Phaser.Input.Keyboard.Key;
  private startKey!: Phaser.Input.Keyboard.Key;
  private readonly soundSystem = new SoundSystem();

  public constructor() {
    super('MenuScene');
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
    this.cameras.main.setBackgroundColor(MENU_BACKGROUND_COLOR);
    this.createBackdrop();
    this.createTitleDecorations();
    this.createFighterDecorations();

    this.add.text(GAME_WIDTH / 2, MENU_TITLE_Y, 'OOO FIGHTER', {
      color: '#f8fafc',
      fontFamily: 'Arial, sans-serif',
      fontSize: '42px',
      fontStyle: 'bold',
      stroke: '#020617',
      strokeThickness: 6,
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, MENU_SUBTITLE_Y, 'MEDAL FIGHTER  •  CHOOSE YOUR BATTLE', {
      color: '#cbd5e1',
      fontFamily: 'Arial, sans-serif',
      fontSize: '15px',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.optionPanels = MODE_OPTIONS.map((_, index) => this.add.rectangle(
      GAME_WIDTH / 2,
      MENU_OPTIONS_START_Y + index * MENU_OPTION_SPACING,
      MENU_PANEL_WIDTH,
      MENU_PANEL_HEIGHT / 4,
      0x1e293b,
      0.94,
    ).setStrokeStyle(2, 0x475569, 0.9));
    this.optionTexts = MODE_OPTIONS.map((option, index) => this.add.text(
      GAME_WIDTH / 2,
      MENU_OPTIONS_START_Y + index * MENU_OPTION_SPACING,
      option.label,
      {
        color: '#94a3b8',
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        fontStyle: 'bold',
      },
    ).setOrigin(0.5));

    this.add.text(GAME_WIDTH / 2, MENU_HELP_Y, 'UP / DOWN  SELECT     ENTER  START', {
      color: '#cbd5e1',
      fontFamily: 'Arial, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const keyboard = this.input.keyboard;
    if (!keyboard) {
      throw new Error('Keyboard input is unavailable in this browser.');
    }
    keyboard.on('keydown', () => this.soundSystem.unlock());
    this.upKey = keyboard.addKey(MENU_UP_KEY);
    this.downKey = keyboard.addKey(MENU_DOWN_KEY);
    this.startKey = keyboard.addKey(ROUND_CONTINUE_KEY);
    this.updateOptionStyles();
  }

  public update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.upKey)) {
      this.selectedIndex = (this.selectedIndex + MODE_OPTIONS.length - 1) % MODE_OPTIONS.length;
      this.soundSystem.play('menuMove');
      this.updateOptionStyles();
    } else if (Phaser.Input.Keyboard.JustDown(this.downKey)) {
      this.selectedIndex = (this.selectedIndex + 1) % MODE_OPTIONS.length;
      this.soundSystem.play('menuMove');
      this.updateOptionStyles();
    }

    if (Phaser.Input.Keyboard.JustDown(this.startKey)) {
      this.soundSystem.play('confirm');
      this.scene.start('FightScene', { mode: MODE_OPTIONS[this.selectedIndex].mode });
    }
  }

  private createBackdrop(): void {
    this.add.rectangle(
      GAME_WIDTH / 2,
      MENU_PANEL_Y,
      MENU_PANEL_WIDTH + 20,
      MENU_PANEL_HEIGHT,
      0x0f172a,
      0.78,
    ).setStrokeStyle(2, 0x334155, 1);

    const floor = this.add.graphics();
    floor.lineStyle(2, 0x334155, 0.9);
    floor.lineBetween(74, MENU_FIGHTER_Y + 4, GAME_WIDTH - 74, MENU_FIGHTER_Y + 4);
    floor.lineStyle(1, 0x1e293b, 1);
    floor.lineBetween(74, MENU_FIGHTER_Y + 14, GAME_WIDTH - 74, MENU_FIGHTER_Y + 14);
    for (let x = 92; x <= GAME_WIDTH - 92; x += 48) {
      floor.lineBetween(x, MENU_FIGHTER_Y + 5, x - 24, MENU_FIGHTER_Y + 14);
    }
  }

  private createTitleDecorations(): void {
    const medalColors = [MENU_P1_COLOR, MENU_ACCENT_COLOR, 0x22c55e];
    medalColors.forEach((color, index) => {
      const x = GAME_WIDTH / 2 - 42 + index * 42;
      this.add.circle(x, 56, 11, color).setStrokeStyle(3, 0xf8fafc, 0.8);
      this.add.circle(x, 56, 4, 0x0f172a);
    });

    const sideAccent = this.add.graphics();
    sideAccent.lineStyle(2, MENU_ACCENT_COLOR, 0.42);
    sideAccent.lineBetween(142, MENU_TITLE_Y, 286, MENU_TITLE_Y);
    sideAccent.lineBetween(GAME_WIDTH - 142, MENU_TITLE_Y, GAME_WIDTH - 286, MENU_TITLE_Y);
  }

  private createFighterDecorations(): void {
    const idle = FIGHTER_SPRITE_ANIMATIONS.IDLE;
    for (const textureKey of [FIGHTER_PLAYER_1_TEXTURE, FIGHTER_PLAYER_2_TEXTURE]) {
      const animationKey = `${textureKey}-menu-idle`;
      if (!this.anims.exists(animationKey)) {
        this.anims.create({
          key: animationKey,
          frames: this.anims.generateFrameNumbers(textureKey, { frames: [...idle.frames] }),
          frameRate: idle.frameRate,
          repeat: -1,
        });
      }
    }

    const player1 = this.add.sprite(160, MENU_FIGHTER_Y, FIGHTER_PLAYER_1_TEXTURE, 0);
    player1.setOrigin(0.5, 1).setFlipX(false).setDepth(2).play(`${FIGHTER_PLAYER_1_TEXTURE}-menu-idle`);
    const player2 = this.add.sprite(GAME_WIDTH - 160, MENU_FIGHTER_Y, FIGHTER_PLAYER_2_TEXTURE, 0);
    player2.setOrigin(0.5, 1).setFlipX(true).setDepth(2).play(`${FIGHTER_PLAYER_2_TEXTURE}-menu-idle`);

    this.add.circle(160, MENU_FIGHTER_Y - 14, 48, MENU_P1_COLOR, 0.09);
    this.add.circle(GAME_WIDTH - 160, MENU_FIGHTER_Y - 14, 48, MENU_P2_COLOR, 0.09);
  }

  private updateOptionStyles(): void {
    this.optionTexts.forEach((text, index) => {
      const selected = index === this.selectedIndex;
      const optionY = MENU_OPTIONS_START_Y + index * MENU_OPTION_SPACING;
      const panel = this.optionPanels[index];
      panel
        .setPosition(GAME_WIDTH / 2, optionY)
        .setFillStyle(selected ? 0x334155 : 0x1e293b, selected ? 1 : 0.88)
        .setStrokeStyle(selected ? 3 : 1, selected ? MENU_ACCENT_COLOR : 0x475569, 1);
      text
        .setText(`${selected ? '▶  ' : '   '}${MODE_OPTIONS[index].label}`)
        .setPosition(GAME_WIDTH / 2, optionY)
        .setColor(selected ? '#fbbf24' : '#cbd5e1');
    });
  }
}
