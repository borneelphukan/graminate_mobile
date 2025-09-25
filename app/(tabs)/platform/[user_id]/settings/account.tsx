import PlatformLayout from "@/components/layout/PlatformLayout";
import {
  faArrowLeft,
  faCheckCircle,
  faExclamationCircle,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import axiosInstance from "@/lib/axiosInstance";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  Appbar,
  Button,
  Card,
  Dialog,
  HelperText,
  Portal,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";

type ModalType = "confirmDelete" | "password" | "info" | null;
type InfoModalContent = {
  title: string;
  message: string;
  type: "success" | "error";
};

const AccountSettingsScreen = () => {
  const router = useRouter();
  const { user_id } = useLocalSearchParams<{ user_id: string }>();
  const theme = useTheme();

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [infoModalContent, setInfoModalContent] = useState<InfoModalContent>({
    title: "Error",
    message: "An unknown error occurred.",
    type: "success",
  });
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const openModal = (type: ModalType, infoContent?: InfoModalContent) => {
    setPassword("");
    setPasswordError(null);
    if (type === "info" && infoContent) setInfoModalContent(infoContent);
    setActiveModal(type);
  };

  const closeModal = async () => {
    const wasSuccess =
      infoModalContent.type === "success" &&
      infoModalContent.title === "Account Deleted";
    setActiveModal(null);
    setInfoModalContent({
      title: "Error",
      message: "An unknown error occurred.",
      type: "success",
    });
    if (wasSuccess) {
      await AsyncStorage.setItem("accountJustDeleted", "true");
      router.replace("/");
    }
  };

  const handleConfirmDeletion = () => {
    setActiveModal(null);
    setTimeout(() => openModal("password"), 50);
  };

  const handlePasswordVerification = async () => {
    if (!user_id || !password) {
      setPasswordError("Password is required.");
      return;
    }
    setIsVerifying(true);
    setPasswordError(null);
    try {
      const response = await axiosInstance.post(
        `/user/verify-password/${user_id}`,
        { password }
      );
      if (response.data.valid) {
        setActiveModal(null);
        await performAccountDeletion();
      } else {
        setPasswordError("The password you entered is incorrect.");
      }
    } catch (error) {
      setPasswordError("Password verification failed. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const performAccountDeletion = async () => {
    if (!user_id) return;
    setIsDeleting(true);
    try {
      const deleteResponse = await axiosInstance.delete(
        `/user/delete/${user_id}`
      );
      if (deleteResponse.status === 200) {
        openModal("info", {
          title: "Account Deleted",
          message: "Your account has been successfully deleted.",
          type: "success",
        });
      } else {
        throw new Error("Deletion failed");
      }
    } catch (err) {
      openModal("info", {
        title: "Error",
        message: "Failed to delete account. Please try again later.",
        type: "error",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const renderModalContent = () => {
    switch (activeModal) {
      case "confirmDelete":
        return (
          <Dialog visible={true} onDismiss={() => setActiveModal(null)}>
            <Dialog.Title>Are you sure?</Dialog.Title>
            <Dialog.Content>
              <Text variant="bodyMedium">
                This action cannot be undone. This will permanently delete your
                account and all associated data.
              </Text>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setActiveModal(null)}>Cancel</Button>
              <Button
                onPress={handleConfirmDeletion}
                textColor={theme.colors.error}
              >
                Delete
              </Button>
            </Dialog.Actions>
          </Dialog>
        );
      case "password":
        return (
          <Dialog
            visible={true}
            onDismiss={() => !isVerifying && setActiveModal(null)}
          >
            <Dialog.Title>Enter Password to Confirm</Dialog.Title>
            <Dialog.Content>
              <TextInput
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChangeText={(val) => {
                  setPassword(val);
                  setPasswordError(null);
                }}
                secureTextEntry
                disabled={isVerifying}
                mode="outlined"
              />
              <HelperText type="error" visible={!!passwordError}>
                {passwordError}
              </HelperText>
            </Dialog.Content>
            <Dialog.Actions>
              <Button
                onPress={() => setActiveModal(null)}
                disabled={isVerifying}
              >
                Cancel
              </Button>
              <Button
                onPress={handlePasswordVerification}
                disabled={isVerifying || !password}
                loading={isVerifying}
              >
                Confirm
              </Button>
            </Dialog.Actions>
          </Dialog>
        );
      case "info":
        return (
          <Dialog visible={true} onDismiss={closeModal}>
            <Dialog.Icon
              icon={() => (
                <FontAwesomeIcon
                  icon={
                    infoModalContent.type === "success"
                      ? faCheckCircle
                      : faExclamationCircle
                  }
                  size={48}
                  color={
                    infoModalContent.type === "success"
                      ? theme.colors.primary
                      : theme.colors.error
                  }
                />
              )}
            />
            <Dialog.Title>{infoModalContent.title}</Dialog.Title>
            <Dialog.Content>
              <Text variant="bodyMedium">{infoModalContent.message}</Text>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={closeModal}>OK</Button>
            </Dialog.Actions>
          </Dialog>
        );
      default:
        return null;
    }
  };

  return (
    <PlatformLayout>
      <Appbar.Header>
        <Appbar.Action
          icon={() => (
            <FontAwesomeIcon
              icon={faArrowLeft}
              size={22}
              color={theme.colors.onSurface}
            />
          )}
          onPress={() => router.back()}
        />
        <Appbar.Content title="Account Settings" />
      </Appbar.Header>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Card>
          <Card.Content style={styles.cardContent}>
            <View>
              <Text variant="titleMedium">Delete Account</Text>
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                Once you delete your account, there is no going back. Please be
                certain.
              </Text>
            </View>
            <Button
              mode="contained"
              onPress={() => openModal("confirmDelete")}
              disabled={!user_id || isDeleting}
              loading={isDeleting}
              buttonColor={theme.colors.error}
              style={styles.deleteButton}
            >
              {isDeleting ? "Deleting..." : "Delete Account"}
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
      <Portal>{renderModalContent()}</Portal>
    </PlatformLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  cardContent: { gap: 16 },
  deleteButton: { alignSelf: "flex-start" },
});

export default AccountSettingsScreen;
