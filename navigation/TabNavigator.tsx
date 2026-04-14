import React, { useState, useEffect } from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useScroll } from '../contexts/ScrollContext';
import { useResponsive } from '../hooks/useResponsive';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import HomeStackNavigator from './HomeStackNavigator';
import InboxStackNavigator from './InboxStackNavigator';
import ProfileStackNavigator from './ProfileStackNavigator';
import SearchScreen from '../screens/SearchScreen';
import { MainStackParamList } from './MainStackNavigator';
import AvatarDisplay from '../components/avatars/AvatarDisplay';
import { useAuth } from '../contexts/AuthContext';
import { messagesService } from '../services/messagesService';
import CustomTabBar from '../components/CustomTabBar';

// Create sigue como modal (fullscreen)
const CreateTabPlaceholder = () => null;

const Tab = createBottomTabNavigator();

type TabNavigatorNavigationProp = StackNavigationProp<MainStackParamList>;

const CreateTabButton = (props: any) => {
  const navigation = useNavigation<TabNavigatorNavigationProp>();
  const { user } = useAuth();

  return (
    <TouchableOpacity
      {...props}
      onPress={() => {
        if (!user) {
          const parentNav = navigation.getParent();
          if (parentNav) {
            (parentNav as any).navigate('Register');
          }
          return;
        }
        try {
          const parentNav = navigation.getParent();
          if (parentNav) {
            (parentNav as any).navigate('Create');
          } else {
            (navigation as any).navigate('Create');
          }
        } catch (error) {
          console.error('Error navigating to Create:', error);
        }
      }}
    />
  );
};

const TabNavigator: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { userProfile } = useUserProfile();
  const { triggerScrollToTop } = useScroll();
  const { isDesktop, isTablet } = useResponsive();
  const insets = useSafeAreaInsets();
  const [unreadCount, setUnreadCount] = useState(0);

  // Suscribirse al conteo de mensajes no leídos (siempre con uid real, no biz)
  const realUid = user?.uid;
  useEffect(() => {
    if (!realUid) {
      setUnreadCount(0);
      return;
    }

    const unsubscribe = messagesService.subscribeToUnreadCount(realUid, (count) => {
      setUnreadCount(count);
    });

    return () => unsubscribe();
  }, [realUid]);

  return (
    <Tab.Navigator
      initialRouteName="Home"
      backBehavior="initialRoute"
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          // Para Profile, mostrar el avatar del usuario
          if (route.name === 'Profile') {
            if (!user) {
              return <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} size={28} color={color} />;
            }
            return (
              <View style={{
                borderWidth: focused ? 2 : 0,
                borderColor: theme.colors.accent,
                borderRadius: 14,
                padding: focused ? 1 : 0,
              }}>
                <AvatarDisplay
                  size={24}
                  avatarType={userProfile?.avatarType || 'predefined'}
                  avatarId={userProfile?.avatarId || 'male'}
                  photoURL={userProfile?.photoURL}
                  photoURLThumbnail={userProfile?.photoURLThumbnail}
                  backgroundColor={theme.colors.accent}
                  showBorder={false}
                />
              </View>
            );
          }

          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Search':
              iconName = focused ? 'search' : 'search-outline';
              break;
            case 'Create':
              iconName = focused ? 'add-circle' : 'add-circle-outline';
              break;
            case 'Inbox':
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
              break;
            default:
              iconName = 'home-outline';
          }

          return <Ionicons name={iconName} size={28} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: (isDesktop || isTablet) ? {
          display: 'none',
        } : {
          position: 'absolute' as const,
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: -2,
        },
        tabBarItemStyle: {
          paddingTop: 6,
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeStackNavigator}
        options={{ tabBarLabel: 'Inicio' }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            const state = navigation.getState();
            if (state.index === 0) {
              triggerScrollToTop();
            }
          },
        })}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{ tabBarLabel: 'Buscar' }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            if (!user) {
              e.preventDefault();
              const parentNav = navigation.getParent();
              if (parentNav) (parentNav as any).navigate('Register');
            }
          },
        })}
      />
      <Tab.Screen
        name="Create"
        component={CreateTabPlaceholder}
        options={{
          tabBarLabel: 'Crear',
          tabBarButton: (props) => <CreateTabButton {...props} />
        }}
      />
      <Tab.Screen
        name="Inbox"
        component={InboxStackNavigator}
        options={({ route }) => {
          const focusedRoute = getFocusedRouteNameFromRoute(route) ?? 'InboxList';
          return {
            tabBarLabel: 'WeëTalk',
            tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
            tabBarBadgeStyle: {
              backgroundColor: theme.colors.accent,
              color: '#FFFFFF',
              fontSize: 11,
              fontWeight: '600',
              minWidth: 18,
              height: 18,
              borderRadius: 9,
            },
            ...(focusedRoute === 'Conversation' && {
              tabBarStyle: { display: 'none' as const },
            }),
          };
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            if (!user) {
              e.preventDefault();
              const parentNav = navigation.getParent();
              if (parentNav) {
                (parentNav as any).navigate('Register');
              }
            }
          },
        })}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackNavigator}
        options={{ tabBarLabel: 'Perfil' }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            if (!user) {
              e.preventDefault();
              const parentNav = navigation.getParent();
              if (parentNav) {
                (parentNav as any).navigate('Register');
              }
            }
          },
        })}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;
