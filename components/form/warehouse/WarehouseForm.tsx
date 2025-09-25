import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import {
  HelperText,
  Menu,
  TextInput,
  TouchableRipple,
} from "react-native-paper";
import { FormModal } from "../../modals/FormModal";

const WAREHOUSE_TYPES = [
  "Ambient Storage",
  "Cold Storage",
  "Climate Controlled Storage",
  "Bulk Silo Storage",
  "Packhouse",
  "Hazardous Storage",
];

export type WarehouseFormData = {
  name: string;
  type: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  contact_person: string;
  phone: string;
  storage_capacity: string;
};

type InitialData = {
  [K in keyof WarehouseFormData]?: WarehouseFormData[K] | null | number;
};

type WarehouseFormProps = {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: (data: WarehouseFormData) => Promise<void>;
  initialData?: InitialData | null;
  formTitle?: string;
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
    <View style={styles.inputContainerFull}>
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

const WarehouseForm = ({
  isVisible,
  onClose,
  onSubmit,
  initialData,
  formTitle = "Edit Warehouse",
}: WarehouseFormProps) => {
  const [formData, setFormData] = useState<WarehouseFormData>({
    name: "",
    type: "",
    address_line_1: "",
    address_line_2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "",
    contact_person: "",
    phone: "",
    storage_capacity: "",
  });
  const [errors, setErrors] = useState<Partial<WarehouseFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: String(initialData.name || ""),
        type: String(initialData.type || ""),
        address_line_1: String(initialData.address_line_1 || ""),
        address_line_2: String(initialData.address_line_2 || ""),
        city: String(initialData.city || ""),
        state: String(initialData.state || ""),
        postal_code: String(initialData.postal_code || ""),
        country: String(initialData.country || ""),
        contact_person: String(initialData.contact_person || ""),
        phone: String(initialData.phone || ""),
        storage_capacity: String(initialData.storage_capacity || ""),
      });
      setErrors({});
    }
  }, [initialData]);

  const handleInputChange = (field: keyof WarehouseFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = () => {
    const newErrors: Partial<WarehouseFormData> = {};
    if (!formData.name.trim()) newErrors.name = "Warehouse Name is required.";
    if (!formData.type) newErrors.type = "Warehouse Type is required.";
    if (!formData.address_line_1.trim())
      newErrors.address_line_1 = "Address Line 1 is required.";
    if (!formData.city.trim()) newErrors.city = "City is required.";
    if (!formData.state.trim()) newErrors.state = "State is required.";
    if (!formData.postal_code.trim())
      newErrors.postal_code = "Postal Code is required.";
    if (!formData.country.trim()) newErrors.country = "Country is required.";
    if (
      formData.storage_capacity &&
      isNaN(parseFloat(formData.storage_capacity))
    )
      newErrors.storage_capacity = "Capacity must be a valid number.";
    const E164_REGEX = /^\+?[1-9]\d{9,14}$/;
    if (formData.phone && !E164_REGEX.test(formData.phone.replace(/\s/g, "")))
      newErrors.phone = "Enter a valid phone number (e.g. +91XXXXXXXXXX).";
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

  return (
    <FormModal
      isVisible={isVisible}
      onClose={onClose}
      title={formTitle}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      submitButtonText="Update Warehouse"
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formContainer}>
          <TextInput
            mode="outlined"
            label="Warehouse Name"
            placeholder="e.g. Main Storage Facility"
            value={formData.name}
            onChangeText={(val) => handleInputChange("name", val)}
            error={!!errors.name}
          />
          <HelperText type="error" visible={!!errors.name}>
            {errors.name}
          </HelperText>

          <PaperFormDropdown
            label="Warehouse Type"
            items={WAREHOUSE_TYPES}
            selectedValue={formData.type}
            onSelect={(value: string) => handleInputChange("type", value)}
            error={errors.type}
          />

          <TextInput
            mode="outlined"
            label="Address Line 1"
            placeholder="e.g. 123 Industrial Park Rd"
            value={formData.address_line_1}
            onChangeText={(val) => handleInputChange("address_line_1", val)}
            error={!!errors.address_line_1}
          />
          <HelperText type="error" visible={!!errors.address_line_1}>
            {errors.address_line_1}
          </HelperText>

          <TextInput
            mode="outlined"
            label="Address Line 2 (Optional)"
            placeholder="e.g. Suite 100"
            value={formData.address_line_2}
            onChangeText={(val) => handleInputChange("address_line_2", val)}
          />

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <TextInput
                mode="outlined"
                label="City"
                placeholder="e.g. Guwahati"
                value={formData.city}
                onChangeText={(val) => handleInputChange("city", val)}
                error={!!errors.city}
              />
              <HelperText type="error" visible={!!errors.city}>
                {errors.city}
              </HelperText>
            </View>
            <View style={styles.halfWidth}>
              <TextInput
                mode="outlined"
                label="State / Province"
                placeholder="e.g. Assam"
                value={formData.state}
                onChangeText={(val) => handleInputChange("state", val)}
                error={!!errors.state}
              />
              <HelperText type="error" visible={!!errors.state}>
                {errors.state}
              </HelperText>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <TextInput
                mode="outlined"
                label="Postal Code"
                placeholder="e.g. 123456"
                value={formData.postal_code}
                onChangeText={(val) => handleInputChange("postal_code", val)}
                error={!!errors.postal_code}
              />
              <HelperText type="error" visible={!!errors.postal_code}>
                {errors.postal_code}
              </HelperText>
            </View>
            <View style={styles.halfWidth}>
              <TextInput
                mode="outlined"
                label="Country"
                placeholder="e.g. India"
                value={formData.country}
                onChangeText={(val) => handleInputChange("country", val)}
                error={!!errors.country}
              />
              <HelperText type="error" visible={!!errors.country}>
                {errors.country}
              </HelperText>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <TextInput
                mode="outlined"
                label="Contact Person (Optional)"
                placeholder="e.g. John Doe"
                value={formData.contact_person}
                onChangeText={(val) => handleInputChange("contact_person", val)}
              />
            </View>
            <View style={styles.halfWidth}>
              <TextInput
                mode="outlined"
                label="Phone Number (Optional)"
                placeholder="e.g. +91XXXXXXXXXX"
                value={formData.phone}
                onChangeText={(val) => handleInputChange("phone", val)}
                error={!!errors.phone}
              />
              <HelperText type="error" visible={!!errors.phone}>
                {errors.phone}
              </HelperText>
            </View>
          </View>

          <TextInput
            mode="outlined"
            label="Storage Capacity (sq. ft.)"
            placeholder="e.g. 10000.50"
            value={formData.storage_capacity}
            onChangeText={(val) => handleInputChange("storage_capacity", val)}
            error={!!errors.storage_capacity}
          />
          <HelperText type="error" visible={!!errors.storage_capacity}>
            {errors.storage_capacity}
          </HelperText>
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

export default WarehouseForm;
