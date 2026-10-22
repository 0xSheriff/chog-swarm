/**
 * Theme FX Configuration
 * Single source of truth for all Halloween visual & reactive motion effects.
 * Every effect can be toggled via boolean flags.
 */

export interface ThemeFxConfig {
  parallax: boolean;
  quadrantDrift: boolean;
  breathingGlow: boolean;
  focusCrossFade: boolean;
  vignette: boolean;
  fog: boolean;
  embers: boolean;
  emberTrail: boolean;
  bats: boolean;
  moon: boolean;
  cobwebs: boolean;
  cardSheen: boolean;
  buttonGloss: boolean;
  tiltPortraits: boolean;
  eyeFlash: boolean;
  flameFlicker: boolean;
  pageTransitions: boolean;
  gameReactions: boolean;
  adaptiveQuality: boolean;
}

export const themeFx: ThemeFxConfig = {
  parallax: true,
  quadrantDrift: true,
  breathingGlow: true,
  focusCrossFade: true,
  vignette: true,
  fog: true,
  embers: true,
  emberTrail: true,
  bats: true,
  moon: true,
  cobwebs: true,
  cardSheen: true,
  buttonGloss: true,
  tiltPortraits: true,
  eyeFlash: true,
  flameFlicker: true,
  pageTransitions: true,
  gameReactions: true,
  adaptiveQuality: true,
};

// Color Palette Constants
export const HALLOWEEN_PALETTE = {
  bone: '#efe6d2',
  pumpkin: '#ff7a1a',
  ember: '#ff3b1f',
  ghostBlue: '#3b5bff',
  void: '#0a0712',
  glassBg: 'rgba(10, 7, 18, 0.72)',
  glassBorder: 'rgba(239, 230, 210, 0.12)',
};
