import PlatformLayout from "@/components/layout/PlatformLayout";
import { LANGUAGES, TIME_FORMAT } from "@/constants/options";
import {
  faArrowLeft,
  faChevronDown,
  faCity,
  faMap,
  faMapMarkerAlt,
  faPhone,
  faSave,
  faSignsPost,
  faTrashAlt,
  faUpload,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import axiosInstance from "@/lib/axiosInstance";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Appbar,
  Avatar,
  Button,
  Card,
  HelperText,
  Menu,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from "react-native-paper";

type TimeFormatOption = "12-hour" | "24-hour";
type SupportedLanguage = "English" | "Hindi" | "Assamese";

const PaperFormDropdown = ({
  label,
  items,
  selectedValue,
  onSelect,
  disabled = false,
  style,
}: any) => {
  const [visible, setVisible] = useState(false);
  const theme = useTheme();

  return (
    <Menu
      visible={visible}
      onDismiss={() => setVisible(false)}
      anchor={
        <TouchableRipple
          onPress={() => !disabled && setVisible(true)}
          disabled={disabled}
          style={style}
        >
          <TextInput
            mode="outlined"
            label={label}
            value={selectedValue}
            editable={false}
            right={
              <TextInput.Icon
                icon={() => (
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    size={16}
                    color={theme.colors.onSurfaceVariant}
                  />
                )}
              />
            }
            disabled={disabled}
          />
        </TouchableRipple>
      }
    >
      {items.map((item: string) => (
        <Menu.Item
          key={item}
          title={item}
          onPress={() => {
            onSelect(item);
            setVisible(false);
          }}
        />
      ))}
    </Menu>
  );
};

const GeneralSettingsScreen = () => {
  const theme = useTheme();
  const { user_id } = useLocalSearchParams<{ user_id: string }>();

  const [isLoadingPageData, setIsLoadingPageData] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMessage, setProfileSuccessMessage] = useState("");
  const [profileErrorMessage, setProfileErrorMessage] = useState("");
  const [user, setUser] = useState({
    profilePicture: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
    language: "English" as SupportedLanguage,
    timeFormat: "24-hour" as TimeFormatOption,
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
  });

  useEffect(() => {
    if (!user_id) {
      setIsLoadingPageData(false);
      return;
    }
    const fetchUserData = async () => {
      setIsLoadingPageData(true);
      try {
        const response = await axiosInstance.get(`/user/${user_id}`);
        const userData = response.data.user ?? response.data.data?.user;
        if (!userData) throw new Error("User data not found");
        setUser({
          profilePicture: userData.profile_picture || "",
          firstName: userData.first_name || "",
          lastName: userData.last_name || "",
          phoneNumber: userData.phone_number || "",
          language: (userData.language || "English") as SupportedLanguage,
          timeFormat: (userData.time_format || "24-hour") as TimeFormatOption,
          addressLine1: userData.address_line_1 || "",
          addressLine2: userData.address_line_2 || "",
          city: userData.city || "",
          state: userData.state || "",
          postalCode: userData.postal_code || "",
        });
      } catch (error) {
        console.error("Error fetching user data for General page:", error);
      } finally {
        setIsLoadingPageData(false);
      }
    };
    fetchUserData();
  }, [user_id]);

  const handleSaveProfileChanges = async () => {
    if (!user_id) return;
    setIsSavingProfile(true);
    setProfileSuccessMessage("");
    setProfileErrorMessage("");
    try {
      await axiosInstance.put(`/user/${user_id}`, {
        first_name: user.firstName,
        last_name: user.lastName,
        phone_number: user.phoneNumber,
        language: user.language,
        time_format: user.timeFormat,
        address_line_1: user.addressLine1,
        address_line_2: user.addressLine2,
        city: user.city,
        state: user.state,
        postal_code: user.postalCode,
      });
      setProfileSuccessMessage("Profile updated successfully!");
    } catch (error) {
      setProfileErrorMessage("Failed to update profile. Please try again.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  if (isLoadingPageData) {
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
          <Appbar.Content title="Profile Settings" />
        </Appbar.Header>
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" />
        </View>
      </PlatformLayout>
    );
  }

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
        <Appbar.Content
          title="Profile Settings"
          subtitle="Update your personal details"
        />
      </Appbar.Header>
      <ScrollView contentContainerStyle={styles.container}>
        <Card>
          <Card.Title title="Profile Details" />
          <Card.Content style={styles.cardContent}>
            <View style={styles.avatarSection}>
              <Avatar.Image
                size={96}
                source={{
                  uri:
                    user.profilePicture ||
                    `https://eu.ui-avatars.com/api/?name=${encodeURIComponent(
                      user.firstName
                    )}+${encodeURIComponent(user.lastName)}&size=250`,
                }}
              />
              <View style={styles.avatarActions}>
                <Button
                  icon={() => (
                    <FontAwesomeIcon
                      icon={faUpload}
                      size={16}
                      color={theme.colors.primary}
                    />
                  )}
                  mode="contained-tonal"
                >
                  Choose File
                </Button>
                {user.profilePicture && (
                  <Button
                    icon={() => (
                      <FontAwesomeIcon
                        icon={faTrashAlt}
                        size={16}
                        color={theme.colors.error}
                      />
                    )}
                    mode="text"
                    textColor={theme.colors.error}
                    onPress={() =>
                      setUser((prev) => ({ ...prev, profilePicture: "" }))
                    }
                  >
                    Remove
                  </Button>
                )}
                <Text variant="labelSmall">Max 2MB</Text>
              </View>
            </View>

            <TextInput
              label="First Name"
              value={user.firstName}
              disabled
              mode="outlined"
            />
            <TextInput
              label="Last Name"
              value={user.lastName}
              disabled
              mode="outlined"
            />
            <TextInput
              label="Phone Number"
              placeholder="Enter Phone Number"
              value={user.phoneNumber}
              onChangeText={(val) =>
                setUser((prev) => ({ ...prev, phoneNumber: val }))
              }
              mode="outlined"
              left={
                <TextInput.Icon
                  icon={() => (
                    <FontAwesomeIcon
                      icon={faPhone}
                      size={18}
                      color={theme.colors.onSurfaceVariant}
                    />
                  )}
                />
              }
            />
            <View style={styles.row}>
              <PaperFormDropdown
                label="Language"
                items={LANGUAGES}
                selectedValue={user.language}
                onSelect={(val: any) =>
                  setUser((prev) => ({ ...prev, language: val }))
                }
                style={styles.halfWidth}
              />
              <PaperFormDropdown
                label="Time Format"
                items={TIME_FORMAT}
                selectedValue={user.timeFormat}
                onSelect={(val: any) =>
                  setUser((prev) => ({ ...prev, timeFormat: val }))
                }
                style={styles.halfWidth}
              />
            </View>
          </Card.Content>
        </Card>

        <Card>
          <Card.Title title="Address Details" />
          <Card.Content style={styles.cardContent}>
            <TextInput
              label="Address Line 1"
              placeholder="Enter Address Line 1"
              value={user.addressLine1}
              onChangeText={(val) =>
                setUser((prev) => ({ ...prev, addressLine1: val }))
              }
              mode="outlined"
              left={
                <TextInput.Icon
                  icon={() => (
                    <FontAwesomeIcon
                      icon={faMapMarkerAlt}
                      size={18}
                      color={theme.colors.onSurfaceVariant}
                    />
                  )}
                />
              }
            />
            <TextInput
              label="Address Line 2 (Optional)"
              placeholder="Enter Address Line 2"
              value={user.addressLine2}
              onChangeText={(val) =>
                setUser((prev) => ({ ...prev, addressLine2: val }))
              }
              mode="outlined"
            />
            <View style={styles.row}>
              <TextInput
                label="City"
                placeholder="Enter City"
                value={user.city}
                onChangeText={(val) =>
                  setUser((prev) => ({ ...prev, city: val }))
                }
                style={styles.halfWidth}
                mode="outlined"
                left={
                  <TextInput.Icon
                    icon={() => (
                      <FontAwesomeIcon
                        icon={faCity}
                        size={18}
                        color={theme.colors.onSurfaceVariant}
                      />
                    )}
                  />
                }
              />
              <TextInput
                label="State/Province"
                placeholder="Enter State/Province"
                value={user.state}
                onChangeText={(val) =>
                  setUser((prev) => ({ ...prev, state: val }))
                }
                style={styles.halfWidth}
                mode="outlined"
                left={
                  <TextInput.Icon
                    icon={() => (
                      <FontAwesomeIcon
                        icon={faMap}
                        size={18}
                        color={theme.colors.onSurfaceVariant}
                      />
                    )}
                  />
                }
              />
            </View>
            <TextInput
              label="Postal Code"
              placeholder="Enter Postal Code"
              value={user.postalCode}
              onChangeText={(val) =>
                setUser((prev) => ({ ...prev, postalCode: val }))
              }
              mode="outlined"
              left={
                <TextInput.Icon
                  icon={() => (
                    <FontAwesomeIcon
                      icon={faSignsPost}
                      size={18}
                      color={theme.colors.onSurfaceVariant}
                    />
                  )}
                />
              }
            />
          </Card.Content>
        </Card>

        <View style={styles.saveSection}>
          <Button
            mode="contained"
            onPress={handleSaveProfileChanges}
            loading={isSavingProfile}
            disabled={isSavingProfile}
            icon={() => (
              <FontAwesomeIcon
                icon={faSave}
                size={18}
                color={theme.colors.onPrimary}
              />
            )}
            style={styles.saveButton}
          >
            Save Changes
          </Button>
          <HelperText
            type="info"
            visible={!!profileSuccessMessage}
            style={{ color: "green" }}
          >
            {profileSuccessMessage}
          </HelperText>
          <HelperText type="error" visible={!!profileErrorMessage}>
            {profileErrorMessage}
          </HelperText>
        </View>
      </ScrollView>
    </PlatformLayout>
  );
};

const styles = StyleSheet.create({
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: { padding: 16, gap: 24 },
  cardContent: { gap: 16 },
  avatarSection: { flexDirection: "row", alignItems: "center", gap: 16 },
  avatarActions: { gap: 8, alignItems: "flex-start" },
  row: { flexDirection: "row", gap: 16 },
  halfWidth: { flex: 1 },
  saveSection: { alignItems: "flex-start" },
  saveButton: { paddingVertical: 4 },
});

export default GeneralSettingsScreen;
