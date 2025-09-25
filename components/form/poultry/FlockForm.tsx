import { FormModal } from "@/components/modals/FormModal";
import { HOUSING_TYPES, POULTRY_TYPES } from "@/constants/options";
import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import {
  HelperText,
  Menu,
  TextInput,
  TouchableRipple,
} from "react-native-paper";

const POULTRY_BREEDS_STRUCTURED = {
  Chickens: [
    "White Leghorn (Layer)",
    "Rhode Island Red (Layer)",
    "Gramapriya (Layer)",
    "Cobb 500 (Broiler)",
    "Ross 308 (Broiler)",
    "Hubbard (Broiler)",
    "Vencobb 430Y (Broiler)",
    "Caribro Vishal (Broiler)",
    "Giriraja (Dual-Purpose)",
    "Vanaraja (Dual-Purpose)",
    "Aseel (Breeder)",
    "Kadaknath (Breeder)",
    "Sasso (Breeder)",
    "Kuroiler (Breeder)",
  ],
  Ducks: [
    "Indian Runner (Layer)",
    "Khaki Campbell (Layer)",
    "Pekin (Breeder)",
    "Muscovy (Breeder)",
  ],
  Quails: ["Japanese Quail (Coturnix) (Layer)", "Bobwhite (Breeder)"],
  Turkeys: ["Broad-Breasted White (Breeder)", "Desi Turkey (Breeder)"],
  Geese: ["Emden (Breeder)", "Local Desi Goose (Breeder)"],
  Others: ["Guinea Fowl (Breeder)", "Pigeons (Squab) (Breeder)"],
};

const ALL_BREEDS_ONLY = Object.values(POULTRY_BREEDS_STRUCTURED).flat();

export type FlockFormData = {
  flock_name: string;
  flock_type: string;
  quantity: string;
  breed: string;
  source: string;
  housing_type: string;
  notes: string;
};

export type ExistingFlockData = {
  flock_id?: number;
  user_id: number;
  flock_name: string;
  flock_type: string;
  quantity: number;
  created_at?: string;
  breed?: string;
  source?: string;
  housing_type?: string;
  notes?: string;
};

type FlockFormProps = {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: (data: FlockFormData) => Promise<void>;
  flockToEdit?: ExistingFlockData | null;
};

const PaperFormDropdown = ({
  label,
  items,
  selectedValue,
  onSelect,
  error,
  disabled = false,
  placeholder,
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
              placeholder={placeholder}
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

const FlockForm = ({
  isVisible,
  onClose,
  onSubmit,
  flockToEdit,
}: FlockFormProps) => {
  const [formData, setFormData] = useState<FlockFormData>({
    flock_name: "",
    flock_type: "",
    quantity: "",
    breed: "",
    source: "",
    housing_type: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Partial<FlockFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filteredBreeds, setFilteredBreeds] =
    useState<string[]>(ALL_BREEDS_ONLY);

  useEffect(() => {
    if (isVisible) {
      if (flockToEdit) {
        setFormData({
          flock_name: flockToEdit.flock_name || "",
          flock_type: flockToEdit.flock_type || "",
          quantity: String(flockToEdit.quantity || ""),
          breed: flockToEdit.breed || "",
          source: flockToEdit.source || "",
          housing_type: flockToEdit.housing_type || "",
          notes: flockToEdit.notes || "",
        });
      } else {
        setFormData({
          flock_name: "",
          flock_type: "",
          quantity: "",
          breed: "",
          source: "",
          housing_type: "",
          notes: "",
        });
      }
      setErrors({});
    }
  }, [flockToEdit, isVisible]);

  useEffect(() => {
    const selectedType = formData.flock_type;
    const typeToFilterTerm: { [key: string]: string } = {
      Layers: "(Layer)",
      "Dual-Purpose": "(Dual-Purpose)",
      Broilers: "(Broiler)",
      Breeder: "(Breeder)",
    };
    const filterTerm = typeToFilterTerm[selectedType];
    if (!filterTerm) {
      setFilteredBreeds(ALL_BREEDS_ONLY);
      return;
    }
    const matchingBreeds = Object.values(POULTRY_BREEDS_STRUCTURED)
      .flat()
      .filter((breed) => breed.includes(filterTerm));
    setFilteredBreeds(matchingBreeds);
  }, [formData.flock_type]);

  const handleInputChange = (field: keyof FlockFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = () => {
    const newErrors: Partial<FlockFormData> = {};
    if (!formData.flock_name.trim())
      newErrors.flock_name = "Flock Name is required.";
    if (!formData.flock_type) newErrors.flock_type = "Flock Type is required.";
    if (!formData.quantity.trim()) newErrors.quantity = "Quantity is required.";
    else if (isNaN(Number(formData.quantity)))
      newErrors.quantity = "Must be a valid number.";
    else if (Number(formData.quantity) < 0)
      newErrors.quantity = "Cannot be negative.";
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

  const isEditMode = !!flockToEdit;

  return (
    <FormModal
      isVisible={isVisible}
      onClose={onClose}
      title={isEditMode ? "Edit Flock" : "Add New Flock"}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      submitButtonText={isEditMode ? "Update Flock" : "Save Flock"}
    >
      <View style={styles.formContainer}>
        <TextInput
          mode="outlined"
          label="Flock Name"
          placeholder="e.g. Layer Batch 1"
          value={formData.flock_name}
          onChangeText={(text) => handleInputChange("flock_name", text)}
          error={!!errors.flock_name}
        />
        <HelperText type="error" visible={!!errors.flock_name}>
          {errors.flock_name}
        </HelperText>

        <PaperFormDropdown
          label="Flock Type"
          items={POULTRY_TYPES}
          selectedValue={formData.flock_type}
          onSelect={(value: string) => {
            handleInputChange("flock_type", value);
            handleInputChange("breed", "");
          }}
          error={errors.flock_type}
        />
        <PaperFormDropdown
          label="Breed (Optional)"
          items={filteredBreeds}
          selectedValue={formData.breed}
          onSelect={(value: string) => handleInputChange("breed", value)}
          disabled={!formData.flock_type}
          placeholder={
            !formData.flock_type ? "Select Flock Type First" : "Select Breed"
          }
        />
        <View style={styles.row}>
          <View style={styles.halfWidth}>
            <TextInput
              mode="outlined"
              label="Quantity"
              placeholder="e.g. 100"
              value={formData.quantity}
              onChangeText={(text) =>
                handleInputChange("quantity", text.replace(/[^0-9]/g, ""))
              }
              error={!!errors.quantity}
              keyboardType="number-pad"
            />
            <HelperText type="error" visible={!!errors.quantity}>
              {errors.quantity}
            </HelperText>
          </View>
          <View style={styles.halfWidth}>
            <TextInput
              mode="outlined"
              label="Source (Optional)"
              placeholder="e.g. Local Hatchery"
              value={formData.source}
              onChangeText={(text) => handleInputChange("source", text)}
            />
          </View>
        </View>

        <PaperFormDropdown
          label="Housing Type (Optional)"
          items={HOUSING_TYPES.map((h) => h.name)}
          selectedValue={formData.housing_type}
          onSelect={(value: string) => handleInputChange("housing_type", value)}
        />
        <TextInput
          mode="outlined"
          label="Notes (Optional)"
          placeholder="e.g. Aggression, pecking order..."
          value={formData.notes}
          onChangeText={(text) => handleInputChange("notes", text)}
          multiline
          numberOfLines={4}
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

export default FlockForm;
