import type { Theme } from '@crayonai/react-ui'

const mono = "'JetBrains Mono', monospace"
const sansSerif = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif"

/**
 * DeepKit Core - Elegant Dark Theme
 * Clean, modern dark aesthetic. No CRT gimmicks.
 * Brand colors preserved, subtle elevation shadows.
 */
export const deepkitDarkTheme: Partial<Theme> = {
  // ── Colors: Elegant Dark ───────────────────────────────────
  backgroundFills: '#000000',
  containerFills: '#0d0d0d',
  overlayFills: 'rgba(0,0,0,0.85)',
  sunkFills: '#080808',
  elevatedFills: '#141414',
  sunkBgFills: '#000000',
  invertedFills: '#00F2FF',

  dangerFills: 'rgba(255,59,59,0.12)',
  successFills: 'rgba(57,255,20,0.12)',
  infoFills: 'rgba(0,242,255,0.12)',
  alertFills: 'rgba(255,176,0,0.12)',

  // Strokes
  strokeDefault: '#1f1f1f',
  strokeInteractiveEl: '#333333',
  strokeInteractiveElSelected: '#00F2FF',
  strokeEmphasis: '#444444',
  strokeAccent: '#00F2FF',
  strokeAccentEmphasis: '#00F2FF',
  strokeInfo: '#00F2FF',
  strokeInfoEmphasis: '#00F2FF',
  strokeAlert: '#FFB000',
  strokeAlertEmphasis: '#FFB000',
  strokeSuccess: '#39FF14',
  strokeSuccessEmphasis: '#39FF14',
  strokeDanger: '#FF3B3B',
  strokeDangerEmphasis: '#FF3B3B',

  // Text
  primaryText: '#FFFFFF',
  secondaryText: '#A0A0A0',
  disabledText: '#555555',
  linkText: '#00F2FF',

  accentPrimaryText: '#00F2FF',
  accentSecondaryText: '#00C4CC',
  accentDisabledText: '#006666',

  successPrimaryText: '#39FF14',
  successInvertedText: '#000000',

  alertPrimaryText: '#FFB000',
  alertInvertedText: '#000000',

  dangerPrimaryText: '#FF3B3B',
  dangerSecondaryText: '#CC3030',
  dangerDisabledText: '#662020',
  dangerInvertedPrimaryText: '#000000',

  infoPrimaryText: '#00F2FF',
  infoInvertedText: '#000000',

  // Interactive states
  interactiveDefault: '#1a1a1a',
  interactiveHover: '#242424',
  interactivePressed: '#333333',
  interactiveDisabled: '#111111',
  interactiveAccent: '#00F2FF',
  interactiveAccentHover: '#33F5FF',
  interactiveAccentPressed: '#00C4CC',
  interactiveAccentDisabled: '#006666',
  interactiveDestructive: '#FF3B3B',
  interactiveDestructiveHover: '#FF5555',
  interactiveDestructivePressed: '#CC3030',
  interactiveDestructiveDisabled: '#662020',

  highlightSubtle: 'rgba(0,242,255,0.06)',
  highlightStrong: 'rgba(0,242,255,0.15)',

  // Chat-specific
  chatContainerBg: '#000000',
  chatAssistantResponseBg: 'transparent',
  chatAssistantResponseText: '#FFFFFF',
  chatUserResponseBg: '#0d0d0d',
  chatUserResponseText: '#FFFFFF',

  // ── Chart Palettes: Brand Spectrum ─────────────────────────
  defaultChartPalette: ['#00F2FF', '#39FF14', '#FFB000', '#FF3B3B', '#A0A0A0', '#00C4CC', '#2BCC10', '#CC8E00'],
  barChartPalette: ['#00F2FF', '#39FF14', '#FFB000', '#FF3B3B', '#A0A0A0'],
  lineChartPalette: ['#00F2FF', '#39FF14', '#FFB000', '#FF3B3B'],
  areaChartPalette: ['#00F2FF', '#39FF14', '#FFB000', '#FF3B3B'],
  pieChartPalette: ['#00F2FF', '#39FF14', '#FFB000', '#FF3B3B', '#A0A0A0'],
  radarChartPalette: ['#00F2FF', '#39FF14', '#FFB000'],
  radialChartPalette: ['#00F2FF', '#39FF14', '#FFB000', '#FF3B3B'],
  horizontalBarChartPalette: ['#00F2FF', '#39FF14', '#FFB000', '#FF3B3B', '#A0A0A0'],

  // ── Layout: Moderate Rounding ──────────────────────────────
  rounded0: '0px',
  rounded3xs: '2px',
  rounded2xs: '3px',
  roundedXs: '4px',
  roundedS: '6px',
  roundedM: '8px',
  roundedL: '10px',
  roundedXl: '12px',
  rounded2xl: '14px',
  rounded3xl: '16px',
  rounded4xl: '20px',
  roundedFull: '9999px',
  roundedClickable: '6px',

  // ── Typography: Clean & Tight ──────────────────────────────
  fontBody: `400 14px/1.6 ${sansSerif}`,
  fontBodyLetterSpacing: '0em',
  fontBodyHeavy: `600 14px/1.6 ${sansSerif}`,
  fontBodyHeavyLetterSpacing: '0em',
  fontBodySmall: `400 12px/1.5 ${sansSerif}`,
  fontBodySmallLetterSpacing: '0em',
  fontBodySmallHeavy: `600 12px/1.5 ${sansSerif}`,
  fontBodySmallHeavyLetterSpacing: '0em',
  fontBodyLarge: `400 16px/1.6 ${sansSerif}`,
  fontBodyLargeLetterSpacing: '0em',
  fontBodyLargeHeavy: `600 16px/1.6 ${sansSerif}`,
  fontBodyLargeHeavyLetterSpacing: '0em',
  fontBodyLink: `400 14px/1.6 ${sansSerif}`,
  fontBodyLinkLetterSpacing: '0em',

  fontLabel: `500 13px/1.4 ${sansSerif}`,
  fontLabelLetterSpacing: '0.01em',
  fontLabelHeavy: `700 13px/1.4 ${sansSerif}`,
  fontLabelHeavyLetterSpacing: '0.01em',
  fontLabelSmall: `500 11px/1.3 ${sansSerif}`,
  fontLabelSmallLetterSpacing: '0.01em',
  fontLabelSmallHeavy: `700 11px/1.3 ${sansSerif}`,
  fontLabelSmallHeavyLetterSpacing: '0.01em',
  fontLabelExtraSmall: `500 10px/1.2 ${sansSerif}`,
  fontLabelExtraSmallLetterSpacing: '0.02em',
  fontLabelExtraSmallHeavy: `700 10px/1.2 ${sansSerif}`,
  fontLabelExtraSmallHeavyLetterSpacing: '0.02em',
  fontLabelLarge: `500 15px/1.4 ${sansSerif}`,
  fontLabelLargeLetterSpacing: '0.01em',
  fontLabelLargeHeavy: `700 15px/1.4 ${sansSerif}`,
  fontLabelLargeHeavyLetterSpacing: '0.01em',

  fontHeadingLarge: `700 28px/1.2 ${sansSerif}`,
  fontHeadingLargeLetterSpacing: '-0.01em',
  fontHeadingMedium: `700 22px/1.3 ${sansSerif}`,
  fontHeadingMediumLetterSpacing: '0em',
  fontHeadingSmall: `700 18px/1.3 ${sansSerif}`,
  fontHeadingSmallLetterSpacing: '0em',
  fontHeadingExtraSmall: `700 15px/1.3 ${sansSerif}`,
  fontHeadingExtraSmallLetterSpacing: '0em',

  // Numbers and code use mono
  fontNumber: `500 14px/1.4 ${mono}`,
  fontNumberLetterSpacing: '0em',
  fontNumberLarge: `500 20px/1.3 ${mono}`,
  fontNumberLargeLetterSpacing: '0em',
  fontNumberLargeHeavy: `700 20px/1.3 ${mono}`,
  fontNumberLargeHeavyLetterSpacing: '0em',
  fontNumberHeavy: `700 14px/1.4 ${mono}`,
  fontNumberHeavyLetterSpacing: '0em',
  fontNumberSmall: `500 12px/1.3 ${mono}`,
  fontNumberSmallLetterSpacing: '0em',
  fontNumberSmallHeavy: `700 12px/1.3 ${mono}`,
  fontNumberSmallHeavyLetterSpacing: '0em',
  fontNumberTitle: `700 36px/1.1 ${mono}`,
  fontNumberTitleLetterSpacing: '-0.02em',
  fontNumberTitleMedium: `700 28px/1.1 ${mono}`,
  fontNumberTitleMediumLetterSpacing: '-0.01em',

  // ── Effects: Subtle Elevation (no glow) ────────────────────
  shadowS: '0 1px 2px rgba(0,0,0,0.5)',
  shadowM: '0 2px 6px rgba(0,0,0,0.5)',
  shadowL: '0 4px 12px rgba(0,0,0,0.6)',
  shadowXl: '0 8px 20px rgba(0,0,0,0.6)',
  shadow2xl: '0 12px 32px rgba(0,0,0,0.7)',
  shadow3xl: '0 20px 48px rgba(0,0,0,0.8)',
}
