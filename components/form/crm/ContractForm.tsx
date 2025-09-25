import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import React, { useEffect, useState } from "react";
import { Alert, FlatList, ScrollView, StyleSheet, View } from "react-native";
import { Calendar, DateData } from "react-native-calendars";
import {
  ActivityIndicator,
  HelperText,
  List,
  Menu,
  Modal,
  Portal,
  Surface,
  TextInput,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import { FormModal } from "../../modals/FormModal";

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const api = axios.create({ baseURL: API_URL });

const CONTRACT_STATUS = [
  "Prospecting",
  "Proposal Sent",
  "Negotiation",
  "Won",
  "Lost",
  "On Hold",
];
const PRIORITY_LEVELS = ["Low", "Medium", "High"];

export type ContractFormData = {
  deal_name: string;
  partner: string;
  amount: string;
  stage: string;
  start_date: string;
  end_date: string;
  category: string;
  priority: string;
};
type Company = { company_id: number; company_name: string };

type ContractFormProps = {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: (data: ContractFormData) => Promise<void>;
  user_id: string | undefined | null;
};

const PaperFormDropdown = ({
  label,
  items,
  selectedValue,
  onSelect,
  error,
}: any) => {
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.inputContainer}>
      <Menu
        visible={visible}
        onDismiss={() => setVisible(false)}
        anchor={
          <TouchableRipple onPress={() => setVisible(true)}>
            <TextInput
              mode="outlined"
              label={label}
              value={selectedValue}
              editable={false}
              pointerEvents="none"
              right={<TextInput.Icon icon="menu-down" />}
              error={!!error}
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
      <HelperText type="error" visible={!!error}>
        {error}
      </HelperText>
    </View>
  );
};

