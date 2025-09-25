import PlatformLayout from "@/components/layout/PlatformLayout";
import { useUserPreferences } from "@/contexts/UserPreferencesContext";
import {
  faBug,
  faCow,
  faEye,
  faEyeSlash,
  faFish,
  faKiwiBird,
  IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRoute } from "@react-navigation/native";
import axios from "axios";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Appbar,
  Button,
  Card,
  Divider,
  Modal,
  Portal,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import Toast from "react-native-toast-message";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const api = axios.create({
  baseURL: API_URL,
});

type ServiceConfig = {
  [key: string]: {
    endpoint: string;
    occupation: string;
  };
};

const SERVICE_CONFIG: ServiceConfig = {
  Fishery: { endpoint: "fishery", occupation: "Fishery" },
  "Cattle Rearing": {
    endpoint: "cattle-rearing",
    occupation: "Cattle Rearing",
  },
  Poultry: { endpoint: "flock", occupation: "Poultry" },
  Apiculture: { endpoint: "apiculture", occupation: "Apiculture" },
};

const AgricultureIcons: Record<string, IconDefinition> = {
  Fishery: faFish,
  Poultry: faKiwiBird,
  "Cattle Rearing": faCow,
  Apiculture: faBug,
};

const AddServiceScreen = () => {
  const theme = useTheme();
  const route = useRoute();
  const { user_id } = route.params as { user_id: string };

  const { subTypes, setUserSubTypes } = useUserPreferences();

  const [availableSubTypes, setAvailableSubTypes] = useState<string[]>([]);
  const [selectedSubTypes, setSelectedSubTypes] = useState<Set<string>>(
    new Set()
  );
  const [servicesToRemove, setServicesToRemove] = useState<Set<string>>(
    new Set()
  );

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);

  useEffect(() => {
    if (!user_id) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const token = await AsyncStorage.getItem("accessToken");
        if (!token) throw new Error("Authentication token not found.");
        const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

        const [availableResponse, userResponse] = await Promise.all([
          api.get(`/user/${user_id}/available-sub-types`, authHeaders),
          api.get(`/user/${user_id}`, authHeaders),
        ]);

        const available = availableResponse.data?.data?.subTypes;
        if (!Array.isArray(available)) {
          throw new Error("Available sub-types not found.");
        }

        const currentUserSubTypes = userResponse.data?.data?.user?.sub_type;
        if (!Array.isArray(currentUserSubTypes)) {
          throw new Error("User's current sub-types not found.");
        }

        setAvailableSubTypes(available);
        setUserSubTypes(currentUserSubTypes);
      } catch (err) {
        console.error("Failed to fetch service data:", err);
        Toast.show({
          type: "error",
          text1: "Failed to load service information.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user_id, setUserSubTypes]);

  const handleCheckboxChange = (
    subType: string,
    state: Set<string>,
    setter: React.Dispatch<React.SetStateAction<Set<string>>>
  ) => {
    setter((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(subType)) newSet.delete(subType);
      else newSet.add(subType);
      return newSet;
    });
  };

  const handleAddSubmit = async () => {
    if (selectedSubTypes.size === 0) return;
    setIsSubmitting(true);
    const newSubTypes = [
      ...new Set([...subTypes, ...Array.from(selectedSubTypes)]),
    ];

    try {
      const token = await AsyncStorage.getItem("accessToken");
      if (!token) throw new Error("Authentication token not found.");

      await api.put(
        `/user/${user_id}`,
        { sub_type: newSubTypes },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Toast.show({ type: "success", text1: "Services added successfully!" });
      setUserSubTypes(newSubTypes);
      setSelectedSubTypes(new Set());
    } catch (err) {
      console.error("Failed to add user services:", err);
      Toast.show({ type: "error", text1: "Failed to add services." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeRemoveServices = async () => {
    if (servicesToRemove.size === 0 || !user_id) return;
    setIsRemoving(true);
    const newSubTypes = subTypes.filter(
      (subType) => !servicesToRemove.has(subType)
    );

    try {
      const token = await AsyncStorage.getItem("accessToken");
      if (!token) throw new Error("Authentication token not found.");
      const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

      await api.put(`/user/${user_id}`, { sub_type: newSubTypes }, authHeaders);

      const userIdNumber = parseInt(user_id, 10);
      const deletionPromises = Array.from(servicesToRemove).flatMap(
        (service) => {
          const config = SERVICE_CONFIG[service];
          return config
            ? [
                api.post(
                  `/${config.endpoint}/reset-service`,
                  { userId: userIdNumber },
                  authHeaders
                ),
                api.post(
                  "/sales/delete-by-occupation",
                  { userId: userIdNumber, occupation: config.occupation },
                  authHeaders
                ),
                api.post(
                  "/expenses/delete-by-occupation",
                  { userId: userIdNumber, occupation: config.occupation },
                  authHeaders
                ),
              ]
            : [];
        }
      );

      if (deletionPromises.length > 0) await Promise.all(deletionPromises);

      Toast.show({
        type: "success",
        text1: "Service(s) removed successfully!",
      });
      setUserSubTypes(newSubTypes);
      setServicesToRemove(new Set());
    } catch (err) {
      console.error("Failed to remove services or related data:", err);
      Toast.show({ type: "error", text1: "Failed to remove services." });
    } finally {
      setIsRemoving(false);
    }
  };

  const handleOpenConfirmationModal = () => {
    if (servicesToRemove.size > 0) {
      setModalError(null);
      setPassword("");
      setIsPasswordVisible(false);
      setIsModalOpen(true);
    }
  };

  const handleConfirmRemoval = async () => {
    setIsVerifyingPassword(true);
    setModalError(null);

    try {
      const token = await AsyncStorage.getItem("accessToken");
      if (!token) throw new Error("Authentication token not found.");

      const response = await api.post(
        `/user/verify-password/${user_id}`,
        { password },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data?.valid) {
        setIsModalOpen(false);
        setPassword("");
        await executeRemoveServices();
      } else {
        setModalError("Incorrect password. Please try again.");
      }
    } catch (error) {
      console.error("Password verification failed:", error);
      setModalError("Incorrect password or server error.");
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  const renderServiceCard = (
    subType: string,
    isSelected: boolean,
    onPress: () => void
  ) => (
    <View key={subType} style={styles.cardWrapper}>
      <TouchableRipple
        onPress={onPress}
        style={[styles.cardRipple, { borderRadius: theme.roundness }]}
      >
        <Card
          style={[
            styles.card,
            isSelected && { backgroundColor: theme.colors.primaryContainer },
          ]}
        >
          <Card.Content style={styles.cardContent}>
            <FontAwesomeIcon
              icon={AgricultureIcons[subType]}
              size={30}
              color={
                isSelected
                  ? theme.colors.primary
                  : theme.colors.onSurfaceVariant
              }
            />
            <Text
              variant="labelLarge"
              style={[
                styles.cardText,
                {
                  color: isSelected
                    ? theme.colors.primary
                    : theme.colors.onSurface,
                },
              ]}
            >
              {subType}
            </Text>
          </Card.Content>
        </Card>
      </TouchableRipple>
    </View>
  );

  const servicesToShow = availableSubTypes.filter(
    (subType) => !subTypes.includes(subType)
  );

  if (isLoading) {
    return (
      <View
        style={[styles.centered, { backgroundColor: theme.colors.background }]}
      >
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <PlatformLayout>
      <Appbar.Header>
        <Appbar.Content
          title="Manage Services"
          subtitle={`${subTypes.length} active, ${servicesToShow.length} available`}
        />
      </Appbar.Header>

      <Portal>
        <Modal
          visible={isModalOpen}
          onDismiss={() => setIsModalOpen(false)}
          contentContainerStyle={[
            styles.modal,
            {
              backgroundColor: theme.colors.elevation.level3,
              borderRadius: theme.roundness,
            },
          ]}
        >
          <Card>
            <Card.Title title="Confirm Password" />
            <Card.Content>
              <Text variant="bodyMedium" style={styles.modalText}>
                Enter your password to remove the selected service(s) and all
                related data.
              </Text>
              <TextInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!isPasswordVisible}
                style={styles.input}
                error={!!modalError}
                disabled={isVerifyingPassword}
                right={
                  <TextInput.Icon
                    icon={() => (
                      <FontAwesomeIcon
                        icon={isPasswordVisible ? faEyeSlash : faEye}
                        size={20}
                        color={theme.colors.onSurfaceVariant}
                      />
                    )}
                    onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                  />
                }
              />
              {modalError && (
                <Text style={{ color: theme.colors.error, marginTop: 4 }}>
                  {modalError}
                </Text>
              )}
            </Card.Content>
            <Card.Actions>
              <Button
                onPress={() => setIsModalOpen(false)}
                disabled={isVerifyingPassword}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleConfirmRemoval}
                loading={isVerifyingPassword}
                disabled={isVerifyingPassword || !password}
                buttonColor={theme.colors.error}
              >
                Remove Service
              </Button>
            </Card.Actions>
          </Card>
        </Modal>
      </Portal>

      <ScrollView
        style={{ backgroundColor: theme.colors.background }}
        contentContainerStyle={styles.container}
      >
        {servicesToShow.length > 0 ? (
          <>
            <Card style={styles.sectionCard}>
              <Card.Title title="Add Services" />
              <Card.Content>
                <View style={styles.grid}>
                  {servicesToShow.map((subType) =>
                    renderServiceCard(
                      subType,
                      selectedSubTypes.has(subType),
                      () =>
                        handleCheckboxChange(
                          subType,
                          selectedSubTypes,
                          setSelectedSubTypes
                        )
                    )
                  )}
                </View>
              </Card.Content>
            </Card>
            <Button
              mode="contained"
              onPress={handleAddSubmit}
              disabled={isSubmitting || selectedSubTypes.size === 0}
              loading={isSubmitting}
              style={styles.button}
            >
              Add Selected Services
            </Button>
          </>
        ) : (
          <Card style={styles.sectionCard}>
            <Card.Title title="Available Services" />
            <Card.Content>
              <Text>You have subscribed to all available services.</Text>
            </Card.Content>
          </Card>
        )}

        {subTypes.length > 0 && (
          <>
            <Divider style={styles.divider} />
            <Card style={styles.sectionCard}>
              <Card.Title title="Current Services" />
              <Card.Content>
                <View style={styles.grid}>
                  {subTypes.map((subType) =>
                    renderServiceCard(
                      subType,
                      servicesToRemove.has(subType),
                      () =>
                        handleCheckboxChange(
                          subType,
                          servicesToRemove,
                          setServicesToRemove
                        )
                    )
                  )}
                </View>
              </Card.Content>
            </Card>
            <Button
              mode="contained"
              onPress={handleOpenConfirmationModal}
              disabled={isRemoving || servicesToRemove.size === 0}
              loading={isRemoving}
              style={styles.button}
              buttonColor={theme.colors.error}
            >
              Remove Selected Services
            </Button>
          </>
        )}
      </ScrollView>
      <Toast />
    </PlatformLayout>
  );
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    padding: 16,
  },
  divider: {
    marginVertical: 24,
  },
  sectionCard: {
    marginBottom: 24,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    margin: -8,
  },
  cardWrapper: {
    width: "50%",
    padding: 8,
  },
  cardRipple: {
    flex: 1,
  },
  card: {
    flex: 1,
  },
  cardContent: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 24,
    gap: 12,
  },
  cardText: {
    textAlign: "center",
  },
  button: {
    alignSelf: "flex-end",
  },
  modal: {
    margin: 20,
  },
  modalText: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 8,
  },
});

export default AddServiceScreen;
