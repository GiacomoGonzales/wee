import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

// Configurar cómo se muestran las notificaciones cuando la app está en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface PushNotificationData {
  type: 'like' | 'comment' | 'follow' | 'mention' | 'repost' | 'reply' | 'message';
  postId?: string;
  commentId?: string;
  senderId?: string;
  conversationId?: string;
}

export const pushNotificationService = {
  // Registrar para push notifications y obtener el token
  registerForPushNotifications: async (): Promise<string | null> => {
    try {
      // Solo funciona en dispositivos físicos
      if (!Device.isDevice) {
        console.log('Push notifications solo funcionan en dispositivos físicos');
        return null;
      }

      // Verificar permisos existentes
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Si no hay permisos, solicitarlos
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Permisos de notificación denegados');
        return null;
      }

      // Obtener el token de Expo Push
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: '31297521-34c6-4238-af4f-e663953af31f', // EAS project ID from app.json
      });

      const token = tokenData.data;
      console.log('📱 Push token obtenido:', token);

      // Configuración específica de Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#F5B731',
        });
      }

      return token;
    } catch (error) {
      console.error('Error registrando push notifications:', error);
      return null;
    }
  },

  // Guardar el token en el perfil del usuario
  savePushToken: async (userId: string, token: string): Promise<void> => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        pushToken: token,
        pushTokenUpdatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error guardando push token:', error);
    }
  },

  // Eliminar el token (logout)
  removePushToken: async (userId: string): Promise<void> => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        pushToken: null,
        pushTokenUpdatedAt: new Date(),
      });
      console.log('🗑️ Push token eliminado');
    } catch (error) {
      console.error('Error eliminando push token:', error);
    }
  },

  // Listener para cuando se recibe una notificación (app en primer plano)
  addNotificationReceivedListener: (
    callback: (notification: Notifications.Notification) => void
  ) => {
    return Notifications.addNotificationReceivedListener(callback);
  },

  // Listener para cuando el usuario toca una notificación
  addNotificationResponseListener: (
    callback: (response: Notifications.NotificationResponse) => void
  ) => {
    return Notifications.addNotificationResponseReceivedListener(callback);
  },

  // Obtener la última notificación que abrió la app
  getLastNotificationResponse: async () => {
    return await Notifications.getLastNotificationResponseAsync();
  },

  // Limpiar badge
  clearBadge: async () => {
    await Notifications.setBadgeCountAsync(0);
  },

  // Enviar notificación local (para testing)
  sendLocalNotification: async (title: string, body: string, data?: PushNotificationData) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data as any,
        sound: true,
      },
      trigger: null, // Inmediato
    });
  },
};

export default pushNotificationService;
