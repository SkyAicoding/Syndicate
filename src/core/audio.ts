import type { SettingsState, WeaponId } from "../data/types";

type MusicMode = "menu" | "mission" | "silent";

const clamp = (value: number, min = 0, max = 1): number =>
  Math.min(max, Math.max(min, value));

export class AudioDirector {
  private context: AudioContext | null = null;

  private masterVolume = 0.8;

  private musicVolume = 0.55;

  private sfxVolume = 0.75;

  private musicMode: MusicMode = "silent";

  private musicNodes: AudioNode[] = [];

  public touch(): void {
    if (!this.context) {
      this.context = new AudioContext();
    }

    if (this.context.state === "suspended") {
      void this.context.resume();
    }

    if (!this.musicNodes.length && this.musicMode !== "silent") {
      this.startMusic(this.musicMode);
    }
  }

  public applySettings(settings: SettingsState): void {
    this.masterVolume = clamp(settings.masterVolume);
    this.musicVolume = clamp(settings.musicVolume);
    this.sfxVolume = clamp(settings.sfxVolume);

    if (this.musicNodes.length) {
      this.startMusic(this.musicMode);
    }
  }

  public setMusicMode(mode: MusicMode): void {
    this.musicMode = mode;

    if (mode === "silent") {
      this.stopMusic();
      return;
    }

    if (!this.context) {
      return;
    }

    this.startMusic(mode);
  }

  public playUi(confirm = false): void {
    this.playTone(confirm ? 640 : 520, 0.06, "triangle", 0.16);
    this.playTone(confirm ? 860 : 700, 0.08, "sine", 0.12, 0.03);
  }

  public playMove(): void {
    this.playTone(240, 0.08, "square", 0.18);
    this.playTone(320, 0.08, "triangle", 0.12, 0.05);
  }

  public playSelect(): void {
    this.playTone(420, 0.06, "triangle", 0.16);
    this.playTone(560, 0.07, "sine", 0.12, 0.02);
  }

  public playImpact(): void {
    this.playTone(90, 0.09, "sawtooth", 0.14);
    this.playTone(180, 0.04, "triangle", 0.08, 0.02);
  }

  public playExplosion(): void {
    this.playTone(72, 0.24, "sawtooth", 0.24);
    this.playTone(110, 0.2, "square", 0.16, 0.02);
  }

  public playMissionEnd(success: boolean): void {
    if (success) {
      this.playTone(440, 0.14, "triangle", 0.18);
      this.playTone(660, 0.2, "sine", 0.14, 0.06);
      return;
    }

    this.playTone(210, 0.24, "sawtooth", 0.22);
    this.playTone(120, 0.28, "triangle", 0.16, 0.03);
  }

  public playWeapon(weaponId: WeaponId): void {
    switch (weaponId) {
      case "pistol":
        this.playTone(220, 0.05, "square", 0.18);
        break;
      case "smg":
        this.playTone(250, 0.04, "sawtooth", 0.14);
        break;
      case "shotgun":
        this.playTone(140, 0.12, "square", 0.26);
        this.playTone(70, 0.1, "triangle", 0.16, 0.02);
        break;
      case "rifle":
        this.playTone(200, 0.07, "sawtooth", 0.18);
        this.playTone(320, 0.03, "square", 0.08, 0.02);
        break;
    }
  }

  private startMusic(mode: MusicMode): void {
    if (!this.context) {
      return;
    }

    this.stopMusic();

    const now = this.context.currentTime;
    const masterGain = this.context.createGain();
    masterGain.gain.value = this.masterVolume * this.musicVolume * 0.18;
    masterGain.connect(this.context.destination);

    const low = this.context.createOscillator();
    low.type = "triangle";
    low.frequency.value = mode === "menu" ? 62 : 74;

    const lowGain = this.context.createGain();
    lowGain.gain.value = 0.6;
    low.connect(lowGain);
    lowGain.connect(masterGain);

    const high = this.context.createOscillator();
    high.type = "sawtooth";
    high.frequency.value = mode === "menu" ? 124 : 148;

    const highGain = this.context.createGain();
    highGain.gain.value = 0.18;
    high.connect(highGain);
    highGain.connect(masterGain);

    const lfo = this.context.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = mode === "menu" ? 0.14 : 0.24;

    const lfoGain = this.context.createGain();
    lfoGain.gain.value = mode === "menu" ? 5 : 8;
    lfo.connect(lfoGain);
    lfoGain.connect(low.frequency);

    low.start(now);
    high.start(now);
    lfo.start(now);

    this.musicNodes = [low, high, lfo, masterGain, lowGain, highGain, lfoGain];
  }

  private stopMusic(): void {
    this.musicNodes.forEach((node) => {
      if (node instanceof OscillatorNode) {
        try {
          node.stop();
        } catch {
          return;
        }
      }
    });

    this.musicNodes = [];
  }

  private playTone(
    frequency: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    delay = 0
  ): void {
    if (!this.context) {
      return;
    }

    const now = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(
      Math.max(0.0001, volume * this.masterVolume * this.sfxVolume),
      now + 0.01
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(gain);
    gain.connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }
}
