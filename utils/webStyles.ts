import { Platform, StyleSheet } from 'react-native';

/**
 * Web-specific styles utility
 * Use these helpers to add web-specific behaviors like cursor and hover
 */

export const isWeb = Platform.OS === 'web';

// Web-only style properties
export const webOnlyStyles = {
  // Cursor styles
  cursorPointer: isWeb ? { cursor: 'pointer' } : {},
  cursorDefault: isWeb ? { cursor: 'default' } : {},
  cursorText: isWeb ? { cursor: 'text' } : {},
  cursorNotAllowed: isWeb ? { cursor: 'not-allowed' } : {},

  // Remove outline on focus (for custom focus styles)
  noOutline: isWeb ? { outlineStyle: 'none' } : {},

  // Disable text selection
  noSelect: isWeb ? { userSelect: 'none' } : {},

  // Enable text selection
  selectText: isWeb ? { userSelect: 'text' } : {},

  // Smooth transitions for hover effects
  transition: isWeb ? { transition: 'all 0.2s ease' } : {},
  transitionFast: isWeb ? { transition: 'all 0.1s ease' } : {},
  transitionSlow: isWeb ? { transition: 'all 0.3s ease' } : {},

  // Box shadow for cards
  cardShadow: isWeb ? {
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  } : {},
  cardShadowHover: isWeb ? {
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  } : {},
};

// Helper to conditionally apply web styles
export const webStyle = <T extends object>(style: T): T | {} => {
  return isWeb ? style : {};
};

// Common button styles for web
export const webButtonStyles = StyleSheet.create({
  clickable: {
    ...(isWeb ? { cursor: 'pointer', transition: 'opacity 0.2s ease' } as any : {}),
  },
  disabled: {
    ...(isWeb ? { cursor: 'not-allowed', opacity: 0.5 } as any : {}),
  },
});

// Input styles for web
export const webInputStyles = StyleSheet.create({
  input: {
    ...(isWeb ? { outlineStyle: 'none', cursor: 'text' } as any : {}),
  },
});

export default {
  isWeb,
  webOnlyStyles,
  webStyle,
  webButtonStyles,
  webInputStyles,
};