const ContractForm = ({
  isVisible,
  onClose,
  onSubmit,
  user_id,
}: ContractFormProps) => {
  const theme = useTheme();
  const [formData, setFormData] = useState<ContractFormData>({
    deal_name: "",
    partner: "",
    amount: "",
    stage: "",
    start_date: "",
    end_date: "",
    category: "",
    priority: "Medium",
  });
  const [errors, setErrors] = useState<Partial<ContractFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companyNames, setCompanyNames] = useState<string[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [partnerSuggestions, setPartnerSuggestions] = useState<string[]>([]);
  const [showPartnerSuggestions, setShowPartnerSuggestions] = useState(false);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [datePickerFor, setDatePickerFor] = useState<
    "start_date" | "end_date" | null
  >(null);

  useEffect(() => {
    if (!isVisible || !user_id) {
      setCompanyNames([]);
      return;
    }
    const fetchCompanyNames = async () => {
      setIsLoadingCompanies(true);
      try {
        const token = await AsyncStorage.getItem("accessToken");
        if (!token) throw new Error("Authentication token not found.");
        const response = await api.get<{ companies: Company[] }>(
          `/companies/${user_id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setCompanyNames(
          response.data?.companies?.map((c) => c.company_name) || []
        );
      } catch (err) {
        console.error("Failed to fetch company names:", err);
        setCompanyNames([]);
      } finally {
        setIsLoadingCompanies(false);
      }
    };
    fetchCompanyNames();
  }, [isVisible, user_id]);

  const handleInputChange = (field: keyof ContractFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    if (field === "partner") {
      if (value.length > 0) {
        setPartnerSuggestions(
          companyNames.filter((name) =>
            name.toLowerCase().includes(value.toLowerCase())
          )
        );
        setShowPartnerSuggestions(true);
      } else {
        setShowPartnerSuggestions(false);
      }
    }
  };

  const showDatePicker = (field: "start_date" | "end_date") => {
    setDatePickerFor(field);
    setDatePickerVisible(true);
  };
  const handleDayPress = (day: DateData) => {
    if (datePickerFor) {
      handleInputChange(datePickerFor, day.dateString);
    }
    setDatePickerVisible(false);
    setDatePickerFor(null);
  };
  const closeAllPopups = () => {
    setShowPartnerSuggestions(false);
  };

  const validateForm = () => {
    const newErrors: Partial<ContractFormData> = {};
    if (!formData.deal_name.trim())
      newErrors.deal_name = "Contract Title is required.";
    if (!formData.stage) newErrors.stage = "Contract Stage is required.";
    if (!formData.amount.trim()) newErrors.amount = "Amount is required.";
    if (formData.amount && !/^\d*\.?\d*$/.test(formData.amount))
      newErrors.amount = "Amount must be a valid number.";
    if (!formData.start_date.trim())
      newErrors.start_date = "Start Date is required.";
    if (
      formData.end_date &&
      new Date(formData.end_date) < new Date(formData.start_date)
    ) {
      newErrors.end_date = "End Date cannot be before Start Date.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    closeAllPopups();
    if (!validateForm()) {
      Alert.alert(
        "Validation Error",
        "Please fill all required fields correctly."
      );
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <FormModal
        isVisible={isVisible}
        onClose={onClose}
        title="Add New Contract"
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitButtonText="Save Contract"
        onBackgroundPress={showPartnerSuggestions ? closeAllPopups : onClose}
        onScrollBeginDrag={closeAllPopups}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formContainer}>
            <TextInput
              mode="outlined"
              label="Contract Title"
              placeholder="e.g. Q4 Supply Agreement"
              value={formData.deal_name}
              onChangeText={(text) => handleInputChange("deal_name", text)}
              error={!!errors.deal_name}
            />
            <HelperText type="error" visible={!!errors.deal_name}>
              {errors.deal_name}
            </HelperText>

            <View style={styles.suggestionsContainer}>
              <TextInput
                mode="outlined"
                label="Contract With (Partner)"
                placeholder="Search for a company..."
                value={formData.partner}
                onChangeText={(text) => handleInputChange("partner", text)}
                onFocus={() => {
                  if (formData.partner) setShowPartnerSuggestions(true);
                }}
                right={
                  isLoadingCompanies ? (
                    <TextInput.Icon icon={() => <ActivityIndicator />} />
                  ) : null
                }
              />
              {showPartnerSuggestions && partnerSuggestions.length > 0 && (
                <Surface
                  style={[
                    styles.suggestionsSurface,
                    { backgroundColor: theme.colors.elevation.level2 },
                  ]}
                  elevation={3}
                >
                  <FlatList
                    data={partnerSuggestions}
                    keyExtractor={(item) => item}
                    renderItem={({ item }) => (
                      <List.Item
                        title={item}
                        onPress={() => {
                          handleInputChange("partner", item);
                          setShowPartnerSuggestions(false);
                        }}
                      />
                    )}
                    keyboardShouldPersistTaps="handled"
                  />
                </Surface>
              )}
            </View>

            <PaperFormDropdown
              label="Contract Stage"
              items={CONTRACT_STATUS}
              selectedValue={formData.stage}
              onSelect={(stage: string) => handleInputChange("stage", stage)}
              error={errors.stage}
            />
            <TextInput
              mode="outlined"
              label="Amount (₹)"
              placeholder="e.g. 50000"
              value={formData.amount}
              onChangeText={(text) => handleInputChange("amount", text)}
              error={!!errors.amount}
            />
            <HelperText type="error" visible={!!errors.amount}>
              {errors.amount}
            </HelperText>

            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <TouchableRipple onPress={() => showDatePicker("start_date")}>
                  <TextInput
                    mode="outlined"
                    label="Start Date"
                    value={formData.start_date}
                    placeholder="Select a date"
                    editable={false}
                    pointerEvents="none"
                    right={<TextInput.Icon icon="calendar" />}
                    error={!!errors.start_date}
                  />
                </TouchableRipple>
                <HelperText type="error" visible={!!errors.start_date}>
                  {errors.start_date}
                </HelperText>
              </View>
              <View style={styles.halfWidth}>
                <TouchableRipple onPress={() => showDatePicker("end_date")}>
                  <TextInput
                    mode="outlined"
                    label="End Date (Optional)"
                    value={formData.end_date}
                    placeholder="Select a date"
                    editable={false}
                    pointerEvents="none"
                    right={<TextInput.Icon icon="calendar" />}
                    error={!!errors.end_date}
                  />
                </TouchableRipple>
                <HelperText type="error" visible={!!errors.end_date}>
                  {errors.end_date}
                </HelperText>
              </View>
            </View>
            <TextInput
              mode="outlined"
              label="Category"
              placeholder="e.g. Logistics, Sales"
              value={formData.category}
              onChangeText={(text) => handleInputChange("category", text)}
            />
            <PaperFormDropdown
              label="Priority"
              items={PRIORITY_LEVELS}
              selectedValue={formData.priority}
              onSelect={(priority: string) =>
                handleInputChange("priority", priority)
              }
            />
          </View>
        </ScrollView>
      </FormModal>

      <Portal>
        <Modal
          visible={isDatePickerVisible}
          onDismiss={() => setDatePickerVisible(false)}
          contentContainerStyle={[
            styles.modalContent,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Calendar
            onDayPress={handleDayPress}
            markedDates={
              datePickerFor && formData[datePickerFor]
                ? {
                    [formData[datePickerFor]]: {
                      selected: true,
                      disableTouchEvent: true,
                    },
                  }
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
        </Modal>
      </Portal>
    </>
  );
};

const styles = StyleSheet.create({
  formContainer: { gap: 4 },
  inputContainer: { marginBottom: 12 },
  row: { flexDirection: "row", gap: 16 },
  halfWidth: { flex: 1 },
  suggestionsContainer: { zIndex: 10 },
  suggestionsSurface: {
    position: "absolute",
    top: 60,
    width: "100%",
    borderRadius: 4,
    maxHeight: 160,
  },
  modalContent: { padding: 20, margin: 20, borderRadius: 16 },
});

export default ContractForm;
