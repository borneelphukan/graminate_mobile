import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Modal, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  Button,
  Surface,
  Text,
  useTheme,
} from "react-native-paper";
import ChatWindow from "./ChatWindow";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const axiosInstance = axios.create({ baseURL: API_URL });

axiosInstance.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

type Props = {
  children: React.ReactNode;
  showNavbar?: boolean;
};

const PlatformLayout = ({ children, showNavbar = true }: Props) => {
  const router = useRouter();
  const { user_id } = useLocalSearchParams<{ user_id: string }>();
  const theme = useTheme();

  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSidebarRendered, setIsSidebarRendered] = useState(false);

  const SIDEBAR_WIDTH = 288;
  const sidebarAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;

  useEffect(() => {
    if (isSidebarOpen) {
      setIsSidebarRendered(true);
      Animated.timing(sidebarAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(sidebarAnim, {
        toValue: -SIDEBAR_WIDTH,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setIsSidebarRendered(false);
      });
    }
  }, [isSidebarOpen, sidebarAnim]);

  const overlayOpacity = sidebarAnim.interpolate({
    inputRange: [-SIDEBAR_WIDTH, 0],
    outputRange: [0, 0.5],
    extrapolate: "clamp",
  });

  useEffect(() => {
    const verifySession = async () => {
      const token = await AsyncStorage.getItem("accessToken");
      const userString = await AsyncStorage.getItem("user");

      if (token && userString) {
        const user = JSON.parse(userString);
        if (user.user_id.toString() === user_id) {
          setIsAuthorized(true);
        }
      }
      setIsLoadingAuth(false);
    };

    if (user_id) {
      verifySession();
    } else {
      setIsLoadingAuth(false);
    }
  }, [user_id]);

  if (isLoadingAuth) {
    return (
      <Surface style={styles.centeredScreen}>
        <ActivityIndicator size="large" />
      </Surface>
    );
  }

  if (!isAuthorized) {
    return (
      <Surface style={styles.centeredScreen}>
        <Text variant="titleLarge" style={styles.authText}>
          Unauthorized Access. Please log in.
        </Text>
        <Button
          mode="contained"
          onPress={() => router.replace("/(tabs)")}
          style={styles.authButton}
        >
          Go to Login
        </Button>
      </Surface>
    );
  }

  return (
    <SafeAreaView
      edges={["bottom", "left", "right"]}
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.flex}>
        {showNavbar && (
          <Navbar
            toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            toggleChat={() => setIsChatOpen(true)}
          />
        )}
        <View style={styles.flex}>{children}</View>
        {isSidebarRendered && (
          <>
            <Pressable
              style={styles.overlay}
              onPress={() => setIsSidebarOpen(false)}
            >
              <Animated.View
                style={[styles.overlayBackground, { opacity: overlayOpacity }]}
              />
            </Pressable>
            <Animated.View
              style={[
                styles.sidebar,
                {
                  width: SIDEBAR_WIDTH,
                  backgroundColor: theme.colors.elevation.level2,
                  transform: [{ translateX: sidebarAnim }],
                },
              ]}
            >
              <Sidebar
                userId={user_id!}
                closeSidebar={() => setIsSidebarOpen(false)}
              />
            </Animated.View>
          </>
        )}

        <Modal
          animationType="slide"
          transparent={false}
          visible={isChatOpen}
          onRequestClose={() => setIsChatOpen(false)}
        >
          <ChatWindow userId={user_id!} onClose={() => setIsChatOpen(false)} />
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  centeredScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  authText: {
    textAlign: "center",
    marginBottom: 16,
  },
  authButton: {
    paddingHorizontal: 16,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 40,
  },
  overlayBackground: {
    flex: 1,
    backgroundColor: "black",
  },
  sidebar: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 50,
  },
});

export default PlatformLayout;
