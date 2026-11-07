import Phaser from 'phaser';
import { FIXED_UPDATES_PER_SECOND, GAME_HEIGHT, GAME_WIDTH } from './config';
import { BootScene } from './scenes/BootScene';
import { FightScene } from './scenes/FightScene';
import { MenuScene } from './scenes/MenuScene';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#111827',
  fps: {
    target: FIXED_UPDATES_PER_SECOND,
    forceSetTimeOut: true,
  },
  render: {
    antialias: false,
    pixelArt: true,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, MenuScene, FightScene],
});
