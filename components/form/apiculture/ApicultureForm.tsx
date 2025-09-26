import { FormModal } from "@/components/modals/FormModal";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faBox,
  faBug,
  faChevronDown,
  faClipboard,
  faRulerCombined,
  faTag,
  faTruck,
  faWarehouse,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import {
  HelperText,
  Menu,
  TextInput,
  TouchableRipple,
  useTheme,
} from "react-native-paper";

const BEE_SPECIES = [
  "Apis mellifera (European Honey Bee)",
  "Apis cerana (Asiatic Honey Bee)",
  "Apis dorsata (Giant Honey Bee)",
  "Trigona (Stingless Bees)",
  "Other",
];

const HIVE_TYPES = [
  "Langstroth",
  "Top-bar",
  "Warre",
  "Flow Hive",
  "Traditional Log Hive",
  "Other",
];

export type ApiaryFormData = {
  apiary_name: string;
  number_of_hives: string;
  bee_species: string;
  hive_type: string;
  queen_source: string;
  area: string;
  notes: string;
};

export type ExistingApiaryData = {
  apiary_id?: number;
  user_id: number;
  apiary_name: string;
  number_of_hives: number;
  created_at?: string;
  area?: number | null;
  bee_species?: string;
  hive_type?: string;
  queen_source?: string;
  notes?: string;
};

type ApicultureFormProps = {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: (data: ApiaryFormData) => Promise<void>;
  apiaryToEdit?: ExistingApiaryData | null;
  formTitle?: string;
};

