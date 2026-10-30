export const colors = {
    // Dark theme foundations
    background: '#0D0D0F',
    surface: '#16161A',
    surfaceLight: '#212126',
    surfaceBorder: '#2A2A32',
    surfaceHover: '#2E2E38',
    // Primary brand accent - Electric Lime
    primary: '#C8FF00',
    primaryDark: '#A3D900',
    primaryMuted: 'rgba(200, 255, 0, 0.15)',
    primaryGlow: 'rgba(200, 255, 0, 0.3)',
    // Secondary accent - Subtle Cyan
    cyan: '#00F0FF',
    cyanMuted: 'rgba(0, 240, 255, 0.15)',
    // Text hierarchy
    textPrimary: '#F5F5F7',
    textSecondary: '#8E8E93',
    textTertiary: '#636366',
    textDisabled: '#48484A',
    textInverse: '#0D0D0F',
    // System states
    success: '#30D158',
    successMuted: 'rgba(48, 209, 88, 0.15)',
    warning: '#FFD60A',
    warningMuted: 'rgba(255, 214, 10, 0.15)',
    error: '#FF453A',
    errorMuted: 'rgba(255, 69, 58, 0.15)',
    info: '#64D2FF',
    infoMuted: 'rgba(100, 210, 255, 0.15)',
    // Neutrals
    white: '#FFFFFF',
    black: '#000000',
    overlay: 'rgba(0, 0, 0, 0.75)',
    cardBorder: '#26262E',
};
export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};
export const borderRadius = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
};
export const typography = {
    h1: { fontSize: 30, fontWeight: '700', letterSpacing: -0.5, color: colors.textPrimary },
    h2: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3, color: colors.textPrimary },
    h3: { fontSize: 18, fontWeight: '600', color: colors.textPrimary },
    body: { fontSize: 15, fontWeight: '400', color: colors.textPrimary },
    bodyBold: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
    caption: { fontSize: 13, fontWeight: '400', color: colors.textSecondary },
    small: { fontSize: 11, fontWeight: '500', color: colors.textTertiary },
    mono: { fontFamily: 'Courier', fontSize: 14, fontWeight: '600' },
};
