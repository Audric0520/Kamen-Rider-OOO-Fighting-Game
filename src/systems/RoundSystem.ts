import {
  MAX_ROUNDS,
  ROUND_DURATION_FRAMES,
  ROUNDS_TO_WIN,
} from '../config';
import type { Fighter } from '../entities/Fighter';

export type RoundWinner = 1 | 2 | 'draw';
export type MatchStatus = 'playing' | 'round-end' | 'match-end';

/** Tracks the fixed-frame round timer, round scores, and match completion. */
export class RoundSystem {
  public roundNumber = 1;
  public player1RoundWins = 0;
  public player2RoundWins = 0;
  public remainingFrames = ROUND_DURATION_FRAMES;
  public status: MatchStatus = 'playing';
  public roundWinner: RoundWinner | null = null;
  public matchWinner: RoundWinner | null = null;

  public update(player1: Fighter, player2: Fighter): void {
    if (this.status !== 'playing') {
      return;
    }

    const player1Ko = player1.state === 'KO';
    const player2Ko = player2.state === 'KO';
    if (player1Ko || player2Ko) {
      const winner: RoundWinner = player1Ko && player2Ko
        ? 'draw'
        : player1Ko
          ? 2
          : 1;
      this.finishRound(winner);
      return;
    }

    this.remainingFrames = Math.max(0, this.remainingFrames - 1);
    if (this.remainingFrames === 0) {
      const winner: RoundWinner = player1.health === player2.health
        ? 'draw'
        : player1.health > player2.health
          ? 1
          : 2;
      this.finishRound(winner);
    }
  }

  public startNextRound(): void {
    if (this.status !== 'round-end') {
      return;
    }

    this.roundNumber += 1;
    this.remainingFrames = ROUND_DURATION_FRAMES;
    this.roundWinner = null;
    this.status = 'playing';
  }

  public restartMatch(): void {
    if (this.status !== 'match-end') {
      return;
    }

    this.roundNumber = 1;
    this.player1RoundWins = 0;
    this.player2RoundWins = 0;
    this.remainingFrames = ROUND_DURATION_FRAMES;
    this.status = 'playing';
    this.roundWinner = null;
    this.matchWinner = null;
  }

  private finishRound(winner: RoundWinner): void {
    this.roundWinner = winner;
    if (winner === 1) {
      this.player1RoundWins += 1;
    } else if (winner === 2) {
      this.player2RoundWins += 1;
    }

    const player1HasWon = this.player1RoundWins >= ROUNDS_TO_WIN;
    const player2HasWon = this.player2RoundWins >= ROUNDS_TO_WIN;
    const finalRoundPlayed = this.roundNumber >= MAX_ROUNDS;
    if (player1HasWon || player2HasWon || finalRoundPlayed) {
      this.matchWinner = this.player1RoundWins === this.player2RoundWins
        ? 'draw'
        : this.player1RoundWins > this.player2RoundWins
          ? 1
          : 2;
      this.status = 'match-end';
      return;
    }

    this.status = 'round-end';
  }
}
