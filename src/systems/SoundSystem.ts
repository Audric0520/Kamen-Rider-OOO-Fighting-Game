import {
  FIXED_UPDATES_PER_SECOND,
  SOUND_EFFECT_ENVELOPE_ATTACK_FRAMES,
  SOUND_EFFECT_MASTER_VOLUME,
  SOUND_EFFECTS,
  type SoundEffectName,
  type SoundEffectToneDefinition,
} from '../config';

/** Small, original Web Audio effects; muted automatically if Web Audio is unavailable. */
export class SoundSystem {
  private static context: AudioContext | null = null;
  private static masterGain: GainNode | null = null;

  public unlock(): void {
    const context = this.getContext();
    if (context && context.state !== 'running') {
      void context.resume().catch(() => undefined);
    }
  }

  public play(effect: SoundEffectName): void {
    const context = this.getContext();
    if (!context) {
      return;
    }

    if (context.state === 'running') {
      this.scheduleEffect(context, SOUND_EFFECTS[effect]);
      return;
    }

    void context.resume()
      .then(() => this.scheduleEffect(context, SOUND_EFFECTS[effect]))
      .catch(() => undefined);
  }

  private getContext(): AudioContext | null {
    if (typeof AudioContext === 'undefined') {
      return null;
    }

    if (!SoundSystem.context) {
      SoundSystem.context = new AudioContext();
      SoundSystem.masterGain = SoundSystem.context.createGain();
      SoundSystem.masterGain.gain.value = SOUND_EFFECT_MASTER_VOLUME;
      SoundSystem.masterGain.connect(SoundSystem.context.destination);
    }

    return SoundSystem.context;
  }

  private scheduleEffect(
    context: AudioContext,
    tones: readonly SoundEffectToneDefinition[],
  ): void {
    if (context.state !== 'running' || !SoundSystem.masterGain) {
      return;
    }

    let startAt = context.currentTime;
    for (const tone of tones) {
      this.scheduleTone(context, tone, startAt);
      startAt += tone.durationFrames / FIXED_UPDATES_PER_SECOND;
    }
  }

  private scheduleTone(
    context: AudioContext,
    tone: SoundEffectToneDefinition,
    startAt: number,
  ): void {
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const durationSeconds = tone.durationFrames / FIXED_UPDATES_PER_SECOND;
    const attackSeconds = Math.min(
      SOUND_EFFECT_ENVELOPE_ATTACK_FRAMES / FIXED_UPDATES_PER_SECOND,
      durationSeconds / 2,
    );
    const endAt = startAt + durationSeconds;

    oscillator.type = tone.waveform;
    oscillator.frequency.setValueAtTime(tone.frequencyHz, startAt);
    envelope.gain.setValueAtTime(0.0001, startAt);
    envelope.gain.exponentialRampToValueAtTime(tone.volume, startAt + attackSeconds);
    envelope.gain.exponentialRampToValueAtTime(0.0001, endAt);
    oscillator.connect(envelope);
    envelope.connect(SoundSystem.masterGain as GainNode);
    oscillator.start(startAt);
    oscillator.stop(endAt);
    oscillator.addEventListener('ended', () => {
      oscillator.disconnect();
      envelope.disconnect();
    }, { once: true });
  }
}
