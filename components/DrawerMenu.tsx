import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
  Alert,
  Image,
  Linking,
  Platform,
} from 'react-native';

const isWeb = Platform.OS === 'web';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import AvatarDisplay from './avatars/AvatarDisplay';
import { SPACING, FONT_SIZE, FONT_WEIGHT, ICON_SIZE, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';
import { weeBizService, Business } from '../services/weeBizService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.667;

interface DrawerMenuProps {
  visible: boolean;
  onClose: () => void;
}

interface MenuItem {
  label: string;
  icon: string;
  action: () => void;
  separator?: boolean;
  logoUrl?: string;
}

const DrawerMenu: React.FC<DrawerMenuProps> = ({ visible, onClose }) => {
  const { theme, setThemeMode } = useTheme();
  const { user, logout } = useAuth();
  const { userProfile, activeProfileType, hasHidiProfile, hasBizProfile, switchIdentity, switchToBiz, setBizProfile } = useUserProfile();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [myBusiness, setMyBusiness] = useState<Business | null>(null);

  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // Check if user has a business (always use real uid, not hidi/biz uid)
  const realUid = user?.uid;
  useEffect(() => {
    if (!realUid) return;
    const loadBiz = async () => {
      try {
        const biz = await weeBizService.getBusinessByOwner(realUid);
        setMyBusiness(biz);
        // Auto-create biz user profile if business exists but no biz profile yet
        if (biz?.id && !hasBizProfile) {
          const { usersService } = require('../services/firestoreService');
          let bizUserProfile = await usersService.getBizProfile(biz.id);
          if (!bizUserProfile) {
            await usersService.createBizProfile(realUid, biz.id, {
              displayName: biz.name,
              photoURL: biz.logo,
            });
            bizUserProfile = await usersService.getBizProfile(biz.id);
          }
          if (bizUserProfile) {
            setBizProfile(bizUserProfile);
          }
        }
      } catch (e) {
        console.error('Error loading business:', e);
      }
    };
    loadBiz();
  }, [realUid, hasBizProfile]);

  useEffect(() => {
    if (isWeb) {
      // Web: instant show/hide without animation
      translateX.setValue(visible ? 0 : -DRAWER_WIDTH);
      overlayOpacity.setValue(visible ? 1 : 0);
    } else {
      // Mobile: animated
      if (visible) {
        Animated.parallel([
          Animated.timing(translateX, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(overlayOpacity, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        Animated.parallel([
          Animated.timing(translateX, {
            toValue: -DRAWER_WIDTH,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(overlayOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }
  }, [visible]);

  const closeDrawer = () => {
    if (isWeb) {
      // Web: instant close
      onClose();
    } else {
      // Mobile: animated
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: -DRAWER_WIDTH,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onClose();
      });
    }
  };

  const handleNavigate = (screen: string) => {
    closeDrawer();
    // Small delay to let the drawer close animation play (not needed on web)
    const delay = isWeb ? 0 : 220;
    setTimeout(() => {
      const tabNav = navigation.getParent();
      if (tabNav) {
        tabNav.navigate(screen);
      } else {
        navigation.navigate(screen);
      }
    }, delay);
  };

  const handleExploreCommunities = () => {
    closeDrawer();
    setTimeout(() => {
      navigation.navigate('ExploreCommunities');
    }, 220);
  };

  const handleLogout = () => {
    closeDrawer();
    setTimeout(async () => {
      try {
        await logout();
      } catch (error) {
        console.error('Error during logout:', error);
      }
    }, 220);
  };

  const showComingSoon = () => {
    closeDrawer();
    setTimeout(() => {
      Alert.alert('Próximamente', 'Esta función estará disponible pronto.');
    }, 220);
  };

  const menuItems: MenuItem[] = [
    ...(hasHidiProfile ? [{
      label: activeProfileType === 'hidi' ? 'Cambiar a Real' : 'Cambiar a Weë',
      icon: 'swap-horizontal',
      action: () => {
        switchIdentity();
        const nextType = activeProfileType === 'real' ? 'hidi' : 'real';
        setThemeMode(nextType === 'hidi' ? 'dark' : 'light');
      },
    }] : []),
    { label: 'Contactos', icon: 'people-outline', action: showComingSoon },
    { label: 'Comunidades', icon: 'globe-outline', action: handleExploreCommunities },
    { label: 'WeëTalk', icon: 'chatbubble-outline', action: () => handleNavigate('Inbox') },
    // Créditos oculto temporalmente - requiere In-App Purchases para App Store
    // { label: 'Créditos', icon: 'wallet-outline', action: () => handleNavigate('Wallet') },
    { label: 'Reweërds', icon: 'gift-outline', action: showComingSoon },
    { label: 'Weë Biz', icon: 'business-outline', action: () => {
      closeDrawer();
      setTimeout(() => navigation.navigate('WeeBiz' as never), 220);
    } },
    ...(activeProfileType === 'biz' ? [{
      label: 'Volver a mi perfil',
      icon: 'person-outline',
      action: () => {
        switchToBiz();
        setThemeMode('light');
      },
    }] : []),
    ...(myBusiness && activeProfileType !== 'biz' ? [{
      label: myBusiness.name,
      icon: 'storefront-outline',
      logoUrl: myBusiness.logo || undefined,
      action: () => {
        switchToBiz();
        setThemeMode('biz');
        closeDrawer();
      },
    }] : []),
    { label: 'Términos y condiciones', icon: 'document-text-outline', action: () => {
      closeDrawer();
      Linking.openURL('https://wee.zone/terms');
    }, separator: true },
    { label: 'Política de privacidad', icon: 'shield-checkmark-outline', action: () => {
      closeDrawer();
      Linking.openURL('https://wee.zone/privacy');
    }},
    { label: 'Cerrar sesión', icon: 'log-out-outline', action: handleLogout },
  ];

  if (!visible) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 50 }]} pointerEvents="box-none">
      {/* Overlay */}
      <TouchableWithoutFeedback onPress={closeDrawer}>
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} />
      </TouchableWithoutFeedback>

      {/* Drawer panel */}
      <Animated.View
        style={[
          styles.drawer,
          {
            width: DRAWER_WIDTH,
            backgroundColor: theme.colors.background,
            transform: [{ translateX }],
          },
        ]}
      >
        <View style={[styles.drawerContent, { paddingTop: insets.top + SPACING.lg }]}>
          {/* User header - tap to go to profile */}
          <TouchableOpacity
            style={[styles.userHeader, { borderBottomColor: theme.colors.border }]}
            onPress={() => {
              closeDrawer();
              setTimeout(() => navigation.navigate('Profile' as never), 250);
            }}
            activeOpacity={0.7}
          >
            {user ? (
              <AvatarDisplay
                size={scale(56)}
                avatarType={userProfile?.avatarType || 'predefined'}
                avatarId={userProfile?.avatarId || 'male'}
                photoURL={typeof userProfile?.photoURL === 'string' ? userProfile.photoURL : undefined}
                photoURLThumbnail={typeof userProfile?.photoURLThumbnail === 'string' ? userProfile.photoURLThumbnail : undefined}
                backgroundColor="#F5B731"
              />
            ) : (
              <View style={{ width: scale(56), height: scale(56), borderRadius: scale(28), backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="person-circle-outline" size={scale(40)} color="#9CA3AF" />
              </View>
            )}
            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: theme.colors.text }]} numberOfLines={1}>
                {userProfile?.displayName || user?.displayName || 'Usuario'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Menu items */}
          <View style={styles.menuList}>
            {menuItems.map((item, index) => (
              <React.Fragment key={item.label}>
                {item.separator && <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />}
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={item.action}
                  activeOpacity={0.7}
                >
                  {item.logoUrl ? (
                    <Image
                      source={{ uri: item.logoUrl }}
                      style={{ width: ICON_SIZE.lg, height: ICON_SIZE.lg, borderRadius: ICON_SIZE.lg / 2 }}
                    />
                  ) : (
                    <Ionicons
                      name={item.icon as any}
                      size={ICON_SIZE.lg}
                      color={item.label === 'Cerrar sesión' ? theme.colors.error : (activeProfileType === 'biz' ? '#7C3AED' : activeProfileType === 'hidi' ? '#22C55E' : '#F5B731')}
                    />
                  )}
                  <Text style={[
                    styles.menuItemText,
                    { color: item.label === 'Cerrar sesión' ? theme.colors.error : theme.colors.text },
                  ]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 20,
  },
  drawerContent: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingBottom: SPACING.lg,
    marginBottom: SPACING.sm,
    borderBottomWidth: 1,
  },
  userInfo: {
    flex: 1,
    gap: SPACING.xs,
  },
  userName: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
  },
  profileBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  profileBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: scale(2),
    borderRadius: BORDER_RADIUS.sm,
  },
  profileBadgeText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
  menuList: {
    paddingTop: SPACING.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
  },
  menuItemText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.medium,
  },
  separator: {
    height: 1,
    marginVertical: SPACING.sm,
  },
});

export default DrawerMenu;
