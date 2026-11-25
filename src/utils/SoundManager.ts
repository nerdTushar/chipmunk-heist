import { AudioSpritePlayer, PlaybackToken } from "../audio/AudioSpritePlayer";
import { CUE, CUE_IDS, CueId } from "../audio/cues";
import { save, get } from "../Data/Storage";

/**
 * Game-level sound names (Royal Tower's `SFX` enum) mapped onto the chipmunk-heist audio-sprite cues.
 * Code plays `SFX.*`; the cue table below is the only place that knows clip names.
 */
export enum SFX {
  BGM = "BGM",
  FREESPIN_BGM = "FREESPIN_BGM",
  REEL_SPIN = "REEL_SPIN",
  REEL_STOP = "REEL_STOP",
  COMMON_BUTTON = "COMMON_BUTTON",
  SPIN_BUTTON = "SPIN_BUTTON",
  BET_UP = "BET_UP",
  BET_DOWN = "BET_DOWN",
  AUTO_TOGGLE = "AUTO_TOGGLE",
  POPUP_OPEN = "POPUP_OPEN",
  POPUP_CLOSE = "POPUP_CLOSE",
  BUY_BONUS_BUTTON = "BUY_BONUS_BUTTON",
  BUY_CONFIRM = "BUY_CONFIRM",
  BUY_CANCEL = "BUY_CANCEL",
  PAYWIN = "PAYWIN",
  PAYWIN_MID = "PAYWIN_MID",
  PAYWIN_HIGH = "PAYWIN_HIGH",
  BONUS_ALERT = "BONUS_ALERT",
  ANTICIPATION = "ANTICIPATION",
  FREESPIN_AWARDED = "FREESPIN_AWARDED",
  FREESPIN_RETRIGGER = "FREESPIN_RETRIGGER",
  FREESPIN_TOTAL = "FREESPIN_TOTAL",
  TRANSITION = "TRANSITION",
  BIGWIN = "BIGWIN",
  OMG = "OMG",
  SUPER = "SUPER",
  MAX = "MAX",
  BIGWIN_START = "BIGWIN_START",
  COUNT_TICK = "COUNT_TICK",
  COUNT_END = "COUNT_END",
  COIN_SHOWER = "COIN_SHOWER",
  MULTIPLIER_REVEAL = "MULTIPLIER_REVEAL",
  TAP_TO_PLAY = "TAP_TO_PLAY",
}

const SFX_TO_CUE: Record<SFX, CueId> = {
  [SFX.BGM]: CUE.BGM_BASE,
  [SFX.FREESPIN_BGM]: CUE.BGM_BONUS,
  [SFX.REEL_SPIN]: CUE.SFX_REEL_SPIN_START,
  [SFX.REEL_STOP]: CUE.SFX_REEL_STOP,
  [SFX.COMMON_BUTTON]: CUE.SFX_UI_CLICK,
  [SFX.SPIN_BUTTON]: CUE.SFX_UI_SPIN_PRESS,
  [SFX.BET_UP]: CUE.SFX_UI_BET_UP,
  [SFX.BET_DOWN]: CUE.SFX_UI_BET_DOWN,
  [SFX.AUTO_TOGGLE]: CUE.SFX_UI_AUTO_TOGGLE,
  [SFX.POPUP_OPEN]: CUE.SFX_UI_POPUP_OPEN,
  [SFX.POPUP_CLOSE]: CUE.SFX_UI_POPUP_CLOSE,
  [SFX.BUY_BONUS_BUTTON]: CUE.SFX_UI_CARD_SELECT,
  [SFX.BUY_CONFIRM]: CUE.SFX_UI_BUY_CONFIRM,
  [SFX.BUY_CANCEL]: CUE.SFX_UI_BUY_CANCEL,
  [SFX.PAYWIN]: CUE.SFX_WIN_LOW,
  [SFX.PAYWIN_MID]: CUE.SFX_WIN_MID,
  [SFX.PAYWIN_HIGH]: CUE.SFX_WIN_HIGH,
  [SFX.BONUS_ALERT]: CUE.SFX_GUARD_TRIGGER,
  [SFX.ANTICIPATION]: CUE.SFX_ANTICIPATION,
  [SFX.FREESPIN_AWARDED]: CUE.JNG_FREESPINS_AWARDED,
  [SFX.FREESPIN_RETRIGGER]: CUE.SFX_FS_PLUS_SPINS,
  [SFX.FREESPIN_TOTAL]: CUE.JNG_TOTAL_WIN,
  [SFX.TRANSITION]: CUE.SFX_VAULT_DOOR_HISS_SWING,
  [SFX.BIGWIN]: CUE.SFX_BIGWIN_BIG,
  [SFX.OMG]: CUE.SFX_BIGWIN_MEGA,
  [SFX.SUPER]: CUE.SFX_BIGWIN_SUPER,
  [SFX.MAX]: CUE.SFX_JACKPOT_GRAND,
  [SFX.BIGWIN_START]: CUE.JNG_BIGWIN_START,
  [SFX.COUNT_TICK]: CUE.SFX_WIN_COUNT_TICK,
  [SFX.COUNT_END]: CUE.SFX_WIN_COUNT_END,
  [SFX.COIN_SHOWER]: CUE.SFX_COIN_SHOWER,
  [SFX.MULTIPLIER_REVEAL]: CUE.SFX_WILD_MULTIPLIER_REVEAL,
  [SFX.TAP_TO_PLAY]: CUE.SFX_UI_TAP_TO_PLAY,
};

