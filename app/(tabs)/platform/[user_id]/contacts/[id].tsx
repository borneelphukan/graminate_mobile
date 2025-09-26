import PlatformLayout from "@/components/layout/PlatformLayout";
import { CONTACT_TYPES } from "@/constants/options";
import axiosInstance from "@/lib/axiosInstance";
import {
  faArrowLeft,
  faChevronDown,
  faEllipsisV,
  faEnvelope,
  faPencilAlt,
  faPhone,
  faSave,
  faShareAlt,
  faTimes,
  faTrashAlt,
  faUpload,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Appbar,
  Avatar,
  Button,
  Card,
  Divider,
  List,
  Menu,
  Modal,
  Portal,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from "react-native-paper";

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const api = axios.create({ baseURL: API_URL });

type Contact = {
  contact_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone_number?: string;
  type?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  profile_image_url?: string;
};
type Form = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  type: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
};
const initialFormState: Form = {
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  type: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
};

const getInitials = (firstName?: string, lastName?: string): string => {
  return (
    `${firstName?.[0]?.toUpperCase() || ""}${
      lastName?.[0]?.toUpperCase() || ""
    }` || "?"
  );
};

const ContactDetails = () => {
  const { user_id, data } = useLocalSearchParams<{
    user_id: string;
    data: string;
  }>();
  const theme = useTheme();
  const [contact, setContact] = useState<Contact | null>(null);
  const [formData, setFormData] = useState<Form>(initialFormState);
  const [initialFormData, setInitialFormData] =
    useState<Form>(initialFormState);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isTypeMenuVisible, setTypeMenuVisible] = useState(false);
  const [isImageModalVisible, setImageModalVisible] = useState(false);
  const [isMoreMenuVisible, setMoreMenuVisible] = useState(false);

  useEffect(() => {
    if (data) {
      try {
        const parsedContact: Contact = JSON.parse(data);
        setContact(parsedContact);
        setProfileImageUrl(parsedContact.profile_image_url || null);
        const newFormValues: Form = {
          firstName: parsedContact.first_name || "",
          lastName: parsedContact.last_name || "",
          email: parsedContact.email || "",
          phoneNumber: parsedContact.phone_number || "",
          type: parsedContact.type || "",
          addressLine1: parsedContact.address_line_1 || "",
          addressLine2: parsedContact.address_line_2 || "",
          city: parsedContact.city || "",
          state: parsedContact.state || "",
          postalCode: parsedContact.postal_code || "",
        };
        setFormData(newFormValues);
        setInitialFormData(newFormValues);
      } catch (error) {
        Alert.alert("Error", "Invalid contact data.");
        router.back();
      }
    } else {
      Alert.alert("Error", "No contact data.");
      router.back();
    }
  }, [data]);

  const handleInputChange = (field: keyof Form, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));
  const hasChanges = useMemo(
    () =>
      JSON.stringify(formData) !== JSON.stringify(initialFormData) ||
      (contact?.profile_image_url || null) !== profileImageUrl,
    [formData, initialFormData, profileImageUrl, contact]
  );

  const handleSave = async () => {
    if (!contact) return;
    setSaving(true);
    let finalProfileImageUrl = profileImageUrl;
    try {
      const token = await AsyncStorage.getItem("accessToken");
      if (profileImageUrl && profileImageUrl.startsWith("file://")) {
        const base64 = await FileSystem.readAsStringAsync(profileImageUrl, {
          encoding: "base64",
        });
        const mimeType = profileImageUrl.endsWith(".png")
          ? "image/png"
          : "image/jpeg";
        finalProfileImageUrl = `data:${mimeType};base64,${base64}`;
      }
      const payload = {
        id: contact.contact_id,
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone_number: formData.phoneNumber,
        type: formData.type,
        address_line_1: formData.addressLine1,
        address_line_2: formData.addressLine2,
        city: formData.city,
        state: formData.state,
        postal_code: formData.postalCode,
        profile_image_url: finalProfileImageUrl,
      };
      await api.put("/contacts/update", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      Alert.alert("Success", "Contact updated.");
      router.replace(
        `/platform/${user_id}/crm?view=contacts&refresh=${new Date().getTime()}`
      );
    } catch (error: any) {
      Alert.alert("Error", "Failed to update contact.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!contact) return;
    Alert.alert(
      "Delete Contact",
      `Are you sure you want to delete ${formData.firstName} ${formData.lastName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              const token = await AsyncStorage.getItem("accessToken");
              await axiosInstance.delete(
                `/contacts/delete/${contact.contact_id}`,
                {
                  headers: { Authorization: `Bearer ${token}` },
                }
              );
              Alert.alert("Success", "Contact deleted.");
              router.replace(
                `/platform/${user_id}/crm?view=contacts&refresh=${new Date().getTime()}`
              );
            } catch (error: any) {
              Alert.alert("Error", "Failed to delete contact.");
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleShare = async () => {
    if (!contact) return;
    try {
      const message = `
Name: ${formData.firstName} ${formData.lastName}
Phone: ${formData.phoneNumber || "N/A"}
Email: ${formData.email || "N/A"}
    `.trim();
      await Share.share({ message });
    } catch (error) {
      Alert.alert("Error", "Failed to share contact.");
    }
  };

  const handlePickImage = async () => {
    setImageModalVisible(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission required",
        "Please grant camera roll permissions."
      );
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) setProfileImageUrl(result.assets[0].uri);
  };

  const handleRemoveImage = () => {
    setImageModalVisible(false);
    setProfileImageUrl(null);
  };
  const handleCall = () => {
    if (formData.phoneNumber) Linking.openURL(`tel:${formData.phoneNumber}`);
    else Alert.alert("No Phone Number", "This contact has no phone number.");
  };
  const handleEmail = () => {
    if (formData.email) Linking.openURL(`mailto:${formData.email}`);
    else Alert.alert("No Email", "This contact has no email address.");
  };

  if (!contact)
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
          <Appbar.Content title="Contact Details" />
        </Appbar.Header>
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      </PlatformLayout>
    );

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
        <Appbar.Content title="Contact Details" />
        <Menu
          visible={isMoreMenuVisible}
          onDismiss={() => setMoreMenuVisible(false)}
          anchor={
            <Appbar.Action
              icon={() => (
                <FontAwesomeIcon
                  icon={faEllipsisV}
                  size={22}
                  color={theme.colors.onSurface}
                />
              )}
              onPress={() => setMoreMenuVisible(true)}
            />
          }
        >
          <Menu.Item
            onPress={() => {
              setMoreMenuVisible(false);
              handleDelete();
            }}
            title="Delete Contact"
            leadingIcon={() => (
              <FontAwesomeIcon
                icon={faTrashAlt}
                size={20}
                color={theme.colors.error}
              />
            )}
            titleStyle={{ color: theme.colors.error }}
          />
          <Menu.Item
            onPress={() => {
              setMoreMenuVisible(false);
              handleShare();
            }}
            title="Share Contact"
            leadingIcon={() => (
              <FontAwesomeIcon
                icon={faShareAlt}
                size={20}
                color={theme.colors.onSurfaceVariant}
              />
            )}
          />
        </Menu>
      </Appbar.Header>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.profileHeader}>
            <TouchableRipple
              onPress={() => setImageModalVisible(true)}
              style={styles.avatarRipple}
            >
              <>
                {profileImageUrl ? (
                  <Avatar.Image size={112} source={{ uri: profileImageUrl }} />
                ) : (
                  <Avatar.Text
                    size={112}
                    label={getInitials(contact.first_name, contact.last_name)}
                  />
                )}
                <View
                  style={[
                    styles.editIcon,
                    { backgroundColor: theme.colors.primary },
                  ]}
                >
                  <FontAwesomeIcon
                    icon={faPencilAlt}
                    size={18}
                    color={theme.colors.onPrimary}
                  />
                </View>
              </>
            </TouchableRipple>
            <Text variant="headlineMedium">
              {`${formData.firstName} ${formData.lastName}`.trim()}
            </Text>
          </View>
          <View style={styles.actionsRow}>
            <Button
              icon={() => (
                <FontAwesomeIcon
                  icon={faPhone}
                  size={18}
                  color={
                    formData.phoneNumber
                      ? theme.colors.primary
                      : theme.colors.onSurfaceDisabled
                  }
                />
              )}
              onPress={handleCall}
              disabled={!formData.phoneNumber}
            >
              Call
            </Button>
            <Button
              icon={() => (
                <FontAwesomeIcon
                  icon={faEnvelope}
                  size={18}
                  color={
                    formData.email
                      ? theme.colors.primary
                      : theme.colors.onSurfaceDisabled
                  }
                />
              )}
              onPress={handleEmail}
              disabled={!formData.email}
            >
              Email
            </Button>
          </View>
          <Card style={styles.card}>
            <Card.Title title="Personal Information" />
            <Card.Content style={styles.cardContent}>
              <TextInput
                mode="outlined"
                label="First Name"
                value={formData.firstName}
                onChangeText={(val) => handleInputChange("firstName", val)}
              />
              <TextInput
                mode="outlined"
                label="Last Name"
                value={formData.lastName}
                onChangeText={(val) => handleInputChange("lastName", val)}
              />
              <TextInput
                mode="outlined"
                label="Email"
                value={formData.email}
                onChangeText={(val) => handleInputChange("email", val)}
                keyboardType="email-address"
              />
              <TextInput
                mode="outlined"
                label="Phone Number"
                value={formData.phoneNumber}
                onChangeText={(val) => handleInputChange("phoneNumber", val)}
                keyboardType="phone-pad"
              />
              <Menu
                visible={isTypeMenuVisible}
                onDismiss={() => setTypeMenuVisible(false)}
                anchor={
                  <TouchableRipple onPress={() => setTypeMenuVisible(true)}>
                    <View pointerEvents="none">
                      <TextInput
                        mode="outlined"
                        label="Type"
                        value={formData.type}
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
                      />
                    </View>
                  </TouchableRipple>
                }
              >
                {CONTACT_TYPES.map((type) => (
                  <Menu.Item
                    key={type.value}
                    title={type.label}
                    onPress={() => {
                      handleInputChange("type", type.value);
                      setTypeMenuVisible(false);
                    }}
                  />
                ))}
              </Menu>
            </Card.Content>
          </Card>
          <Card style={styles.card}>
            <Card.Title title="Address" />
            <Card.Content style={styles.cardContent}>
              <TextInput
                mode="outlined"
                label="Address Line 1"
                value={formData.addressLine1}
                onChangeText={(val) => handleInputChange("addressLine1", val)}
              />
              <TextInput
                mode="outlined"
                label="Address Line 2"
                value={formData.addressLine2}
                onChangeText={(val) => handleInputChange("addressLine2", val)}
              />
              <TextInput
                mode="outlined"
                label="City"
                value={formData.city}
                onChangeText={(val) => handleInputChange("city", val)}
              />
              <TextInput
                mode="outlined"
                label="State / Province"
                value={formData.state}
                onChangeText={(val) => handleInputChange("state", val)}
              />
              <TextInput
                mode="outlined"
                label="Postal / Zip Code"
                value={formData.postalCode}
                onChangeText={(val) => handleInputChange("postalCode", val)}
                keyboardType="numeric"
              />
            </Card.Content>
          </Card>
        </ScrollView>
        <Appbar style={styles.footer}>
          <Button
            style={styles.footerButton}
            mode="outlined"
            onPress={() => router.back()}
            icon={() => (
              <FontAwesomeIcon
                icon={faTimes}
                size={18}
                color={theme.colors.primary}
              />
            )}
          >
            Cancel
          </Button>
          <Button
            style={styles.footerButton}
            mode="contained"
            onPress={handleSave}
            disabled={!hasChanges || saving}
            loading={saving}
            icon={() => (
              <FontAwesomeIcon
                icon={faSave}
                size={18}
                color={
                  !hasChanges || saving
                    ? theme.colors.onSurfaceDisabled
                    : theme.colors.onPrimary
                }
              />
            )}
          >
            Save Changes
          </Button>
        </Appbar>
      </KeyboardAvoidingView>
      <Portal>
        <Modal
          visible={isImageModalVisible}
          onDismiss={() => setImageModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.colors.elevation.level2 },
            ]}
          >
            <List.Item
              title="Upload Image"
              left={() => (
                <FontAwesomeIcon
                  icon={faUpload}
                  size={22}
                  color={theme.colors.onSurface}
                  style={styles.listIcon}
                />
              )}
              onPress={handlePickImage}
            />
            {profileImageUrl && (
              <List.Item
                title="Remove Image"
                titleStyle={{ color: theme.colors.error }}
                left={() => (
                  <FontAwesomeIcon
                    icon={faTrashAlt}
                    size={22}
                    color={theme.colors.error}
                    style={styles.listIcon}
                  />
                )}
                onPress={handleRemoveImage}
              />
            )}
            <Divider />
            <List.Item
              title="Cancel"
              onPress={() => setImageModalVisible(false)}
              style={{ alignItems: "center" }}
            />
          </View>
        </Modal>
      </Portal>
    </PlatformLayout>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { padding: 16, gap: 24, paddingBottom: 80 },
  profileHeader: { alignItems: "center", gap: 16 },
  avatarRipple: { borderRadius: 56 },
  editIcon: {
    position: "absolute",
    bottom: 4,
    right: 4,
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 8,
  },
  card: {},
  cardContent: { gap: 16 },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  footerButton: { flex: 1, marginHorizontal: 8 },
  modalContainer: {
    justifyContent: "flex-end",
    margin: 0,
  },
  modalContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 16,
  },
  listIcon: { marginLeft: 16, alignSelf: "center" },
});

export default ContactDetails;
