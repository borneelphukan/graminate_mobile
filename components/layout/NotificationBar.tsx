import { useUserPreferences } from "@/contexts/UserPreferencesContext";
import { faCog, faTimes, faTrashAlt } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Modal,
  SafeAreaView,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import {
  Button,
  Divider,
  IconButton,
  Surface,
  Text,
  useTheme,
} from "react-native-paper";
import { Notification, NotificationProps } from "./Notification";

type NotificationBarProps = {
  notifications: NotificationProps[];
  isOpen: boolean;
  closeNotificationBar: () => void;
  onClearAll: () => void;
  onSettings: () => void;
};

const screenWidth = Dimensions.get("window").width;
const barWidth = Math.min(screenWidth * 0.85, 350);

const NotificationBar = ({
  notifications,
  isOpen,
  closeNotificationBar,
  onClearAll,
  onSettings,
}: NotificationBarProps) => {
  const { darkMode } = useUserPreferences();
  const theme = useTheme();
  const slideAnim = useRef(new Animated.Value(barWidth)).current;

  useEffect(() => {
    if (isOpen) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [isOpen, slideAnim]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: barWidth,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      closeNotificationBar();
    });
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    container: {
      position: "absolute",
      top: 0,
      right: 0,
      height: "100%",
      width: barWidth,
    },
    surface: {
      flex: 1,
      elevation: 8,
    },
    safeArea: {
      flex: 1,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    actionsContainer: {
      flexDirection: "row",
      justifyContent: "flex-end",
      alignItems: "center",
      paddingHorizontal: 8,
    },
    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
    },
    emptyText: {
      color: theme.colors.onSurfaceDisabled,
      textAlign: "center",
    },
    listContent: {
      padding: 16,
    },
  });

  return (
    <Modal
      transparent={true}
      visible={isOpen}
      animationType="none"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <Animated.View
            style={[
              styles.container,
              { transform: [{ translateX: slideAnim }] },
            ]}
          >
            <TouchableWithoutFeedback>
              <Surface style={styles.surface}>
                <SafeAreaView style={styles.safeArea}>
                  <View style={styles.header}>
                    <Text variant="titleLarge">Notifications</Text>
                    <IconButton
                      icon={() => (
                        <FontAwesomeIcon
                          icon={faTimes}
                          size={24}
                          color={theme.colors.onSurfaceVariant}
                        />
                      )}
                      onPress={handleClose}
                    />
                  </View>

                  <Divider />

                  <View style={styles.actionsContainer}>
                    <Button
                      onPress={onClearAll}
                      textColor={theme.colors.error}
                      icon={() => (
                        <FontAwesomeIcon
                          icon={faTrashAlt}
                          size={18}
                          color={theme.colors.error}
                        />
                      )}
                    >
                      Clear All
                    </Button>
                    <IconButton
                      icon={() => (
                        <FontAwesomeIcon
                          icon={faCog}
                          size={20}
                          color={theme.colors.onSurfaceVariant}
                        />
                      )}
                      onPress={onSettings}
                    />
                  </View>

                  <Divider />

                  {notifications.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <Text style={styles.emptyText}>
                        You don’t have any notifications
                      </Text>
                    </View>
                  ) : (
                    <FlatList
                      data={notifications}
                      keyExtractor={(_, index) => index.toString()}
                      renderItem={({ item }) => (
                        <Notification {...item} darkMode={darkMode} />
                      )}
                      contentContainerStyle={styles.listContent}
                    />
                  )}
                </SafeAreaView>
              </Surface>
            </TouchableWithoutFeedback>
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default NotificationBar;