const PaperFormDropdown = ({
  label,
  items,
  selectedValue,
  onSelect,
  error,
  disabled = false,
  placeholder,
  leftIcon,
}: {
  label: string;
  items: string[];
  selectedValue: string;
  onSelect: (value: string) => void;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
  leftIcon?: IconDefinition;
}) => {
  const [visible, setVisible] = useState(false);
  const theme = useTheme();

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
            <View pointerEvents="none">
              <TextInput
                mode="outlined"
                label={label}
                value={selectedValue}
                placeholder={placeholder}
                editable={false}
                left={
                  leftIcon && (
                    <TextInput.Icon
                      icon={() => (
                        <FontAwesomeIcon
                          icon={leftIcon}
                          size={18}
                          color={theme.colors.onSurfaceVariant}
                        />
                      )}
                    />
                  )
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
                error={!!error}
                disabled={disabled}
              />
            </View>
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

const ApicultureForm = ({
  isVisible,
  onClose,
  onSubmit,
  apiaryToEdit,
}: ApicultureFormProps) => {
  const theme = useTheme();
  const [formData, setFormData] = useState<ApiaryFormData>({
    apiary_name: "",
    number_of_hives: "",
    bee_species: "",
    hive_type: "",
    queen_source: "",
    area: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Partial<ApiaryFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isVisible) {
      if (apiaryToEdit) {
        setFormData({
          apiary_name: apiaryToEdit.apiary_name || "",
          number_of_hives: String(apiaryToEdit.number_of_hives || ""),
          bee_species: apiaryToEdit.bee_species || "",
          hive_type: apiaryToEdit.hive_type || "",
          queen_source: apiaryToEdit.queen_source || "",
          area: apiaryToEdit.area != null ? String(apiaryToEdit.area) : "",
          notes: apiaryToEdit.notes || "",
        });
      } else {
        setFormData({
          apiary_name: "",
          number_of_hives: "",
          bee_species: "",
          hive_type: "",
          queen_source: "",
          area: "",
          notes: "",
        });
      }
      setErrors({});
    }
  }, [apiaryToEdit, isVisible]);

  const handleInputChange = (field: keyof ApiaryFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = () => {
    const newErrors: Partial<ApiaryFormData> = {};
    if (!formData.apiary_name.trim())
      newErrors.apiary_name = "Bee Yard Name is required.";
    if (!formData.number_of_hives.trim())
      newErrors.number_of_hives = "Number of hives is required.";
    else if (isNaN(Number(formData.number_of_hives)))
      newErrors.number_of_hives = "Must be a valid number.";
    else if (Number(formData.number_of_hives) < 0)
      newErrors.number_of_hives = "Cannot be negative.";

    if (formData.area.trim() && isNaN(Number(formData.area))) {
      newErrors.area = "Must be a valid number if provided.";
    } else if (formData.area.trim() && Number(formData.area) < 0) {
      newErrors.area = "Cannot be negative.";
    }

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
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEditMode = !!apiaryToEdit;

  return (
    <FormModal
      isVisible={isVisible}
      onClose={onClose}
      title={isEditMode ? "Edit Bee Yard" : "Add New Bee Yard"}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      submitButtonText={isEditMode ? "Update Bee Yard" : "Save Bee Yard"}
    >
      <View style={styles.formContainer}>
        <TextInput
          mode="outlined"
          label="Bee Yard Name"
          placeholder="e.g. Backyard Hives"
          value={formData.apiary_name}
          onChangeText={(text) => handleInputChange("apiary_name", text)}
          error={!!errors.apiary_name}
          left={
            <TextInput.Icon
              icon={() => (
                <FontAwesomeIcon
                  icon={faTag}
                  size={18}
                  color={theme.colors.onSurfaceVariant}
                />
              )}
            />
          }
        />
        <HelperText type="error" visible={!!errors.apiary_name}>
          {errors.apiary_name}
        </HelperText>

        <View style={styles.row}>
          <View style={styles.halfWidth}>
            <TextInput
              mode="outlined"
              label="Number of Hives"
              placeholder="e.g. 5"
              value={formData.number_of_hives}
              onChangeText={(text) =>
                handleInputChange(
                  "number_of_hives",
                  text.replace(/[^0-9]/g, "")
                )
              }
              error={!!errors.number_of_hives}
              keyboardType="number-pad"
              left={
                <TextInput.Icon
                  icon={() => (
                    <FontAwesomeIcon
                      icon={faWarehouse}
                      size={18}
                      color={theme.colors.onSurfaceVariant}
                    />
                  )}
                />
              }
            />
            <HelperText type="error" visible={!!errors.number_of_hives}>
              {errors.number_of_hives}
            </HelperText>
          </View>
          <View style={styles.halfWidth}>
            <TextInput
              mode="outlined"
              label="Area (sq. m) (Optional)"
              placeholder="e.g. 50"
              value={formData.area}
              onChangeText={(text) =>
                handleInputChange("area", text.replace(/[^0-9.]/g, ""))
              }
              error={!!errors.area}
              keyboardType="numeric"
              left={
                <TextInput.Icon
                  icon={() => (
                    <FontAwesomeIcon
                      icon={faRulerCombined}
                      size={18}
                      color={theme.colors.onSurfaceVariant}
                    />
                  )}
                />
              }
            />
            <HelperText type="error" visible={!!errors.area}>
              {errors.area}
            </HelperText>
          </View>
        </View>

        <PaperFormDropdown
          label="Bee Species (Optional)"
          items={BEE_SPECIES}
          selectedValue={formData.bee_species}
          onSelect={(value: string) => handleInputChange("bee_species", value)}
          leftIcon={faBug}
        />

        <PaperFormDropdown
          label="Hive Type (Optional)"
          items={HIVE_TYPES}
          selectedValue={formData.hive_type}
          onSelect={(value: string) => handleInputChange("hive_type", value)}
          leftIcon={faBox}
        />

        <TextInput
          mode="outlined"
          label="Queen Source (Optional)"
          placeholder="e.g. Local Supplier"
          value={formData.queen_source}
          onChangeText={(text) => handleInputChange("queen_source", text)}
          left={
            <TextInput.Icon
              icon={() => (
                <FontAwesomeIcon
                  icon={faTruck}
                  size={18}
                  color={theme.colors.onSurfaceVariant}
                />
              )}
            />
          }
        />
        <View style={{ marginBottom: 12 }} />

        <TextInput
          mode="outlined"
          label="Notes (Optional)"
          placeholder="e.g. Hive temperament, nectar flow..."
          value={formData.notes}
          onChangeText={(text) => handleInputChange("notes", text)}
          multiline
          numberOfLines={4}
          left={
            <TextInput.Icon
              icon={() => (
                <FontAwesomeIcon
                  icon={faClipboard}
                  size={18}
                  color={theme.colors.onSurfaceVariant}
                />
              )}
            />
          }
        />
      </View>
    </FormModal>
  );
};

const styles = StyleSheet.create({
  formContainer: { gap: 4 },
  inputContainerFull: { marginBottom: 12 },
  row: { flexDirection: "row", gap: 16 },
  halfWidth: { flex: 1 },
});

export default ApicultureForm;
