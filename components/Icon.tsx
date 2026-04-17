import React from 'react';
import { Platform, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Mapeo de iconos Ionicons a emojis como fallback
const ICON_EMOJI_MAP: Record<string, string> = {
  // Navegación
  'home': '🏠',
  'home-outline': '🏠',
  'search': '🔍',
  'search-outline': '🔍',
  'add': '➕',
  'add-outline': '➕',
  'add-circle': '➕',
  'add-circle-outline': '➕',
  'person': '👤',
  'person-outline': '👤',
  'settings': '⚙️',
  'settings-outline': '⚙️',
  'menu': '☰',
  'menu-outline': '☰',
  'close': '✕',
  'close-outline': '✕',
  'arrow-back': '←',
  'arrow-back-outline': '←',
  'chevron-forward': '›',
  'chevron-back': '‹',

  // Social
  'heart': '❤️',
  'heart-outline': '🤍',
  'chatbubble': '💬',
  'chatbubble-outline': '💬',
  'chatbubbles': '💬',
  'chatbubbles-outline': '💬',
  'mail': '✉️',
  'mail-outline': '✉️',
  'share': '↗️',
  'share-outline': '↗️',
  'share-social': '↗️',
  'share-social-outline': '↗️',
  'bookmark': '🔖',
  'bookmark-outline': '🔖',
  'notifications': '🔔',
  'notifications-outline': '🔔',

  // Acciones
  'thumbs-up': '👍',
  'thumbs-up-outline': '👍',
  'thumbs-down': '👎',
  'thumbs-down-outline': '👎',
  'eye': '👁️',
  'eye-outline': '👁️',
  'eye-off': '🙈',
  'eye-off-outline': '🙈',
  'trash': '🗑️',
  'trash-outline': '🗑️',
  'create': '✏️',
  'create-outline': '✏️',
  'pencil': '✏️',
  'pencil-outline': '✏️',
  'flag': '🚩',
  'flag-outline': '🚩',
  'ellipsis-horizontal': '•••',
  'ellipsis-vertical': '⋮',

  // Media
  'image': '🖼️',
  'image-outline': '🖼️',
  'camera': '📷',
  'camera-outline': '📷',
  'videocam': '🎥',
  'videocam-outline': '🎥',
  'film': '🎬',
  'film-outline': '🎬',
  'play': '▶️',
  'play-outline': '▶️',
  'pause': '⏸️',
  'pause-outline': '⏸️',
  'mic': '🎤',
  'mic-outline': '🎤',
  'volume-high': '🔊',
  'volume-mute': '🔇',

  // Categorías
  'globe': '🌍',
  'globe-outline': '🌍',
  'newspaper': '📰',
  'newspaper-outline': '📰',
  'storefront': '🏪',
  'storefront-outline': '🏪',
  'cash': '💵',
  'cash-outline': '💵',
  'briefcase': '💼',
  'briefcase-outline': '💼',
  'fitness': '💪',
  'fitness-outline': '💪',
  'game-controller': '🎮',
  'game-controller-outline': '🎮',
  'school': '🎓',
  'school-outline': '🎓',
  'football': '⚽',
  'football-outline': '⚽',
  'flame': '🔥',
  'flame-outline': '🔥',
  'airplane': '✈️',
  'airplane-outline': '✈️',
  'restaurant': '🍽️',
  'restaurant-outline': '🍽️',
  'shirt': '👕',
  'shirt-outline': '👕',
  'sparkles': '✨',
  'sparkles-outline': '✨',
  'musical-notes': '🎵',
  'musical-notes-outline': '🎵',
  'moon': '🌙',
  'moon-outline': '🌙',
  'sunny': '☀️',
  'sunny-outline': '☀️',
  'leaf': '🌿',
  'leaf-outline': '🌿',
  'paw': '🐾',
  'paw-outline': '🐾',
  'skull': '💀',
  'skull-outline': '💀',
  'calendar': '📅',
  'calendar-outline': '📅',
  'trending-up': '📈',
  'trending-up-outline': '📈',
  'beer': '🍺',
  'beer-outline': '🍺',
  'cafe': '☕',
  'cafe-outline': '☕',
  'hardware-chip': '🤖',
  'hardware-chip-outline': '🤖',
  'logo-bitcoin': '₿',
  'happy': '😊',
  'happy-outline': '😊',
  'people': '👥',
  'people-outline': '👥',
  'document-text': '📄',
  'document-text-outline': '📄',
  'reader': '📖',
  'reader-outline': '📖',
  'radio': '📻',
  'radio-outline': '📻',

  // UI
  'checkmark': '✓',
  'checkmark-outline': '✓',
  'checkmark-circle': '✅',
  'checkmark-circle-outline': '✅',
  'alert-circle': '⚠️',
  'alert-circle-outline': '⚠️',
  'information-circle': 'ℹ️',
  'information-circle-outline': 'ℹ️',
  'help-circle': '❓',
  'help-circle-outline': '❓',
  'shield-checkmark': '🛡️',
  'shield-checkmark-outline': '🛡️',
  'lock-closed': '🔒',
  'lock-closed-outline': '🔒',
  'log-out': '🚪',
  'log-out-outline': '🚪',
  'refresh': '🔄',
  'refresh-outline': '🔄',
  'send': '📤',
  'send-outline': '📤',
  'attach': '📎',
  'attach-outline': '📎',
  'link': '🔗',
  'link-outline': '🔗',
  'copy': '📋',
  'copy-outline': '📋',
  'download': '⬇️',
  'download-outline': '⬇️',
  'time': '🕐',
  'time-outline': '🕐',
  'location': '📍',
  'location-outline': '📍',
  'star': '⭐',
  'star-outline': '⭐',
  'wallet': '👛',
  'wallet-outline': '👛',
  'cart': '🛒',
  'cart-outline': '🛒',
  'repeat': '🔁',
  'repeat-outline': '🔁',
  'swap-horizontal': '⇄',
  'swap-horizontal-outline': '⇄',
};

interface IconProps {
  name: keyof typeof Ionicons.glyphMap;
  size?: number;
  color?: string;
  style?: any;
}

// En web, intentamos usar Ionicons primero, pero si falla usamos emoji
const Icon: React.FC<IconProps> = ({ name, size = 24, color = '#000', style }) => {
  const [useFallback, setUseFallback] = React.useState(false);

  // En web, usar directamente el emoji para evitar problemas de fuentes
  if (Platform.OS === 'web') {
    const emoji = ICON_EMOJI_MAP[name as string] || '•';
    return (
      <Text
        style={[
          styles.emoji,
          { fontSize: size * 0.85, lineHeight: size },
          style
        ]}
      >
        {emoji}
      </Text>
    );
  }

  // En mobile, usar Ionicons normalmente
  return <Ionicons name={name} size={size} color={color} style={style} />;
};

const styles = StyleSheet.create({
  emoji: {
    textAlign: 'center',
  },
});

export default Icon;