const SPRITE_ID = "main";
const DEFAULT_MUSIC_VOLUME = 0.4;

/**
 * Port of Royal Tower's SoundManager on top of AudioSpritePlayer. Same public API
 * (playSoundAsync / playMusicAudio / stopSound / toggleMute* / volume setters).
 */
export default class SoundManager {
  readonly player = new AudioSpritePlayer();
  muteMusic = false;
  muteSound = false;
  private sfxVolume = 1;
  private musicVolume = DEFAULT_MUSIC_VOLUME;
  private currentMusic: SFX | null = null;
  private musicToken: PlaybackToken = 0;
  private loopingSFX = new Map<SFX, PlaybackToken[]>();
  private ready = false;
  private pendingMusic: SFX | null = null;

  constructor() {
    this.muteMusic = get("muteMusic") ?? false;
    this.muteSound = get("muteSound") ?? false;
    this.sfxVolume = get("sfxVolume") ?? 1;
    this.musicVolume = get("musicVolume") ?? DEFAULT_MUSIC_VOLUME;
    this.applyBusLevels();

    // Browsers keep the AudioContext suspended until a gesture.
    const unlock = () => {
      void this.player.unlock().then(() => {
        if (this.pendingMusic) {
          const music = this.pendingMusic;
          this.pendingMusic = null;
          this.currentMusic = null;
          this.playMusicAudio(music);
        }
      });
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
  }

  async load() {
    try {
      await this.player.loadSprite({
        id: SPRITE_ID,
        definitionAlias: "soundSprite.json",
        audioAlias: "soundSprite",
        expectedCues: CUE_IDS,
      });
      this.ready = true;
    } catch (error) {
      console.error(
        "[SoundManager] audio sprite failed to load; the game will be silent.",
        error,
      );
    }
  }

  private applyBusLevels() {
    this.player.setBusGain("music", this.muteMusic ? 0 : this.musicVolume);
    this.player.setBusGain("sfx", this.muteSound ? 0 : this.sfxVolume);
    this.player.setBusGain("ui", this.muteSound ? 0 : this.sfxVolume);
  }

  toggleMuteSound() {
    this.muteSound = !this.muteSound;
    save("muteSound", this.muteSound);
    this.applyBusLevels();
  }

  toggleMuteMusic() {
    this.muteMusic = !this.muteMusic;
    save("muteMusic", this.muteMusic);
    this.applyBusLevels();
  }

  /** Stops every non-music sound (Royal Tower: stop the SFX source). */
  stopSound() {
    this.player.stopBus("sfx", 80);
    this.loopingSFX.clear();
  }

  SetSFXVolume(prog: number) {
    this.sfxVolume = prog;
    save("sfxVolume", prog);
    this.applyBusLevels();
  }

  GetSFXVolume() {
    return this.sfxVolume;
  }

  SetMusicVolume(prog: number) {
    this.musicVolume = prog;
    save("musicVolume", prog);
    this.applyBusLevels();
  }

  GetMusicVolume() {
    return this.musicVolume;
  }

  /** Temporarily ducks music (popups) without changing the saved level. */
  setToMusicVolume(newValue: number) {
    if (this.muteMusic) return;
    this.player.setBusGain("music", newValue, 250);
  }

  /** Restores the saved music level. */
  setMusicVolume() {
    if (this.muteMusic) return;
    this.player.setBusGain("music", this.musicVolume, 250);
  }

  playMusicAudio(index: SFX) {
    if (this.currentMusic === index && this.player.isPlaying(this.musicToken))
      return;
    if (!this.ready || !this.player.unlocked) {
      this.pendingMusic = index;
      return;
    }
    if (this.musicToken) this.player.stop(this.musicToken, 400);
    this.currentMusic = index;
    this.musicToken = this.player.play({
      sprite: SPRITE_ID,
      cue: SFX_TO_CUE[index],
      bus: "music",
      loop: true,
      fadeInMs: 400,
    });
  }

  stopMusic() {
    if (this.musicToken) this.player.stop(this.musicToken, 300);
    this.musicToken = 0;
    this.currentMusic = null;
    this.pendingMusic = null;
  }

  playLoopingSFX(index: SFX) {
    if (!this.ready) return;
    const token = this.player.play({
      sprite: SPRITE_ID,
      cue: SFX_TO_CUE[index],
      bus: "sfx",
      loop: true,
    });
    const list = this.loopingSFX.get(index) ?? [];
    list.push(token);
    this.loopingSFX.set(index, list);
  }

  stopLoopingSFX(index: SFX) {
    (this.loopingSFX.get(index) ?? []).forEach((token) =>
      this.player.stop(token, 100),
    );
    this.loopingSFX.delete(index);
  }

  stopAllLoopingSFX() {
    [...this.loopingSFX.keys()].forEach((key) => this.stopLoopingSFX(key));
  }

  playSoundAsync(index: SFX, loop: boolean = false): PlaybackToken {
    if (!this.ready || !this.player.unlocked) return 0;
    const isUi =
      index === SFX.COMMON_BUTTON ||
      index === SFX.BET_UP ||
      index === SFX.BET_DOWN ||
      index === SFX.POPUP_OPEN ||
      index === SFX.POPUP_CLOSE;
    return this.player.play({
      sprite: SPRITE_ID,
      cue: SFX_TO_CUE[index],
      bus: isUi ? "ui" : "sfx",
      loop,
    });
  }
}

const Instance = new SoundManager();

export { Instance };
