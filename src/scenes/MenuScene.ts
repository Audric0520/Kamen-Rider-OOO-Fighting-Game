import Phaser from 'phaser';
import {
  GAME_WIDTH,
  MENU_DOWN_KEY,
  MENU_HELP_Y,
  MENU_OPTION_SPACING,
  MENU_OPTIONS_START_Y,
  MENU_SUBTITLE_Y,
  MENU_TITLE_Y,
  MENU_UP_KEY,
  ROUND_CONTINUE_KEY,
  type GameMode,
} from '../config';

const MODE_OPTIONS: ReadonlyArray<{ mode: GameMode; label: string }> = [
  { mode: 'cpu', label: '1 PLAYER VS CPU' },
  { mode: 'two-player', label: '2 PLAYERS' },
];

/** Mode selection screen; the default selection preserves local two-player play. */
export class MenuScene extends Phaser.Scene {
  private selectedIndex = 1;
  private optionTexts: Phaser.GameObjects.Text[] = [];
  private upKey!: Phaser.Input.Keyboard.Key;
  private downKey!: Phaser.Input.Keyboard.Key;
  private startKey!: Phaser.Input.Keyboard.Key;

  public constructor() {
    super('MenuScene');
  }

  public create(): void {
    this.cameras.main.setBackgroundColor('#111827');
    this.add.text(GAME_WIDTH / 2, MENU_TITLE_Y, 'OOO Fighter', {
      color: '#f8fafc',
      fontFamily: 'Arial, sans-serif',
      fontSize: '42px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, MENU_SUBTITLE_Y, 'Choose a game mode', {
      color: '#cbd5e1',
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
    }).setOrigin(0.5);

    this.optionTexts = MODE_OPTIONS.map((option, index) => this.add.text(
      GAME_WIDTH / 2,
      MENU_OPTIONS_START_Y + index * MENU_OPTION_SPACING,
      option.label,
      {
        color: '#94a3b8',
        fontFamily: 'Arial, sans-serif',
        fontSize: '26px',
        fontStyle: 'bold',
      },
    ).setOrigin(0.5));

    this.add.text(GAME_WIDTH / 2, MENU_HELP_Y, 'Use Up / Down to choose, Enter to start', {
      color: '#94a3b8',
      fontFamily: 'Arial, sans-serif',
      fontSize: '15px',
    }).setOrigin(0.5);

    const keyboard = this.input.keyboard;
    if (!keyboard) {
      throw new Error('Keyboard input is unavailable in this browser.');
    }
    this.upKey = keyboard.addKey(MENU_UP_KEY);
    this.downKey = keyboard.addKey(MENU_DOWN_KEY);
    this.startKey = keyboard.addKey(ROUND_CONTINUE_KEY);
    this.updateOptionStyles();
  }

  public update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.upKey)) {
      this.selectedIndex = (this.selectedIndex + MODE_OPTIONS.length - 1) % MODE_OPTIONS.length;
      this.updateOptionStyles();
    } else if (Phaser.Input.Keyboard.JustDown(this.downKey)) {
      this.selectedIndex = (this.selectedIndex + 1) % MODE_OPTIONS.length;
      this.updateOptionStyles();
    }

    if (Phaser.Input.Keyboard.JustDown(this.startKey)) {
      this.scene.start('FightScene', { mode: MODE_OPTIONS[this.selectedIndex].mode });
    }
  }

  private updateOptionStyles(): void {
    this.optionTexts.forEach((text, index) => {
      const selected = index === this.selectedIndex;
      const optionY = MENU_OPTIONS_START_Y + index * MENU_OPTION_SPACING;
      text
        .setText(`${selected ? '▶ ' : '  '}${MODE_OPTIONS[index].label}`)
        .setPosition(GAME_WIDTH / 2, optionY)
        .setColor(selected ? '#fbbf24' : '#94a3b8');
    });
  }
}
