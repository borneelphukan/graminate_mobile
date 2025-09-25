import { faBars, faBell, faMessage } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState, useCallback } from "react";
import { StyleSheet, View } from "react-native";
import {
  Appbar,
  Avatar,
  Badge,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import NotificationBar from "./NotificationBar";

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const axiosInstance = axios.create({ baseURL: API_URL });

axiosInstance.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

type User = {
  name: string;
  email: string;
  business?: string;
  imageUrl?: string;
};

type Notification = {
  title: string;
  description: string;
};

type NavbarProps = {
  toggleSidebar: () => void;
  toggleChat: () => void;
};

const Navbar = ({ toggleSidebar, toggleChat }: NavbarProps) => {
  const router = useRouter();
  const { user_id } = useLocalSearchParams<{ user_id: string }>();
  const theme = useTheme();

  const [user, setUser] = useState<User>({ name: "", email: "" });
  const [isNotificationBarOpen, setNotificationBarOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([
    { title: "Welcome!", description: "Thank you for joining our platform." },
    {
      title: "Profile Update",
      description:
        "Remember to complete your profile to get the best experience.",
    },
  ]);

  useEffect(() => {
    async function fetchUserDetails() {
      if (!user_id) return;
      try {
        const response = await axiosInstance.get(`/user/${user_id}`);
        const data = response.data?.data?.user;
        if (data) {
          setUser({
            name: `${data.first_name} ${data.last_name}`,
            email: data.email,
            business: data.business_name,
            imageUrl: `https://eu.ui-avatars.com/api/?name=${encodeURIComponent(
              data.first_name
            )}+${encodeURIComponent(
              data.last_name
            )}&size=250&background=random`,
          });
        }
      } catch (error) {
        console.error("Error fetching user details:", error);
      }
    }
    fetchUserDetails();
  }, [user_id]);

  const navigateToSettings = () => {
    setNotificationBarOpen(false);
    setTimeout(() => {
      router.push(`/(tabs)/platform/${user_id}/settings/settings`);
    }, 300);
  };

  const iconColor = theme.colors.onSurface;

  const memoizedBarsIcon = useCallback(
    () => <FontAwesomeIcon icon={faBars} size={22} color={iconColor} />,
    [iconColor]
  );

  const memoizedMessageIcon = useCallback(
    () => <FontAwesomeIcon icon={faMessage} size={22} color={iconColor} />,
    [iconColor]
  );

  const memoizedBellIcon = useCallback(
    () => <FontAwesomeIcon icon={faBell} size={22} color={iconColor} />,
    [iconColor]
  );

  return (
    <>
      <Appbar.Header elevated>
        <Appbar.Action icon={memoizedBarsIcon} onPress={toggleSidebar} />
        <View style={styles.spacer} />
        <Appbar.Action icon={memoizedMessageIcon} onPress={toggleChat} />
        <View>
          <Appbar.Action
            icon={memoizedBellIcon}
            onPress={() => setNotificationBarOpen(true)}
          />
          <Badge
            visible={notifications.length > 0}
            style={styles.badge}
            size={16}
          >
            {notifications.length}
          </Badge>
        </View>
        <TouchableRipple
          onPress={navigateToSettings}
          style={styles.avatarTouchable}
          borderless
        >
          {user.imageUrl ? (
            <Avatar.Image size={32} source={{ uri: user.imageUrl }} />
          ) : (
            <Avatar.Icon size={32} icon="account" />
          )}
        </TouchableRipple>
      </Appbar.Header>

      <NotificationBar
        isOpen={isNotificationBarOpen}
        closeNotificationBar={() => setNotificationBarOpen(false)}
        notifications={notifications}
        onClearAll={() => setNotifications([])}
        onSettings={navigateToSettings}
      />
    </>
  );
};

const styles = StyleSheet.create({
  spacer: {
    flex: 1,
  },
  badge: {
    position: "absolute",
    top: 6,
    right: 6,
  },
  avatarTouchable: {
    marginRight: 8,
    marginLeft: 4,
    borderRadius: 16,
  },
});

export default Navbar;
