import { FormModal } from "@/components/modals/FormModal";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import {
  Button,
  HelperText,
  Menu,
  TextInput,
  TouchableRipple,
} from "react-native-paper";

export type HiveFormData = {
  hive_name: string;
  hive_type: string;
  bee_species: string;
  installation_date: string;
  honey_capacity: string;
  unit: string;
  ventilation_status: string;
  notes: string;
  last_inspection_date: string;
};

export type SavedHiveData = {
  hive_id: number;
  apiary_id: number;
  hive_name: string;
};

type HiveFormProps = {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: (data: HiveFormData) => Promise<void>;
  hiveToEdit?: { [key: string]: any } | null;
  apiaryId: number;
  formTitle?: string;
};

type HiveFormErrors = {
  hive_name?: string;
  installation_date?: string;
};

const HIVE_CONFIG = {
  "Langstroth Hive": {
    bee_species: [
      "European Honey Bee (Apis mellifera)",
      "Indian Hive Bee (Apis cerana indica)",
    ],
    ventilation_status: [
      "Top Ventilation (Upper Hive Venting)",
      "Bottom Ventilation (Lower Hive Venting)",
      "Entrance Ventilation",
    ],
    unit: ["kilograms (kg)", "pounds (lbs)"],
  },
  "Newton Hive": {
    bee_species: ["Indian Hive Bee (Apis cerana indica)"],
    ventilation_status: [
      "Entrance Ventilation",
      "Bottom Ventilation (Lower Hive Venting)",
    ],
    unit: ["kilograms (kg)"],
  },
  "Jeolikote Hive": {
    bee_species: ["Indian Hive Bee (Apis cerana indica)"],
    ventilation_status: [
      "Entrance Ventilation",
      "Bottom Ventilation (Lower Hive Venting)",
    ],
    unit: ["kilograms (kg)"],
  },
};

const HIVE_TYPES = Object.keys(HIVE_CONFIG);

const formatDateForInput = (date: string | Date | undefined | null): string => {
  if (!date) return "";
  const d = new Date(date);
  return !isNaN(d.getTime()) ? d.toISOString().split("T")[0] : "";
};

const PaperFormDropdown = ({
  label,
  items,
  selectedValue,
  onSelect,
  error,
  disabled = false,
}: any) => {
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.inputContainerFull}>
      <Menu
        visible={visible}
        onDismiss={() => setVisible(false)}
        anchor={
          <TouchableRipple
            onPress={() => !disabled && setVisible(true)}
            disabled={disabled}
          >
            <TextInput
              mode="outlined"
              label={label}
              value={selectedValue}
              placeholder={disabled ? "Select Hive Type First" : ""}
              editable={false}
              pointerEvents="none"
              right={<TextInput.Icon icon="menu-down" />}
              error={!!error}
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
      <HelperText type="error" visible={!!error}>
        {error}
      </HelperText>
    </View>
  );
};

