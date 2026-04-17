import { Platform } from 'react-native';

export const isWeb = Platform.OS === 'web';
export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';
export const isMobile = isIOS || isAndroid;

// Use this to skip animations on web
export const shouldAnimate = !isWeb;

// Web-specific style helpers
export const webOnly = <T extends object>(style: T): T | {} => isWeb ? style : {};
export const mobileOnly = <T extends object>(style: T): T | {} => isMobile ? style : {};

// Common web cursor styles
export const cursorPointer = webOnly({ cursor: 'pointer' } as any);
export const cursorDefault = webOnly({ cursor: 'default' } as any);
export const noOutline = webOnly({ outlineStyle: 'none' } as any);
