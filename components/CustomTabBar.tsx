import React from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { BottomTabBarProps, BottomTabBar } from '@react-navigation/bottom-tabs';
import { useTabBar } from '../contexts/TabBarContext';
import { useTheme } from '../contexts/ThemeContext';

const CustomTabBar: React.FC<BottomTabBarProps> = (props) => {
  const { scrollProgress, isTransparent } = useTabBar();
  const { theme } = useTheme();

  // Normal (Wall): opacity 1→0
  const normalOpacity = scrollProgress.interpolate({
    inputRange: [0, 0.5],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Transparent (Weels): opacity 0→1
  const transparentOpacity = scrollProgress.interpolate({
    inputRange: [0.5, 1],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // Transparent layer: no bg, white icons
  const makeTransparentDescs = () => {
    const descs = { ...props.descriptors };
    for (const key of Object.keys(descs)) {
      const d = descs[key];
      const baseStyle = typeof d.options.tabBarStyle === 'object' ? d.options.tabBarStyle : {};
      descs[key] = {
        ...d,
        options: {
          ...d.options,
          tabBarStyle: { ...baseStyle, backgroundColor: 'transparent', borderTopWidth: 0 },
          tabBarActiveTintColor: 'white',
          tabBarInactiveTintColor: 'rgba(255,255,255,0.5)',
        },
      };
    }
    return descs;
  };

  // Solid layer: solid bg, normal icons
  const makeSolidDescs = () => {
    const descs = { ...props.descriptors };
    for (const key of Object.keys(descs)) {
      const d = descs[key];
      const baseStyle = typeof d.options.tabBarStyle === 'object' ? d.options.tabBarStyle : {};
      descs[key] = {
        ...d,
        options: {
          ...d.options,
          tabBarStyle: {
            ...baseStyle,
            backgroundColor: theme.dark ? '#1C1C1E' : '#FFFFFF',
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
          },
        },
      };
    }
    return descs;
  };

  return (
    <View>
      {/* Layer 1: Transparent (Weels) — fades in, defines layout */}
      <Animated.View style={{ opacity: transparentOpacity }} pointerEvents={isTransparent ? 'auto' : 'none'}>
        <BottomTabBar {...props} descriptors={makeTransparentDescs()} />
      </Animated.View>

      {/* Layer 2: Solid (Wall) — fades out, on top with its own solid background */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: normalOpacity }]} pointerEvents={isTransparent ? 'none' : 'auto'}>
        <BottomTabBar {...props} descriptors={makeSolidDescs()} />
      </Animated.View>
    </View>
  );
};

export default CustomTabBar;
