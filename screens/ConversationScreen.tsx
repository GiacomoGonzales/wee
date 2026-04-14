import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  ActivityIndicator,
  Alert,
  Modal,
  StatusBar,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { uploadAudioToCloudinary } from '../services/cloudinaryService';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { messagesService, Message, Conversation, ParticipantData } from '../services/messagesService';
import { uploadMessageImageFromUri } from '../services/storageService';
import { cloudinaryThumb } from '../services/cloudinaryService';
import AvatarDisplay from '../components/avatars/AvatarDisplay';
import ChatCamera from '../components/ChatCamera';
import AudioBubble from '../components/AudioBubble';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, ICON_SIZE } from '../constants/design';
import { InboxStackParamList } from '../navigation/InboxStackNavigator';

type ConvRoute = RouteProp<InboxStackParamList, 'Conversation'>;

const ConversationScreen = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { userProfile } = useUserProfile();
  const nav = useNavigation();
  const route = useRoute<ConvRoute>();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  const { conversationId: initialConvId, otherUserId, otherUserData } = route.params || {};

  const [convId, setConvId] = useState<string | undefined>(initialConvId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [ephemeral, setEphemeral] = useState(false);
  const [bubbleColors, setBubbleColors] = useState<{ [uid: string]: string }>({});
  const [showColorPicker, setShowColorPicker] = useState(false);

  const myUid = userProfile?.uid || user?.uid;
  const other = otherUserData || { displayName: 'Usuario', avatarType: 'predefined' as const, avatarId: 'male' };

  // ─── Subscribe to conversation metadata (ephemeral state) ───
  useEffect(() => {
    if (!convId) return;
    return messagesService.subscribeToConversation(convId, (conv) => {
      setEphemeral(!!conv.ephemeral);
      if (conv.bubbleColors) setBubbleColors(conv.bubbleColors);
    });
  }, [convId]);

  // ─── Join/leave chat (for ephemeral cleanup) ───
  useEffect(() => {
    if (!convId || !myUid) return;
    // Clean up old ephemeral messages immediately on enter
    messagesService.cleanupEphemeralMessages(convId);
    messagesService.setActiveInChat(convId, myUid, true);
    return () => { messagesService.setActiveInChat(convId, myUid, false); };
  }, [convId, myUid]);

  // ─── Toggle ephemeral mode ───
  const toggleEphemeral = useCallback(() => {
    if (!convId) return;
    messagesService.toggleEphemeral(convId, !ephemeral);
  }, [convId, ephemeral]);

  // ─── Color picker ───
  const BUBBLE_COLORS = [
    { id: 'default', color: '#F5B731', label: 'Dorado' },
    { id: 'blue', color: '#3B82F6', label: 'Azul' },
    { id: 'green', color: '#22C55E', label: 'Verde' },
    { id: 'purple', color: '#8B5CF6', label: 'Morado' },
    { id: 'pink', color: '#EC4899', label: 'Rosa' },
    { id: 'red', color: '#EF4444', label: 'Rojo' },
    { id: 'orange', color: '#F97316', label: 'Naranja' },
    { id: 'teal', color: '#14B8A6', label: 'Teal' },
    { id: 'dark', color: '#374151', label: 'Oscuro' },
  ];

  // My bubble color and other's bubble color
  const myBubbleColor = (myUid && bubbleColors[myUid]) || theme.colors.accent;
  const otherBubbleColor = (otherUserId && bubbleColors[otherUserId]) || theme.colors.surface;

  const pickColor = useCallback((color: string) => {
    if (!convId || !myUid) return;
    setBubbleColors(prev => ({ ...prev, [myUid]: color }));
    setShowColorPicker(false);
    messagesService.setBubbleColor(convId, myUid, color);
  }, [convId, myUid]);

  // ─── Android keyboard tracking (Expo Go uses adjustPan, KAV doesn't work) ───
  const [androidKbHeight, setAndroidKbHeight] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', (e) => setAndroidKbHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setAndroidKbHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  // ─── Init conversation ───
  useEffect(() => {
    if (!user || !userProfile) return;

    // If we already have a conversation ID, skip the lookup — show UI immediately
    if (convId) {
      setLoading(false);
      messagesService.markAsRead(convId, userProfile.uid).catch(() => {});
      return;
    }

    // No conversation ID: need to find or create one
    if (otherUserId && otherUserData) {
      messagesService.getOrCreateConversation(
        userProfile.uid, otherUserId,
        { displayName: userProfile.displayName, avatarType: userProfile.avatarType, avatarId: userProfile.avatarId, photoURL: userProfile.photoURL },
        otherUserData,
      ).then(cid => {
        setConvId(cid);
        setLoading(false);
      }).catch(e => {
        console.error('Error initializing conversation:', e);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [user, userProfile, otherUserId]);

  // ─── Real-time messages ───
  useEffect(() => {
    if (!convId) return;
    let firstLoad = true;
    const unsub = messagesService.subscribeToMessages(convId, (msgs) => {
      setMessages([...msgs].filter(m => !(m as any).deleted).reverse());
      if (!messagesLoaded) setMessagesLoaded(true);
      // Only mark as read on first load, not on every new message
      if (firstLoad && myUid) {
        firstLoad = false;
        messagesService.markAsRead(convId, myUid).catch(() => {});
      }
    });
    return unsub;
  }, [convId, myUid]);

  // ─── Send text ───
  const send = useCallback(async () => {
    const t = text.trim();
    if (!t || !convId || !myUid || sending) return;
    setText('');
    setSending(true);
    try {
      await messagesService.sendMessage(convId, myUid, t);
    } catch (e) {
      console.error('Error sending message:', e);
    }
    setSending(false);
  }, [text, convId, myUid, sending]);

  // ─── Photo preview state ───
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [previewViewOnce, setPreviewViewOnce] = useState(false);
  const [viewOnceImage, setViewOnceImage] = useState<string | null>(null);

  // ─── Send image ───
  const confirmSendImage = useCallback(async () => {
    if (!previewUri || !convId || !myUid) return;
    const uri = previewUri;
    const viewOnce = previewViewOnce;
    setPreviewUri(null);
    setPreviewViewOnce(false);
    setSending(true);
    try {
      const url = await uploadMessageImageFromUri(uri, myUid);
      await messagesService.sendMessage(convId, myUid, viewOnce ? 'Foto única' : '📷 Imagen', 'image', url, viewOnce);
    } catch (e) {
      Alert.alert('Error', 'No se pudo enviar la imagen');
    }
    setSending(false);
  }, [previewUri, previewViewOnce, convId, myUid]);

  // ─── Pick from gallery → show preview ───
  const pickImage = useCallback(async () => {
    if (!convId || !myUid || sending) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permisos', 'Se necesitan permisos para acceder a fotos');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    setPreviewViewOnce(false);
    setPreviewUri(result.assets[0].uri);
  }, [convId, myUid, sending]);

  // ─── Camera modal ───
  const [cameraOpen, setCameraOpen] = useState(false);

  // ─── Audio recording ───
  const [recording, setRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const recordStartTime = useRef(0);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const startPulse = useCallback(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return loop;
  }, [pulseAnim]);

  const startRecording = useCallback(async () => {
    if (!convId || !myUid || sending || recording) return;
    try {
      if (recordingRef.current) {
        try { await recordingRef.current.stopAndUnloadAsync(); } catch {}
        recordingRef.current = null;
      }
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) { Alert.alert('Permisos', 'Se necesitan permisos para grabar audio'); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = rec;
      recordStartTime.current = Date.now();
      setRecordDuration(0);
      setRecording(true);
      // Start timer
      recordTimerRef.current = setInterval(() => {
        setRecordDuration(Math.round((Date.now() - recordStartTime.current) / 1000));
      }, 500);
      startPulse();
    } catch (e) {
      console.error('Error starting recording:', e);
      setRecording(false);
    }
  }, [convId, myUid, sending, recording, startPulse]);

  const stopRecording = useCallback(async () => {
    if (!recordingRef.current || !convId || !myUid) return;
    // Stop UI
    setRecording(false);
    setRecordDuration(0);
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
    if (recordTimerRef.current) { clearInterval(recordTimerRef.current); recordTimerRef.current = null; }

    try {
      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      if (!uri) return;

      const durationSec = Math.round((Date.now() - recordStartTime.current) / 1000);
      if (durationSec < 1) return;

      setSending(true);
      const audioUrl = await uploadAudioToCloudinary(uri, `audio/${myUid}`);
      await messagesService.sendMessage(convId, myUid, '🎤 Audio', 'audio', audioUrl, false, durationSec);
      setSending(false);
    } catch (e) {
      console.error('Error sending audio:', e);
      setSending(false);
    }
  }, [convId, myUid, pulseAnim]);

  const handleCameraSend = useCallback(async (uri: string, viewOnce: boolean) => {
    setCameraOpen(false);
    if (!convId || !myUid) return;
    setSending(true);
    try {
      const url = await uploadMessageImageFromUri(uri, myUid);
      await messagesService.sendMessage(convId, myUid, viewOnce ? 'Foto única' : '📷 Imagen', 'image', url, viewOnce);
    } catch (e) {
      Alert.alert('Error', 'No se pudo enviar la imagen');
    }
    setSending(false);
  }, [convId, myUid]);

  // ─── View once: open and mark as seen ───
  const openViewOnce = useCallback(async (msg: Message) => {
    if (!msg.imageUrl || !msg.id || !convId) return;
    setViewOnceImage(msg.imageUrl);
    await messagesService.markViewOnceOpened(convId, msg.id);
  }, [convId]);

  // ─── Time helpers ───
  const fmtTime = (ts: any) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const fmtDate = (ts: any) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diff === 0) return 'Hoy';
    if (diff === 1) return 'Ayer';
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  const showDate = (index: number) => {
    const msg = messages[index];
    const next = messages[index + 1];
    if (!next) return true;
    const d1 = msg.timestamp?.toDate ? msg.timestamp.toDate() : new Date(msg.timestamp);
    const d2 = next.timestamp?.toDate ? next.timestamp.toDate() : new Date(next.timestamp);
    return d1.toDateString() !== d2.toDateString();
  };

  // ─── Render bubble ───
  const renderItem = useCallback(({ item, index }: { item: Message; index: number }) => {
    const mine = item.senderId === myUid;

    return (
      <View>
        {showDate(index) && (
          <View style={styles.dateRow}>
            <View style={[styles.datePill, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.dateText, { color: theme.colors.textSecondary }]}>
                {fmtDate(item.timestamp)}
              </Text>
            </View>
          </View>
        )}

        <View style={[styles.row, mine ? styles.rowR : styles.rowL]}>
          {item.type === 'image' && item.imageUrl && !item.viewOnce ? (
            // ─── Normal image: no bubble background, just rounded photo ───
            <View>
              <TouchableOpacity activeOpacity={0.9} onPress={() => setViewOnceImage(item.imageUrl!)}>
                <Image
                  source={{ uri: cloudinaryThumb(item.imageUrl, 400) }}
                  style={styles.imgStandalone}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={150}
                />
              </TouchableOpacity>
              <View style={[styles.meta, { marginTop: 4 }]}>
                <Text style={[styles.time, { color: theme.colors.textSecondary }]}>
                  {fmtTime(item.timestamp)}
                </Text>
                {mine && (
                  <Ionicons name={item.read ? 'checkmark-done' : 'checkmark'} size={13} color={theme.colors.textSecondary} style={{ marginLeft: 2 }} />
                )}
              </View>
            </View>
          ) : (
            // ─── Text or view-once: normal bubble ───
            <View style={[
              styles.bubble,
              mine
                ? { backgroundColor: myBubbleColor, borderBottomRightRadius: 4 }
                : { backgroundColor: otherBubbleColor, borderBottomLeftRadius: 4 },
              item.ephemeral && styles.ephemeralBubble,
            ]}>
              {item.ephemeral && (
                <View style={styles.ephemeralIcon}>
                  <Ionicons name="eye-off" size={10} color="#fff" />
                </View>
              )}
              {item.type === 'image' && item.imageUrl && item.viewOnce ? (
                item.viewOnceOpened && !mine ? (
                  <View style={styles.viewOnceOpened}>
                    <Ionicons name="eye-off-outline" size={20} color="rgba(255,255,255,.55)" />
                    <Text style={[styles.viewOnceText, { color: 'rgba(255,255,255,.55)' }]}>Foto vista</Text>
                  </View>
                ) : mine ? (
                  <View style={styles.viewOnceSender}>
                    <Ionicons name="eye-off" size={20} color="rgba(255,255,255,.7)" />
                    <Text style={[styles.viewOnceText, { color: 'rgba(255,255,255,.7)' }]}>
                      {item.viewOnceOpened ? 'Abierta' : 'Foto única'}
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.viewOnceTap} onPress={() => openViewOnce(item)}>
                    <Ionicons name="eye" size={24} color="#fff" />
                    <Text style={[styles.viewOnceText, { color: '#fff' }]}>Toca para ver</Text>
                  </TouchableOpacity>
                )
              ) : item.type === 'audio' && item.audioUrl ? (
                <AudioBubble audioUrl={item.audioUrl} duration={item.audioDuration} mine={mine} />
              ) : (
                <Text style={[styles.msgText, { color: '#fff' }]}>
                  {item.content}
                </Text>
              )}
              <View style={styles.meta}>
                <Text style={[styles.time, { color: 'rgba(255,255,255,.55)' }]}>
                  {fmtTime(item.timestamp)}
                </Text>
                {mine && (
                  <Ionicons name={item.read ? 'checkmark-done' : 'checkmark'} size={13} color="rgba(255,255,255,.55)" style={{ marginLeft: 2 }} />
                )}
              </View>
            </View>
          )}
        </View>
      </View>
    );
  }, [messages, theme, myUid, myBubbleColor, otherBubbleColor]);

  // ─── Loading ───
  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, paddingTop: insets.top + SPACING.md }]}>
        <TouchableOpacity onPress={() => nav.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={theme.colors.text} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerUser} activeOpacity={0.7}>
          <AvatarDisplay size={34} avatarType={other.avatarType || 'predefined'} avatarId={other.avatarId || 'male'}
            photoURL={typeof other.photoURL === 'string' ? other.photoURL : undefined}
            backgroundColor={theme.colors.accent} showBorder={false} />
          <View>
            <Text style={[styles.headerName, { color: theme.colors.text }]} numberOfLines={1}>
              {other.displayName}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity hitSlop={8} onPress={() => setShowColorPicker(true)} style={styles.ephemeralBtn}>
          <Ionicons name="color-palette-outline" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity hitSlop={8} onPress={toggleEphemeral} style={[styles.ephemeralBtn, ephemeral && { backgroundColor: 'rgba(34,197,94,0.15)' }]}>
          <Ionicons name={ephemeral ? 'eye-off' : 'eye-off-outline'} size={20} color={ephemeral ? '#22C55E' : theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Ephemeral banner */}
      {ephemeral && (
        <View style={[styles.ephemeralBanner, { backgroundColor: 'rgba(34,197,94,0.1)' }]}>
          <Ionicons name="eye-off" size={14} color="#22C55E" />
          <Text style={styles.ephemeralBannerText}>Modo efímero activado · Los mensajes se borran al salir</Text>
        </View>
      )}

      {/* Chat — iOS: KAV with padding, Android: manual keyboard height */}
      {Platform.OS === 'ios' ? (
      <KeyboardAvoidingView
        style={styles.fill}
        behavior="padding"
        keyboardVerticalOffset={-insets.bottom + 8}
      >
        <FlatList
          style={styles.fill}
          data={messages}
          renderItem={renderItem}
          keyExtractor={m => m.id || `${m.senderId}-${m.timestamp}`}
          inverted
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            !messagesLoaded ? (
              <View style={styles.skeletonWrap}>
                {[0.7, 0.5, 0.85, 0.4, 0.65].map((w, i) => (
                  <View key={i} style={[styles.skeletonRow, i % 2 === 0 ? styles.rowL : styles.rowR]}>
                    <View style={[styles.skeletonBubble, { width: `${w * 70}%`, backgroundColor: theme.colors.surface }]} />
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="chatbubble-ellipses-outline" size={56} color={theme.colors.textSecondary} style={{ opacity: 0.3 }} />
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>Envía el primer mensaje</Text>
              </View>
            )
          }
        />
        {recording ? (
          <View style={[styles.inputBar, styles.recordingBar, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, paddingBottom: Math.max(insets.bottom, 6) }]}>
            <Animated.View style={[styles.recordingDot, { transform: [{ scale: pulseAnim }] }]} />
            <Text style={styles.recordingTime}>{Math.floor(recordDuration / 60)}:{(recordDuration % 60).toString().padStart(2, '0')}</Text>
            <View style={styles.recordingWave}>
              {[...Array(12)].map((_, i) => (
                <View key={i} style={[styles.recordingWaveBar, { height: 8 + Math.random() * 16, backgroundColor: '#EF4444', opacity: 0.4 + Math.random() * 0.6 }]} />
              ))}
            </View>
            <TouchableOpacity onPress={stopRecording} style={styles.recordingStopBtn}>
              <Ionicons name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.inputBar, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, paddingBottom: Math.max(insets.bottom, 6) }]}>
            <TouchableOpacity style={[styles.cameraBtn, { backgroundColor: myBubbleColor }]} onPress={() => setCameraOpen(true)} disabled={sending}>
              <Ionicons name="camera" size={20} color="#fff" />
            </TouchableOpacity>
            <View style={[styles.inputWrap, { backgroundColor: theme.colors.surface }]}>
              <TextInput
                ref={inputRef}
                style={[styles.input, { color: theme.colors.text }]}
                placeholder="Mensaje..."
                placeholderTextColor={theme.colors.textSecondary}
                value={text}
                onChangeText={setText}
                multiline
                maxLength={500}
                editable={!sending}
              />
              {text.trim() ? (
                <TouchableOpacity onPress={send} disabled={sending} style={[styles.sendBtn, { backgroundColor: myBubbleColor }]}>
                  {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={16} color="#fff" />}
                </TouchableOpacity>
              ) : (
                <View style={styles.inputActions}>
                  <TouchableOpacity style={styles.inputActionBtn} onPressIn={startRecording} disabled={sending}>
                    <Ionicons name="mic-outline" size={22} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.inputActionBtn} onPress={pickImage} disabled={sending}>
                    <Ionicons name="image-outline" size={22} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
      ) : (
      /* Android: simple View with marginBottom for keyboard */
      <View style={[styles.fill, { marginBottom: androidKbHeight > 0 ? androidKbHeight + 16 : 24 }]}>
        <FlatList
          style={styles.fill}
          data={messages}
          renderItem={renderItem}
          keyExtractor={m => m.id || `${m.senderId}-${m.timestamp}`}
          inverted
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            !messagesLoaded ? (
              <View style={styles.skeletonWrap}>
                {[0.7, 0.5, 0.85, 0.4, 0.65].map((w, i) => (
                  <View key={i} style={[styles.skeletonRow, i % 2 === 0 ? styles.rowL : styles.rowR]}>
                    <View style={[styles.skeletonBubble, { width: `${w * 70}%`, backgroundColor: theme.colors.surface }]} />
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="chatbubble-ellipses-outline" size={56} color={theme.colors.textSecondary} style={{ opacity: 0.3 }} />
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>Envía el primer mensaje</Text>
              </View>
            )
          }
        />
        {recording ? (
          <View style={[styles.inputBar, styles.recordingBar, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, paddingBottom: androidKbHeight > 0 ? 10 : Math.max(insets.bottom, 16) }]}>
            <Animated.View style={[styles.recordingDot, { transform: [{ scale: pulseAnim }] }]} />
            <Text style={styles.recordingTime}>{Math.floor(recordDuration / 60)}:{(recordDuration % 60).toString().padStart(2, '0')}</Text>
            <View style={styles.recordingWave}>
              {[...Array(12)].map((_, i) => (
                <View key={i} style={[styles.recordingWaveBar, { height: 8 + Math.random() * 16, backgroundColor: '#EF4444', opacity: 0.4 + Math.random() * 0.6 }]} />
              ))}
            </View>
            <TouchableOpacity onPress={stopRecording} style={styles.recordingStopBtn}>
              <Ionicons name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.inputBar, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, paddingBottom: androidKbHeight > 0 ? 10 : Math.max(insets.bottom, 16) }]}>
            <TouchableOpacity style={[styles.cameraBtn, { backgroundColor: myBubbleColor }]} onPress={() => setCameraOpen(true)} disabled={sending}>
              <Ionicons name="camera" size={20} color="#fff" />
            </TouchableOpacity>
            <View style={[styles.inputWrap, { backgroundColor: theme.colors.surface }]}>
              <TextInput
                ref={inputRef}
                style={[styles.input, { color: theme.colors.text }]}
                placeholder="Mensaje..."
                placeholderTextColor={theme.colors.textSecondary}
                value={text}
                onChangeText={setText}
                multiline
                maxLength={500}
                editable={!sending}
              />
              {text.trim() ? (
                <TouchableOpacity onPress={send} disabled={sending} style={[styles.sendBtn, { backgroundColor: myBubbleColor }]}>
                  {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={16} color="#fff" />}
                </TouchableOpacity>
              ) : (
                <View style={styles.inputActions}>
                  <TouchableOpacity style={styles.inputActionBtn} onPressIn={startRecording} disabled={sending}>
                    <Ionicons name="mic-outline" size={22} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.inputActionBtn} onPress={pickImage} disabled={sending}>
                    <Ionicons name="image-outline" size={22} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}
      </View>
      )}

      {/* Photo preview before sending */}
      <Modal visible={!!previewUri} transparent animationType="slide" onRequestClose={() => setPreviewUri(null)}>
        <View style={styles.previewModal}>
          <View style={styles.previewHeader}>
            <TouchableOpacity onPress={() => setPreviewUri(null)}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          <Image source={{ uri: previewUri || '' }} style={styles.previewImage} contentFit="contain" />

          <View style={styles.previewFooter}>
            <TouchableOpacity
              style={[styles.previewToggle, previewViewOnce && styles.previewToggleActive]}
              onPress={() => setPreviewViewOnce(!previewViewOnce)}
            >
              <Ionicons name={previewViewOnce ? 'eye-off' : 'eye-outline'} size={20} color="#fff" />
              <Text style={styles.previewToggleText}>
                {previewViewOnce ? 'Ver una sola vez' : 'Conservar en el chat'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.previewSendBtn} onPress={confirmSendImage}>
              <Ionicons name="send" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Color picker */}
      <Modal visible={showColorPicker} transparent animationType="fade" onRequestClose={() => setShowColorPicker(false)}>
        <TouchableOpacity style={styles.colorPickerOverlay} activeOpacity={1} onPress={() => setShowColorPicker(false)}>
          <View style={[styles.colorPickerSheet, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.colorPickerTitle, { color: theme.colors.text }]}>Color del chat</Text>
            <View style={styles.colorGrid}>
              {BUBBLE_COLORS.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.colorOption, { backgroundColor: c.color }, myBubbleColor === c.color && styles.colorOptionActive]}
                  onPress={() => pickColor(c.color)}
                />
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Custom camera */}
      <ChatCamera visible={cameraOpen} onClose={() => setCameraOpen(false)} onSend={handleCameraSend} />

      {/* Fullscreen image viewer (normal photos + view-once) */}
      <Modal visible={!!viewOnceImage} animationType="fade" onRequestClose={() => setViewOnceImage(null)}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <TouchableOpacity style={styles.viewOnceModal} activeOpacity={1} onPress={() => setViewOnceImage(null)}>
          <View style={styles.viewOnceImageWrap}>
            <Image source={{ uri: viewOnceImage || '' }} style={styles.viewOnceFullImage} contentFit="cover" />
          </View>
          <Text style={styles.viewOnceHint}>Toca para cerrar</Text>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  fill: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: SPACING.sm,
  },
  headerUser: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  headerName: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold },

  list: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },

  dateRow: { alignItems: 'center', marginVertical: SPACING.md },
  datePill: { paddingHorizontal: SPACING.md, paddingVertical: 3, borderRadius: BORDER_RADIUS.full },
  dateText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.medium },

  row: { marginVertical: 2 },
  rowR: { alignItems: 'flex-end' },
  rowL: { alignItems: 'flex-start' },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: 6,
    borderRadius: BORDER_RADIUS.lg,
  },
  msgText: { fontSize: FONT_SIZE.base, lineHeight: 20 },
  img: { width: 220, aspectRatio: 3 / 4, borderRadius: BORDER_RADIUS.md, marginBottom: 4 },
  imgStandalone: { width: 220, aspectRatio: 3 / 4, borderRadius: BORDER_RADIUS.lg },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 2 },
  time: { fontSize: 11 },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: SPACING.md },
  emptyText: { fontSize: FONT_SIZE.base },
  skeletonWrap: { flex: 1, justifyContent: 'flex-end', gap: 10, paddingBottom: SPACING.md },
  skeletonRow: { paddingHorizontal: SPACING.xs },
  skeletonBubble: { height: 38, borderRadius: BORDER_RADIUS.lg, opacity: 0.4 },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  cameraBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    paddingLeft: SPACING.md,
    paddingRight: 4,
    minHeight: 44,
    maxHeight: 100,
  },
  input: {
    flex: 1,
    fontSize: FONT_SIZE.base,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    ...Platform.select({ web: { outlineStyle: 'none' as any } }),
  },
  inputActions: { flexDirection: 'row', alignItems: 'center', paddingBottom: 4 },
  inputActionBtn: { width: 34, height: 34, justifyContent: 'center', alignItems: 'center' },
  recordingBar: { justifyContent: 'center' },
  recordingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444' },
  recordingTime: { color: '#EF4444', fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, fontVariant: ['tabular-nums'], marginHorizontal: 8 },
  recordingWave: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 3 },
  recordingWaveBar: { width: 3, borderRadius: 2 },
  recordingStopBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' },
  sendBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  ephemeralBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  ephemeralBubble: { opacity: 0.85 },
  ephemeralIcon: { position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: 9, backgroundColor: '#22C55E', justifyContent: 'center', alignItems: 'center' },
  ephemeralBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 6 },
  ephemeralBannerText: { color: '#22C55E', fontSize: 11, fontWeight: FONT_WEIGHT.medium },

  // Color picker
  colorPickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  colorPickerSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },
  colorPickerTitle: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, marginBottom: 16, textAlign: 'center' },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 14 },
  colorOption: { width: 44, height: 44, borderRadius: 22 },
  colorOptionActive: { borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },

  // View once styles
  viewOnceOpened: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  viewOnceSender: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  viewOnceTap: { alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 20 },
  viewOnceText: { fontSize: FONT_SIZE.sm },

  // Photo preview modal
  previewModal: { flex: 1, backgroundColor: '#000' },
  previewHeader: { flexDirection: 'row', justifyContent: 'flex-start', paddingHorizontal: SPACING.lg, paddingTop: 50, paddingBottom: SPACING.md },
  previewImage: { flex: 1 },
  previewFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.lg, paddingBottom: 40 },
  previewToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24 },
  previewToggleActive: { backgroundColor: 'rgba(34,197,94,0.6)' },
  previewToggleText: { color: '#fff', fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },
  previewSendBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F5B731', justifyContent: 'center', alignItems: 'center' },

  // View once fullscreen viewer
  viewOnceModal: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', padding: 20 },
  viewOnceImageWrap: { width: '100%', aspectRatio: 3 / 4, borderRadius: 16, overflow: 'hidden' },
  viewOnceFullImage: { width: '100%', height: '100%' },
  viewOnceHint: { color: 'rgba(255,255,255,0.35)', fontSize: FONT_SIZE.sm, marginTop: SPACING.lg },
});

export default ConversationScreen;
