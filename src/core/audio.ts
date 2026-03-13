import type { SettingsState, WeaponId } from "../data/types";

type MusicMode = "menu" | "mission" | "silent";

const MUSIC_ENABLED = false;

const clamp = (value: number, min = 0, max = 1): number =>
  Math.min(max, Math.max(min, value));

export class AudioDirector {
  private context: AudioContext | null = null;

  private masterVolume = 0.8;

  private musicVolume = 0.55;

  private sfxVolume = 0.75;

  private musicMode: MusicMode = "silent";

  private musicNodes: AudioNode[] = [];

  private musicMasterGain: GainNode | null = null;

  public touch(): void {
    if (!this.context) {
      this.context = new AudioContext();
    }

    if (this.context.state === "suspended") {
      void this.context.resume();
    }

    if (MUSIC_ENABLED && !this.musicNodes.length && this.musicMode !== "silent") {
      this.startMusic(this.musicMode);
    }
  }

  public applySettings(settings: SettingsState): void {
    this.masterVolume = clamp(settings.masterVolume);
    this.musicVolume = clamp(settings.musicVolume);
    this.sfxVolume = clamp(settings.sfxVolume);

    if (!MUSIC_ENABLED) {
      this.stopMusic();
      return;
    }

    this.updateMusicGain();
  }

