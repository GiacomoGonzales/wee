import React, { createContext, useContext, useState, useRef } from 'react';
import { Animated } from 'react-native';

interface TabBarContextType {
  isTransparent: boolean;
  setIsTransparent: (value: boolean) => void;
  scrollProgress: Animated.Value;
}

const TabBarContext = createContext<TabBarContextType>({
  isTransparent: false,
  setIsTransparent: () => {},
  scrollProgress: new Animated.Value(0),
});

export const TabBarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isTransparent, setIsTransparent] = useState(false);
  const scrollProgress = useRef(new Animated.Value(0)).current;
  return (
    <TabBarContext.Provider value={{ isTransparent, setIsTransparent, scrollProgress }}>
      {children}
    </TabBarContext.Provider>
  );
};

export const useTabBar = () => useContext(TabBarContext);
