import PlatformLayout from "@/components/layout/PlatformLayout";
import { CONTRACT_STATUS, PRIORITY_OPTIONS } from "@/constants/options";
import {
  faArrowLeft,
  faCalendarAlt,
  faChartLine,
  faChevronDown,
  faExclamationTriangle,
  faFileSignature,
  faIndianRupeeSign,
  faSave,
  faTags,
  faTimes,
  faTrashAlt,
  faUserTie,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Calendar, DateData } from "react-native-calendars";
import {
  ActivityIndicator,
  Appbar,
  Button,
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

type Contract = {
  deal_id: number;
  deal_name: string;
  partner: string;
  amount: number;
  stage: string;
  start_date: string;
  end_date: string | null;
  category?: string | null;
  priority: string;
};
type Form = {
  dealName: string;
  partner: string;
  amount: string;
  stage: string;
  startDate: string;
  endDate: string;
  category: string;
  priority: string;
};
const initialFormState: Form = {
  dealName: "",
  partner: "",
  amount: "",
  stage: "",
  startDate: "",
  endDate: "",
  category: "",
  priority: "",
};

const formatDateForInput = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? "" : date.toISOString().split("T")[0];
  } catch {
    return "";
  }
};

const ContractDetails = () => {
  const { user_id, data } = useLocalSearchParams<{
    user_id: string;
    data: string;
  }>();
  const theme = useTheme();
  const [contract, setContract] = useState<Contract | null>(null);
  const [formData, setFormData] = useState<Form>(initialFormState);
  const [initialFormData, setInitialFormData] =
    useState<Form>(initialFormState);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isStageMenuVisible, setStageMenuVisible] = useState(false);
  const [isPriorityMenuVisible, setPriorityMenuVisible] = useState(false);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [datePickerFor, setDatePickerFor] = useState<
    "startDate" | "endDate" | null
  >(null);

  useEffect(() => {
    if (data) {
      try {
        const parsedContract: Contract = JSON.parse(data);
        setContract(parsedContract);
        const newFormValues: Form = {
          dealName: parsedContract.deal_name || "",
          partner: parsedContract.partner || "",
          amount: parsedContract.amount?.toString() || "",
          stage: parsedContract.stage || "",
          startDate: formatDateForInput(parsedContract.start_date),
          endDate: formatDateForInput(parsedContract.end_date),
          category: parsedContract.category || "",
          priority: parsedContract.priority || "Medium",
        };
        setFormData(newFormValues);
        setInitialFormData(newFormValues);
      } catch (error) {
        Alert.alert("Error", "Invalid contract data.");
        router.back();
      }
    } else {
      Alert.alert("Error", "No contract data.");
      router.back();
    }
  }, [data]);

  const handleInputChange = (field: keyof Form, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));
  const hasChanges = useMemo(
    () => JSON.stringify(formData) !== JSON.stringify(initialFormData),
    [formData, initialFormData]
  );

  const showDatePicker = (field: "startDate" | "endDate") => {
    setDatePickerFor(field);
    setDatePickerVisible(true);
  };
  const handleDayPress = (day: DateData) => {
    if (datePickerFor) handleInputChange(datePickerFor, day.dateString);
    setDatePickerVisible(false);
  };

  const handleSave = async () => {
    if (!contract) return;
    if (
      formData.startDate &&
      formData.endDate &&
      new Date(formData.startDate) > new Date(formData.endDate)
    ) {
      Alert.alert(
        "Invalid Date",
        "End Date cannot be earlier than Start Date."
      );
      return;
    }
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem("accessToken");
      const payload = {
        id: contract.deal_id,
        deal_name: formData.dealName,
        partner: formData.partner,
        amount: parseFloat(formData.amount) || 0,
        stage: formData.stage,
        start_date: formData.startDate || null,
        end_date: formData.endDate || null,
        category: formData.category || null,
        priority: formData.priority,
      };
      await api.put("/contracts/update", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      Alert.alert("Success", "Contract updated successfully.");
      router.replace(
        `/platform/${user_id}/crm?view=contracts&refresh=${new Date().getTime()}`
      );
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to update contract."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!contract) return;
    Alert.alert(
      "Delete Contract",
      `Are you sure you want to delete "${contract.deal_name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              const token = await AsyncStorage.getItem("accessToken");
              await api.delete(`/contracts/delete/${contract.deal_id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              Alert.alert("Success", "Contract deleted successfully.");
              router.replace(
                `/platform/${user_id}/crm?view=contracts&refresh=${new Date().getTime()}`
              );
            } catch (error: any) {
              Alert.alert(
                "Error",
                error.response?.data?.error || "Failed to delete contract."
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (!contract) {
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
          <Appbar.Content title="Loading..." />
        </Appbar.Header>
        <View style={styles.centered}>
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
        <Appbar.Content title={formData.dealName || "Contract Details"} />
        <Button
          onPress={handleDelete}
          textColor={theme.colors.error}
          disabled={deleting}
          loading={deleting}
          icon={() => (
            <FontAwesomeIcon
              icon={faTrashAlt}
              size={18}
              color={
                deleting ? theme.colors.onSurfaceDisabled : theme.colors.error
              }
            />
          )}
        >
          Delete
        </Button>
      </Appbar.Header>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <TextInput
            mode="outlined"
            label="Contract Title"
            value={formData.dealName}
            onChangeText={(val) => handleInputChange("dealName", val)}
            left={
              <TextInput.Icon
                icon={() => (
                  <FontAwesomeIcon
                    icon={faFileSignature}
                    size={18}
                    color={theme.colors.onSurfaceVariant}
                  />
                )}
              />
            }
          />
          <TextInput
            mode="outlined"
            label="Partner / Client"
            value={formData.partner}
            onChangeText={(val) => handleInputChange("partner", val)}
            left={
              <TextInput.Icon
                icon={() => (
                  <FontAwesomeIcon
                    icon={faUserTie}
                    size={18}
                    color={theme.colors.onSurfaceVariant}
                  />
                )}
              />
            }
          />
          <TextInput
            mode="outlined"
            label="Amount (₹)"
            value={formData.amount}
            onChangeText={(val) => handleInputChange("amount", val)}
            keyboardType="numeric"
            left={
              <TextInput.Icon
                icon={() => (
                  <FontAwesomeIcon
                    icon={faIndianRupeeSign}
                    size={18}
                    color={theme.colors.onSurfaceVariant}
                  />
                )}
              />
            }
          />
          <TextInput
            mode="outlined"
            label="Category"
            value={formData.category}
            onChangeText={(val) => handleInputChange("category", val)}
            left={
              <TextInput.Icon
                icon={() => (
                  <FontAwesomeIcon
                    icon={faTags}
                    size={18}
                    color={theme.colors.onSurfaceVariant}
                  />
                )}
              />
            }
          />
          <View style={styles.row}>
            <TouchableRipple
              onPress={() => showDatePicker("startDate")}
              style={styles.halfWidth}
            >
              <View pointerEvents="none">
                <TextInput
                  mode="outlined"
                  label="Start Date"
                  value={formData.startDate}
                  editable={false}
                  right={
                    <TextInput.Icon
                      icon={() => (
                        <FontAwesomeIcon
                          icon={faCalendarAlt}
                          size={18}
                          color={theme.colors.onSurfaceVariant}
                        />
                      )}
                    />
                  }
                />
              </View>
            </TouchableRipple>
            <TouchableRipple
              onPress={() => showDatePicker("endDate")}
              style={styles.halfWidth}
            >
              <View pointerEvents="none">
                <TextInput
                  mode="outlined"
                  label="End Date (Optional)"
                  value={formData.endDate}
                  editable={false}
                  right={
                    <TextInput.Icon
                      icon={() => (
                        <FontAwesomeIcon
                          icon={faCalendarAlt}
                          size={18}
                          color={theme.colors.onSurfaceVariant}
                        />
                      )}
                    />
                  }
                />
              </View>
            </TouchableRipple>
          </View>
          <Menu
            visible={isStageMenuVisible}
            onDismiss={() => setStageMenuVisible(false)}
            anchor={
              <TouchableRipple onPress={() => setStageMenuVisible(true)}>
                <View pointerEvents="none">
                  <TextInput
                    mode="outlined"
                    label="Stage"
                    value={formData.stage}
                    editable={false}
                    left={
                      <TextInput.Icon
                        icon={() => (
                          <FontAwesomeIcon
                            icon={faChartLine}
                            size={18}
                            color={theme.colors.onSurfaceVariant}
                          />
                        )}
                      />
                    }
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
            {CONTRACT_STATUS.map((stage) => (
              <Menu.Item
                key={stage}
                title={stage}
                onPress={() => {
                  handleInputChange("stage", stage);
                  setStageMenuVisible(false);
                }}
              />
            ))}
          </Menu>
          <Menu
            visible={isPriorityMenuVisible}
            onDismiss={() => setPriorityMenuVisible(false)}
            anchor={
              <TouchableRipple onPress={() => setPriorityMenuVisible(true)}>
                <View pointerEvents="none">
                  <TextInput
                    mode="outlined"
                    label="Priority"
                    value={formData.priority}
                    editable={false}
                    left={
                      <TextInput.Icon
                        icon={() => (
                          <FontAwesomeIcon
                            icon={faExclamationTriangle}
                            size={18}
                            color={theme.colors.onSurfaceVariant}
                          />
                        )}
                      />
                    }
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
            {PRIORITY_OPTIONS.map((priority) => (
              <Menu.Item
                key={priority}
                title={priority}
                onPress={() => {
                  handleInputChange("priority", priority);
                  setPriorityMenuVisible(false);
                }}
              />
            ))}
          </Menu>
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
          visible={isDatePickerVisible}
          onDismiss={() => setDatePickerVisible(false)}
        >
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Calendar
              onDayPress={handleDayPress}
              markedDates={
                datePickerFor && formData[datePickerFor]
                  ? { [formData[datePickerFor]]: { selected: true } }
                  : {}
              }
              theme={{
                backgroundColor: theme.colors.surface,
                calendarBackground: theme.colors.surface,
                textSectionTitleColor: theme.colors.onSurfaceVariant,
                selectedDayBackgroundColor: theme.colors.primary,
                selectedDayTextColor: theme.colors.onPrimary,
                todayTextColor: theme.colors.primary,
                dayTextColor: theme.colors.onSurface,
                textDisabledColor: theme.colors.onSurfaceDisabled,
                arrowColor: theme.colors.primary,
                monthTextColor: theme.colors.onSurface,
              }}
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
  container: { padding: 16, gap: 16, paddingBottom: 80 },
  row: { flexDirection: "row", gap: 16 },
  halfWidth: { flex: 1 },
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
  modalContent: { margin: 20, borderRadius: 16, overflow: "hidden" },
});

export default ContractDetails;
