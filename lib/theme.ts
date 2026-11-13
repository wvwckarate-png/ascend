// Per-student colour themes. Pages never hard-code an accent colour: they use the CSS variables below, which the
// student layout sets once. Switching a student's theme is therefore a one-word change (and later, a profile setting).
import type { CSSProperties } from 'react';

export type Theme = {
  label: string;        // name shown in the picker
  accent: string;       // main colour
  light: string;        // soft tint (chips, highlights)
  dark: string;         // deep shade (body text on tints)
  gradient: string;     // primary buttons / hero cards
  classColors: string[]; // the 6 rotating colours for class cards
};

const grad = (a: string, b: string) => `linear-gradient(135deg, ${a}, ${b})`;

export const THEMES = {
  purple: { label: 'Violet',  accent: '#7B6FA0', light: '#EDE9F7', dark: '#5A5078', gradient: grad('#7B6FA0', '#5A5078'), classColors: ['#9B8EC4', '#7B6FA0', '#A89EC4', '#6B7FA0', '#8E9BC4', '#7B8FA0'] },
  blue:   { label: 'Ocean',   accent: '#5B82B5', light: '#E7EEF8', dark: '#3D5F8C', gradient: grad('#5B82B5', '#3D5F8C'), classColors: ['#7FA0CC', '#5B82B5', '#8FB0D4', '#5A7FA0', '#7C9CC4', '#6B8FB0'] },
  green:  { label: 'Forest',  accent: '#5A977B', light: '#E5F2EB', dark: '#3C6E58', gradient: grad('#5A977B', '#3C6E58'), classColors: ['#7DB89C', '#5A977B', '#8FC4AA', '#5A9080', '#74AE96', '#689E8A'] },
  red:    { label: 'Crimson', accent: '#B5566A', light: '#FAEAEE', dark: '#873C4C', gradient: grad('#B5566A', '#873C4C'), classColors: ['#CF7B8C', '#B5566A', '#D892A0', '#A85064', '#C66F82', '#B86478'] },
  orange: { label: 'Ember',   accent: '#E8956D', light: '#FFF3E8', dark: '#9C5A3C', gradient: '#E8956D',                  classColors: ['#E8956D', '#C4A882', '#D4845A', '#C8965A', '#E0A882', '#D49E6D'] },
  grey:   { label: 'Slate',   accent: '#68707F', light: '#ECEEF2', dark: '#454B57', gradient: grad('#68707F', '#454B57'), classColors: ['#8B93A1', '#68707F', '#9CA3AF', '#5F6673', '#7D8592', '#727987'] },
} satisfies Record<string, Theme>;

export type ThemeName = keyof typeof THEMES;
export const THEME_NAMES = Object.keys(THEMES) as ThemeName[];
export const isThemeName = (v: unknown): v is ThemeName => typeof v === 'string' && v in THEMES;

// What pages reference.
export const ACCENT = 'var(--accent)';
export const ACCENT_LIGHT = 'var(--accent-light)';
export const ACCENT_DARK = 'var(--accent-dark)';
export const ACCENT_GRADIENT = 'var(--accent-gradient)';
export const CLASS_COLORS = [1, 2, 3, 4, 5, 6].map(n => `var(--class-${n})`);

/** The CSS variables for a theme — spread onto a wrapper element's style. */
export function themeVars(theme: Theme): CSSProperties {
  const vars: Record<string, string> = {
    '--accent': theme.accent, '--accent-light': theme.light, '--accent-dark': theme.dark, '--accent-gradient': theme.gradient,
  };
  theme.classColors.forEach((c, i) => { vars[`--class-${i + 1}`] = c; });
  return vars as CSSProperties;
}

/**
 * A colour at reduced opacity, given the two hex digits that used to be appended to a hex colour
 * (alpha(color, '20') replaces `color + '20'`). Works with CSS variables, which plain hex suffixes can't.
 */
export function alpha(color: string, hexAA: string): string {
  const pct = Math.round((parseInt(hexAA, 16) / 255) * 1000) / 10;
  return `color-mix(in srgb, ${color} ${pct}%, transparent)`;
}