  public setMusicMode(mode: MusicMode): void {
    if (!MUSIC_ENABLED) {
      this.musicMode = "silent";
      this.stopMusic();
      return;
    }

    const modeChanged = this.musicMode !== mode;
    this.musicMode = mode;

    if (mode === "silent") {
      this.stopMusic();
      return;
    }

    if (!this.context) {
      return;
    }

    if (!modeChanged && this.musicNodes.length) {
      this.updateMusicGain();
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

  public playImpact(weaponId?: WeaponId): void {
    switch (weaponId) {
      case "breach-12":
      case "machine-gun":
      case "enemy-suppressor":
      case "anti-materiel-rifle":
        this.playTone(82, 0.12, "sawtooth", 0.18);
        this.playTone(148, 0.06, "triangle", 0.1, 0.02);
        return;
      case "sniper-rifle":
      case "battle-rifle":
      case "enemy-lancer":
        this.playTone(118, 0.09, "square", 0.14);
        this.playTone(244, 0.04, "triangle", 0.08, 0.015);
        return;
      default:
        this.playTone(90, 0.09, "sawtooth", 0.14);
        this.playTone(180, 0.04, "triangle", 0.08, 0.02);
    }
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
      case "colt":
      case "enemy-sidearm":
        this.playTone(240, 0.045, "square", 0.16);
        this.playTone(420, 0.02, "triangle", 0.06, 0.01);
        break;
      case "uiz":
      case "enemy-needler":
        this.playTone(286, 0.035, "sawtooth", 0.13);
        this.playTone(420, 0.02, "triangle", 0.05, 0.01);
        break;
      case "pdw-90":
        this.playTone(310, 0.04, "triangle", 0.14);
        this.playTone(460, 0.025, "sine", 0.07, 0.01);
        break;
      case "breach-12":
        this.playTone(140, 0.12, "square", 0.26);
        this.playTone(70, 0.1, "triangle", 0.16, 0.02);
        break;
      case "assault-rifle":
      case "enemy-carbine":
        this.playTone(210, 0.065, "sawtooth", 0.18);
        this.playTone(340, 0.03, "square", 0.09, 0.02);
        break;
      case "battle-rifle":
      case "enemy-lancer":
        this.playTone(176, 0.09, "square", 0.2);
        this.playTone(290, 0.04, "triangle", 0.08, 0.018);
        break;
      case "sniper-rifle":
        this.playTone(126, 0.14, "square", 0.28);
        this.playTone(210, 0.07, "triangle", 0.12, 0.02);
        break;
      case "machine-gun":
      case "enemy-suppressor":
        this.playTone(172, 0.055, "sawtooth", 0.17);
        this.playTone(110, 0.08, "triangle", 0.09, 0.01);
        break;
      case "anti-materiel-rifle":
        this.playTone(96, 0.18, "square", 0.32);
        this.playTone(164, 0.08, "triangle", 0.14, 0.02);
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
    masterGain.gain.setValueAtTime(0.0001, now);
    masterGain.gain.linearRampToValueAtTime(this.getMusicGainValue(), now + 0.45);
    masterGain.connect(this.context.destination);

    const filter = this.context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = mode === "menu" ? 320 : 420;
    filter.Q.value = 0.6;
    filter.connect(masterGain);

    const sub = this.context.createOscillator();
    sub.type = "sine";
    sub.frequency.value = mode === "menu" ? 46 : 54;

    const subGain = this.context.createGain();
    subGain.gain.value = mode === "menu" ? 0.52 : 0.42;
    sub.connect(subGain);
    subGain.connect(filter);

    const body = this.context.createOscillator();
    body.type = "triangle";
    body.frequency.value = mode === "menu" ? 92 : 108;

    const bodyGain = this.context.createGain();
    bodyGain.gain.value = mode === "menu" ? 0.2 : 0.24;
    body.connect(bodyGain);
    bodyGain.connect(filter);

    const shimmer = this.context.createOscillator();
    shimmer.type = "sine";
    shimmer.frequency.value = mode === "menu" ? 184 : 216;

    const shimmerGain = this.context.createGain();
    shimmerGain.gain.value = mode === "menu" ? 0.025 : 0.04;
    shimmer.connect(shimmerGain);
    shimmerGain.connect(filter);

    const drift = this.context.createOscillator();
    drift.type = "sine";
    drift.frequency.value = mode === "menu" ? 0.09 : 0.16;

    const driftGain = this.context.createGain();
    driftGain.gain.value = mode === "menu" ? 3.5 : 5;
    drift.connect(driftGain);
    driftGain.connect(body.frequency);

    const shimmerPulse = this.context.createOscillator();
    shimmerPulse.type = "triangle";
    shimmerPulse.frequency.value = mode === "menu" ? 0.22 : 0.34;

    const shimmerPulseGain = this.context.createGain();
    shimmerPulseGain.gain.value = mode === "menu" ? 0.012 : 0.02;
    shimmerPulse.connect(shimmerPulseGain);
    shimmerPulseGain.connect(shimmerGain.gain);

    sub.start(now);
    body.start(now);
    shimmer.start(now);
    drift.start(now);
    shimmerPulse.start(now);

    this.musicMasterGain = masterGain;
    this.musicNodes = [
      sub,
      body,
      shimmer,
      drift,
      shimmerPulse,
      masterGain,
      filter,
      subGain,
      bodyGain,
      shimmerGain,
      driftGain,
      shimmerPulseGain
    ];
  }

  private stopMusic(): void {
    this.musicNodes.forEach((node) => {
      if (node instanceof OscillatorNode) {
        try {
          node.stop();
        } catch {
          // Ignore duplicate stop attempts during rapid screen changes.
        }
      }

      try {
        node.disconnect();
      } catch {
        // Some nodes may already be disconnected.
      }
    });

    this.musicNodes = [];
    this.musicMasterGain = null;
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

  private getMusicGainValue(): number {
    return Math.max(0.0001, this.masterVolume * this.musicVolume * 0.1);
  }

  private updateMusicGain(): void {
    if (!this.context || !this.musicMasterGain) {
      return;
    }

    this.musicMasterGain.gain.cancelScheduledValues(this.context.currentTime);
    this.musicMasterGain.gain.setValueAtTime(
      Math.max(0.0001, this.musicMasterGain.gain.value),
      this.context.currentTime
    );
    this.musicMasterGain.gain.linearRampToValueAtTime(
      this.getMusicGainValue(),
      this.context.currentTime + 0.18
    );
  }
}
