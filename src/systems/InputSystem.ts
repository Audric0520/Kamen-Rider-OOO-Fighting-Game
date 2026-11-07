import Phaser from 'phaser';
import { PLAYER_1_KEYS, PLAYER_2_KEYS } from '../config';
import type { FighterInput } from '../entities/Fighter';
import { DirectionTapTracker } from './DirectionTapTracker';

interface PlayerKeyMap {
  left: string;
  right: string;
  jump: string;
  block: string;
  lightAttack: string;
  heavyAttack: string;
  special: string;
  swapHead: string;
  swapArms: string;
  swapLegs: string;
}

interface BoundPlayerKeys {
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  jump: Phaser.Input.Keyboard.Key;
  block: Phaser.Input.Keyboard.Key;
  lightAttack: Phaser.Input.Keyboard.Key;
  heavyAttack: Phaser.Input.Keyboard.Key;
  special: Phaser.Input.Keyboard.Key;
  swapHead: Phaser.Input.Keyboard.Key;
  swapArms: Phaser.Input.Keyboard.Key;
  swapLegs: Phaser.Input.Keyboard.Key;
}

export interface PlayerInput extends FighterInput {
  lightAttackPressed: boolean;
  heavyAttackPressed: boolean;
  specialPressed: boolean;
  swapHeadPressed: boolean;
  swapArmsPressed: boolean;
  swapLegsPressed: boolean;
}

/** Converts the two design-doc key maps into one simulation input frame per player. */
export class InputSystem {
  private readonly player1Keys: BoundPlayerKeys;
  private readonly player2Keys: BoundPlayerKeys;
  private readonly dashTapTrackers: Record<1 | 2, DirectionTapTracker> = {
    1: new DirectionTapTracker(),
    2: new DirectionTapTracker(),
  };

  public constructor(scene: Phaser.Scene) {
    const keyboard = scene.input.keyboard;
    if (!keyboard) {
      throw new Error('Keyboard input is unavailable in this browser.');
    }

    this.player1Keys = this.bindKeys(keyboard, PLAYER_1_KEYS);
    this.player2Keys = this.bindKeys(keyboard, PLAYER_2_KEYS);
  }

  public readPlayerInput(player: 1 | 2): PlayerInput {
    const keys = player === 1 ? this.player1Keys : this.player2Keys;
    const leftPressed = Phaser.Input.Keyboard.JustDown(keys.left);
    const rightPressed = Phaser.Input.Keyboard.JustDown(keys.right);
    const dashDirection = this.dashTapTrackers[player].advance(leftPressed, rightPressed);

    return {
      left: keys.left.isDown,
      right: keys.right.isDown,
      jumpPressed: Phaser.Input.Keyboard.JustDown(keys.jump),
      blockHeld: keys.block.isDown,
      lightAttackPressed: Phaser.Input.Keyboard.JustDown(keys.lightAttack),
      heavyAttackPressed: Phaser.Input.Keyboard.JustDown(keys.heavyAttack),
      specialPressed: Phaser.Input.Keyboard.JustDown(keys.special),
      dashDirection,
      swapHeadPressed: Phaser.Input.Keyboard.JustDown(keys.swapHead),
      swapArmsPressed: Phaser.Input.Keyboard.JustDown(keys.swapArms),
      swapLegsPressed: Phaser.Input.Keyboard.JustDown(keys.swapLegs),
    };
  }

  private bindKeys(
    keyboard: Phaser.Input.Keyboard.KeyboardPlugin,
    keyMap: PlayerKeyMap,
  ): BoundPlayerKeys {
    return {
      left: keyboard.addKey(keyMap.left),
      right: keyboard.addKey(keyMap.right),
      jump: keyboard.addKey(keyMap.jump),
      block: keyboard.addKey(keyMap.block),
      lightAttack: keyboard.addKey(keyMap.lightAttack),
      heavyAttack: keyboard.addKey(keyMap.heavyAttack),
      special: keyboard.addKey(keyMap.special),
      swapHead: keyboard.addKey(keyMap.swapHead),
      swapArms: keyboard.addKey(keyMap.swapArms),
      swapLegs: keyboard.addKey(keyMap.swapLegs),
    };
  }
}