const HiveForm = ({
  isVisible,
  onClose,
  onSubmit,
  hiveToEdit,
  formTitle,
}: HiveFormProps) => {
  const [formData, setFormData] = useState<HiveFormData>({
    hive_name: "",
    hive_type: "",
    bee_species: "",
    installation_date: "",
    honey_capacity: "",
    unit: "",
    ventilation_status: "",
    notes: "",
    last_inspection_date: "",
  });
  const [errors, setErrors] = useState<HiveFormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isVisible) {
      if (hiveToEdit) {
        setFormData({
          hive_name: hiveToEdit.hive_name || "",
          hive_type: hiveToEdit.hive_type || "",
          bee_species: hiveToEdit.bee_species || "",
          installation_date: formatDateForInput(hiveToEdit.installation_date),
          honey_capacity:
            hiveToEdit.honey_capacity != null
              ? String(hiveToEdit.honey_capacity)
              : "",
          unit: hiveToEdit.unit || "",
          ventilation_status: hiveToEdit.ventilation_status || "",
          notes: hiveToEdit.notes || "",
          last_inspection_date: formatDateForInput(
            hiveToEdit.last_inspection_date
          ),
        });
      } else {
        setFormData({
          hive_name: "",
          hive_type: "",
          bee_species: "",
          installation_date: "",
          honey_capacity: "",
          unit: "",
          ventilation_status: "",
          notes: "",
          last_inspection_date: "",
        });
      }
      setErrors({});
    }
  }, [hiveToEdit, isVisible]);

  const handleInputChange = (
    field: keyof HiveFormData,
    value: string | null
  ) => {
    const newState = { ...formData, [field]: value || "" };
    if (field === "hive_type") {
      const config = HIVE_CONFIG[value as keyof typeof HIVE_CONFIG];
      if (config) {
        if (!config.bee_species.includes(newState.bee_species))
          newState.bee_species = "";
        if (!config.ventilation_status.includes(newState.ventilation_status))
          newState.ventilation_status = "";
        if (!config.unit.includes(newState.unit)) newState.unit = "";
      } else {
        newState.bee_species = "";
        newState.ventilation_status = "";
        newState.unit = "";
      }
    }
    setFormData(newState);
    if (errors[field as keyof HiveFormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = useCallback(() => {
    const newErrors: HiveFormErrors = {};
    if (!formData.hive_name.trim())
      newErrors.hive_name = "Hive name is required.";
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (
      formData.installation_date &&
      !dateRegex.test(formData.installation_date)
    ) {
      newErrors.installation_date = "Date must be in YYYY-MM-DD format.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsLoading(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error("Submission failed in hive form:", error);
      setErrors({ hive_name: "Failed to save hive. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedHiveConfig = formData.hive_type
    ? HIVE_CONFIG[formData.hive_type as keyof typeof HIVE_CONFIG]
    : null;

  return (
    <FormModal
      isVisible={isVisible}
      onClose={onClose}
      title={formTitle || (hiveToEdit ? "Edit Hive" : "Add New Hive")}
      onSubmit={handleSubmit}
      isSubmitting={isLoading}
      submitButtonText={hiveToEdit ? "Update Hive" : "Save Hive"}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formContainer}>
          <TextInput
            mode="outlined"
            label="Hive Name"
            placeholder="Enter Hive Name"
            value={formData.hive_name}
            onChangeText={(text) => handleInputChange("hive_name", text)}
            error={!!errors.hive_name}
          />
          <HelperText type="error" visible={!!errors.hive_name}>
            {errors.hive_name}
          </HelperText>

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <PaperFormDropdown
                label="Hive Type"
                items={HIVE_TYPES}
                selectedValue={formData.hive_type}
                onSelect={(val: string) => handleInputChange("hive_type", val)}
              />
            </View>
            <View style={styles.halfWidth}>
              <PaperFormDropdown
                label="Bee Species"
                items={selectedHiveConfig?.bee_species || []}
                selectedValue={formData.bee_species}
                onSelect={(val: string) =>
                  handleInputChange("bee_species", val)
                }
                disabled={!formData.hive_type}
              />
            </View>
          </View>

          <TextInput
            mode="outlined"
            label="Installation Date (Optional)"
            placeholder="YYYY-MM-DD"
            value={formData.installation_date}
            onChangeText={(text) =>
              handleInputChange("installation_date", text)
            }
            error={!!errors.installation_date}
          />
          <HelperText type="error" visible={!!errors.installation_date}>
            {errors.installation_date}
          </HelperText>

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <TextInput
                mode="outlined"
                label="Honey Capacity (Optional)"
                placeholder="e.g., 25.5"
                value={formData.honey_capacity}
                onChangeText={(text) =>
                  handleInputChange("honey_capacity", text)
                }
                keyboardType="numeric"
              />
            </View>
            <View style={styles.halfWidth}>
              <PaperFormDropdown
                label="Unit"
                items={selectedHiveConfig?.unit || []}
                selectedValue={formData.unit}
                onSelect={(val: string) => handleInputChange("unit", val)}
                disabled={!formData.honey_capacity || !formData.hive_type}
              />
            </View>
          </View>

          <PaperFormDropdown
            label="Ventilation"
            items={selectedHiveConfig?.ventilation_status || []}
            selectedValue={formData.ventilation_status}
            onSelect={(val: string) =>
              handleInputChange("ventilation_status", val)
            }
            disabled={!formData.hive_type}
          />
          <TextInput
            mode="outlined"
            label="Notes (Optional)"
            placeholder="Add any notes..."
            value={formData.notes}
            onChangeText={(text) => handleInputChange("notes", text)}
            multiline
            numberOfLines={4}
          />
        </View>
      </ScrollView>
    </FormModal>
  );
};

const styles = StyleSheet.create({
  formContainer: { gap: 4 },
  inputContainerFull: { marginBottom: 12 },
  row: { flexDirection: "row", gap: 16 },
  halfWidth: { flex: 1 },
});

export default HiveForm;
