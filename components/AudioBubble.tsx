import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { FONT_SIZE, SPACING } from '../constants/design';

interface AudioBubbleProps {
  audioUrl: string;
  duration?: number;
  mine: boolean;
}

const AudioBubble: React.FC<AudioBubbleProps> = ({ audioUrl, duration, mine }) => {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const fmtDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const toggle = async () => {
    if (playing && soundRef.current) {
      await soundRef.current.pauseAsync();
      setPlaying(false);
      return;
    }

    if (soundRef.current) {
      await soundRef.current.playAsync();
      setPlaying(true);
      return;
    }

    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true },
        (status) => {
          if (!status.isLoaded) return;
          if (status.durationMillis) {
            setProgress(status.positionMillis / status.durationMillis);
          }
          if (status.didJustFinish) {
            setPlaying(false);
            setProgress(0);
            soundRef.current?.unloadAsync();
            soundRef.current = null;
          }
        }
      );
      soundRef.current = sound;
      setPlaying(true);
    } catch (e) {
      console.error('Error playing audio:', e);
    }
  };

  const tintColor = 'rgba(255,255,255,0.85)';
  const barBg = 'rgba(255,255,255,0.25)';
  const barFill = 'rgba(255,255,255,0.75)';
  const textColor = '#fff';

  return (
    <TouchableOpacity style={styles.container} onPress={toggle} activeOpacity={0.8}>
      <Ionicons name={playing ? 'pause' : 'play'} size={22} color={tintColor} />
      <View style={styles.barWrap}>
        <View style={[styles.barBg, { backgroundColor: barBg }]}>
          <View style={[styles.barFill, { backgroundColor: barFill, width: `${Math.max(progress * 100, 2)}%` }]} />
        </View>
        <Text style={[styles.duration, { color: textColor }]}>
          {duration ? fmtDuration(duration) : '0:00'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 160 },
  barWrap: { flex: 1, gap: 3 },
  barBg: { height: 4, borderRadius: 2, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 2 },
  duration: { fontSize: FONT_SIZE.xs },
});

export default AudioBubble;
