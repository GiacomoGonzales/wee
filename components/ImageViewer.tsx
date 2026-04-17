import React, { useState, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Text,
  Animated,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SPACING, ICON_SIZE, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';

interface ImageViewerProps {
  visible: boolean;
  imageUrls: string[];
  initialIndex?: number;
  onClose: () => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Componente individual de imagen con zoom nativo via ScrollView
const ZoomableImage: React.FC<{
  uri: string;
  onZoomChange?: (isZoomed: boolean) => void;
}> = ({ uri, onZoomChange }) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const lastTapTime = useRef(0);

  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapTime.current < 300) {
      // Double tap detectado
      if (isZoomed) {
        scrollViewRef.current?.scrollResponderZoomTo({
          x: 0,
          y: 0,
          width: screenWidth,
          height: screenHeight,
          animated: true,
        });
      } else {
        // Zoom al centro
        scrollViewRef.current?.scrollResponderZoomTo({
          x: screenWidth / 4,
          y: screenHeight / 4,
          width: screenWidth / 2,
          height: screenHeight / 2,
          animated: true,
        });
      }
      lastTapTime.current = 0;
    } else {
      lastTapTime.current = now;
    }
  }, [isZoomed]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const zoomScale = event.nativeEvent.zoomScale;
    const nowZoomed = zoomScale > 1.05;
    if (nowZoomed !== isZoomed) {
      setIsZoomed(nowZoomed);
      onZoomChange?.(nowZoomed);
    }
  }, [isZoomed, onZoomChange]);

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.zoomScrollView}
      contentContainerStyle={styles.zoomScrollContent}
      maximumZoomScale={4}
      minimumZoomScale={1}
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      centerContent={true}
      bouncesZoom={true}
      bounces={false}
      onScroll={handleScroll}
      scrollEventThrottle={16}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={handleDoubleTap}
        style={styles.imageTouch}
      >
        <Image
          source={{ uri }}
          style={styles.image}
          contentFit="contain"
          transition={200}
          cachePolicy="memory-disk"
        />
      </TouchableOpacity>
    </ScrollView>
  );
};

const ImageViewer: React.FC<ImageViewerProps> = ({
  visible,
  imageUrls,
  initialIndex = 0,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const carouselRef = useRef<ScrollView>(null);
  const [isZoomed, setIsZoomed] = useState(false);

  // Animación para swipe vertical (cerrar)
  const translateY = useRef(new Animated.Value(0)).current;
  const backgroundOpacity = useRef(new Animated.Value(1)).current;

  // Reset cuando se abre el modal
  React.useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      setIsZoomed(false);
      translateY.setValue(0);
      backgroundOpacity.setValue(1);

      // Scroll a la imagen inicial
      setTimeout(() => {
        carouselRef.current?.scrollTo({ x: initialIndex * screenWidth, animated: false });
      }, 50);
    }
  }, [visible, initialIndex]);

  const handleZoomChange = useCallback((zoomed: boolean) => {
    setIsZoomed(zoomed);
  }, []);

  const handleCarouselScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / screenWidth);
    if (index !== currentIndex && index >= 0 && index < imageUrls.length) {
      setCurrentIndex(index);
    }
  };

  const isSingleImage = imageUrls.length === 1;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar
        backgroundColor="rgba(0, 0, 0, 0.95)"
        barStyle="light-content"
      />

      {/* Background */}
      <View style={styles.background} />

      <View style={styles.container}>
        {/* Close button */}
        <TouchableOpacity
          style={[styles.closeButton, { top: insets.top + SPACING.md }]}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={ICON_SIZE.xl} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Image counter */}
        {!isSingleImage && (
          <View style={[styles.imageCounter, { top: insets.top + SPACING.md }]}>
            <Text style={styles.imageCounterText}>
              {currentIndex + 1}/{imageUrls.length}
            </Text>
          </View>
        )}

        {/* Contenido */}
        <View style={styles.contentContainer}>
          {isSingleImage ? (
            <ZoomableImage
              uri={imageUrls[0]}
              onZoomChange={handleZoomChange}
            />
          ) : (
            <ScrollView
              ref={carouselRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleCarouselScroll}
              scrollEventThrottle={16}
              style={styles.carouselScrollView}
              bounces={false}
              scrollEnabled={!isZoomed}
            >
              {imageUrls.map((imageUrl, index) => (
                <View key={index} style={styles.carouselPage}>
                  <ZoomableImage
                    uri={imageUrl}
                    onZoomChange={handleZoomChange}
                  />
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Page indicators */}
        {!isSingleImage && (
          <View style={[styles.pageIndicatorContainer, { bottom: insets.bottom + SPACING.xl }]}>
            {imageUrls.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.pageIndicator,
                  {
                    backgroundColor:
                      index === currentIndex ? '#FFFFFF' : 'rgba(255, 255, 255, 0.4)',
                  },
                ]}
              />
            ))}
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    right: SPACING.lg,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageCounter: {
    position: 'absolute',
    left: SPACING.lg,
    zIndex: 10,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  imageCounterText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
  carouselScrollView: {
    flex: 1,
    width: screenWidth,
  },
  carouselPage: {
    width: screenWidth,
    height: screenHeight,
  },
  zoomScrollView: {
    width: screenWidth,
    height: screenHeight,
  },
  zoomScrollContent: {
    width: screenWidth,
    height: screenHeight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageTouch: {
    width: screenWidth,
    height: screenHeight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: screenWidth,
    height: screenHeight,
  },
  pageIndicatorContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  pageIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default ImageViewer;
