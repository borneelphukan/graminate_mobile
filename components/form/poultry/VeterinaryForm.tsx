import { FormModal } from "@/components/modals/FormModal";
import axiosInstance from "@/lib/axiosInstance";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { Calendar, DateData } from "react-native-calendars";
import {
  HelperText,
  Modal,
  Portal,
  TextInput,
  TouchableRipple,
  useTheme,
} from "react-native-paper";

interface VeterinaryFormProps {
  isVisible: boolean;
  onClose: () => void;
  flockId: number;
  formTitle?: string;
}

type HealthRecordData = {
  veterinaryName: string;
  totalBirds: string;
  birdsVaccinated: string;
  vaccinesGiven: string;
  symptoms: string;
  medicineApproved: string;
  remarks: string;
  nextAppointment: Date | null;
};

type HealthFormErrors = Partial<HealthRecordData> & {
  totalBirds?: string;
  birdsVaccinated?: string;
};

type HealthRecordPayload = {
  user_id: number;
  flock_id: number;
  total_birds: number;
  birds_vaccinated: number;
  veterinary_name?: string;
  vaccines_given?: string[];
  symptoms?: string[];
  medicine_approved?: string[];
  remarks?: string;
  next_appointment?: string;
};

const VeterinaryForm = ({
  isVisible,
  onClose,
  flockId,
  formTitle,
}: VeterinaryFormProps) => {
  const { user_id: queryUserId } = useLocalSearchParams<{ user_id: string }>();
  const theme = useTheme();

  const [formData, setFormData] = useState<HealthRecordData>({
    veterinaryName: "",
    totalBirds: "",
    birdsVaccinated: "",
    vaccinesGiven: "",
    symptoms: "",
    medicineApproved: "",
    remarks: "",
    nextAppointment: null,
  });
  const [errors, setErrors] = useState<HealthFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setFormData({
        veterinaryName: "",
        totalBirds: "",
        birdsVaccinated: "",
        vaccinesGiven: "",
        symptoms: "",
        medicineApproved: "",
        remarks: "",
        nextAppointment: null,
      });
      setErrors({});
    }
  }, [isVisible]);

  const handleInputChange = (
    field: keyof HealthRecordData,
    value: string | Date | null
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleDayPress = (day: DateData) => {
    handleInputChange("nextAppointment", new Date(day.dateString));
    setShowDatePicker(false);
  };

  const validateForm = (): boolean => {
    const newErrors: HealthFormErrors = {};
    const { totalBirds, birdsVaccinated } = formData;
    if (!totalBirds.trim()) newErrors.totalBirds = "Total birds is required.";
    else if (isNaN(Number(totalBirds)) || Number(totalBirds) < 0)
      newErrors.totalBirds = "Must be a valid non-negative number.";
    if (!birdsVaccinated.trim())
      newErrors.birdsVaccinated = "Birds vaccinated is required.";
    else if (isNaN(Number(birdsVaccinated)) || Number(birdsVaccinated) < 0)
      newErrors.birdsVaccinated = "Must be a valid non-negative number.";
    else if (Number(birdsVaccinated) > Number(totalBirds))
      newErrors.birdsVaccinated = "Cannot exceed total birds.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert(
        "Validation Error",
        "Please fill all required fields correctly."
      );
      return;
    }
    if (!queryUserId || !flockId) {
      Alert.alert("Error", "User ID or Flock ID is missing.");
      return;
    }
    setIsSubmitting(true);
    const parseStringToArray = (str: string) =>
      str
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    const payload: HealthRecordPayload = {
      user_id: Number(queryUserId),
      flock_id: Number(flockId),
      total_birds: Number(formData.totalBirds),
      birds_vaccinated: Number(formData.birdsVaccinated),
      ...(formData.veterinaryName.trim() && {
        veterinary_name: formData.veterinaryName,
      }),
      ...(formData.vaccinesGiven.trim() && {
        vaccines_given: parseStringToArray(formData.vaccinesGiven),
      }),
      ...(formData.symptoms.trim() && {
        symptoms: parseStringToArray(formData.symptoms),
      }),
      ...(formData.medicineApproved.trim() && {
        medicine_approved: parseStringToArray(formData.medicineApproved),
      }),
      ...(formData.remarks.trim() && { remarks: formData.remarks }),
      ...(formData.nextAppointment && {
        next_appointment: formData.nextAppointment.toISOString(),
      }),
    };
    try {
      await axiosInstance.post(`/poultry-health/add`, payload);
      onClose();
    } catch (error) {
      Alert.alert("Submission Error", "Failed to submit health record.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <FormModal
        isVisible={isVisible}
        onClose={onClose}
        title={formTitle || "Log New Health Record"}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitButtonText="Save Record"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formContainer}>
            <TextInput
              mode="outlined"
              label="Veterinary Name (Optional)"
              placeholder="e.g. Dr. Smith"
              value={formData.veterinaryName}
              onChangeText={(val) => handleInputChange("veterinaryName", val)}
            />
            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <TextInput
                  mode="outlined"
                  label="Total Birds Involved"
                  placeholder="e.g. 100"
                  value={formData.totalBirds}
                  onChangeText={(val) =>
                    handleInputChange("totalBirds", val.replace(/[^0-9]/g, ""))
                  }
                  keyboardType="number-pad"
                  error={!!errors.totalBirds}
                />
                <HelperText type="error" visible={!!errors.totalBirds}>
                  {errors.totalBirds}
                </HelperText>
              </View>
              <View style={styles.halfWidth}>
                <TextInput
                  mode="outlined"
                  label="Birds Vaccinated"
                  placeholder="e.g. 95"
                  value={formData.birdsVaccinated}
                  onChangeText={(val) =>
                    handleInputChange(
                      "birdsVaccinated",
                      val.replace(/[^0-9]/g, "")
                    )
                  }
                  keyboardType="number-pad"
                  error={!!errors.birdsVaccinated}
                />
                <HelperText type="error" visible={!!errors.birdsVaccinated}>
                  {errors.birdsVaccinated}
                </HelperText>
              </View>
            </View>
            <TextInput
              mode="outlined"
              label="Vaccines Given (comma-separated)"
              placeholder="e.g. NDV, IBV"
              value={formData.vaccinesGiven}
              onChangeText={(val) => handleInputChange("vaccinesGiven", val)}
            />
            <TextInput
              mode="outlined"
              label="Symptoms Observed (comma-separated)"
              placeholder="e.g. Coughing, Sneezing"
              value={formData.symptoms}
              onChangeText={(val) => handleInputChange("symptoms", val)}
            />
            <TextInput
              mode="outlined"
              label="Medicine Approved (comma-separated)"
              placeholder="e.g. Antibiotic X, Vitamin Y"
              value={formData.medicineApproved}
              onChangeText={(val) => handleInputChange("medicineApproved", val)}
            />
            <TouchableRipple onPress={() => setShowDatePicker(true)}>
              <TextInput
                mode="outlined"
                label="Next Appointment (Optional)"
                placeholder="Select a date"
                value={formData.nextAppointment?.toLocaleDateString() || ""}
                editable={false}
                pointerEvents="none"
                right={<TextInput.Icon icon="calendar" />}
              />
            </TouchableRipple>
            <TextInput
              mode="outlined"
              label="Remarks (Optional)"
              placeholder="Additional notes or observations"
              value={formData.remarks}
              onChangeText={(text) => handleInputChange("remarks", text)}
              multiline
              numberOfLines={4}
            />
          </View>
        </ScrollView>
      </FormModal>
      <Portal>
        <Modal
          visible={showDatePicker}
          onDismiss={() => setShowDatePicker(false)}
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
                formData.nextAppointment
                  ? {
                      [formData.nextAppointment.toISOString().split("T")[0]]: {
                        selected: true,
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
          </View>
        </Modal>
      </Portal>
    </>
  );
};

const styles = StyleSheet.create({
  formContainer: { gap: 16 },
  row: { flexDirection: "row", gap: 16 },
  halfWidth: { flex: 1 },
  modalContent: { margin: 20, borderRadius: 16 },
});

export default VeterinaryForm;
