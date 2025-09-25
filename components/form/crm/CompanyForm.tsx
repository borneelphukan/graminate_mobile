import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import {
  HelperText,
  Menu,
  TextInput,
  TouchableRipple,
} from "react-native-paper";
import { FormModal } from "../../modals/FormModal";

const COMPANY_TYPES = ["Supplier", "Distributor", "Factory", "Buyer", "Other"];

export type CompanyFormData = {
  company_name: string;
  contact_person: string;
  email: string;
  phone_number: string;
  type: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  postal_code: string;
  website: string;
  industry: string;
};

type CompanyFormProps = {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: (data: CompanyFormData) => Promise<void>;
};

const PaperFormDropdown = ({
  label,
  items,
  selectedValue,
  onSelect,
  error,
}: any) => {
  const [visible, setVisible] = useState(false);
  const openMenu = () => setVisible(true);
  const closeMenu = () => setVisible(false);

  return (
    <View style={styles.inputContainer}>
      <Menu
        visible={visible}
        onDismiss={closeMenu}
        anchor={
          <TouchableRipple onPress={openMenu}>
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
              closeMenu();
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

const CompanyForm = ({ isVisible, onClose, onSubmit }: CompanyFormProps) => {
  const [formData, setFormData] = useState<CompanyFormData>({
    company_name: "",
    contact_person: "",
    email: "",
    phone_number: "",
    type: "",
    address_line_1: "",
    address_line_2: "",
    city: "",
    state: "",
    postal_code: "",
    website: "",
    industry: "",
  });

  const [errors, setErrors] = useState<Partial<CompanyFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: keyof CompanyFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = () => {
    const newErrors: Partial<CompanyFormData> = {};
    if (!formData.company_name.trim())
      newErrors.company_name = "Company Name is required.";
    if (!formData.contact_person.trim())
      newErrors.contact_person = "Contact Person is required.";
    if (!formData.address_line_1.trim())
      newErrors.address_line_1 = "Address is required.";
    if (!formData.city.trim()) newErrors.city = "City is required.";
    if (!formData.state.trim()) newErrors.state = "State is required.";
    if (!formData.postal_code.trim())
      newErrors.postal_code = "Postal Code is required.";
    if (!formData.type) newErrors.type = "Company Type is required.";
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address.";
    }
    const E164_REGEX = /^\+?[1-9]\d{9,14}$/;
    if (
      formData.phone_number &&
      !E164_REGEX.test(formData.phone_number.replace(/\s/g, ""))
    ) {
      newErrors.phone_number = "Enter a valid phone number (e.g. +91..).";
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

  return (
    <FormModal
      isVisible={isVisible}
      onClose={onClose}
      title="Add New Company"
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      submitButtonText="Save Company"
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formContainer}>
          <TextInput
            mode="outlined"
            label="Company Name"
            placeholder="e.g. Acme Corporation"
            value={formData.company_name}
            onChangeText={(text) => handleInputChange("company_name", text)}
            error={!!errors.company_name}
          />
          <HelperText type="error" visible={!!errors.company_name}>
            {errors.company_name}
          </HelperText>

          <TextInput
            mode="outlined"
            label="Contact Person"
            placeholder="e.g. Jane Smith"
            value={formData.contact_person}
            onChangeText={(text) => handleInputChange("contact_person", text)}
            error={!!errors.contact_person}
          />
          <HelperText type="error" visible={!!errors.contact_person}>
            {errors.contact_person}
          </HelperText>

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <TextInput
                mode="outlined"
                label="Email"
                placeholder="contact@acme.com"
                value={formData.email}
                onChangeText={(text) => handleInputChange("email", text)}
                error={!!errors.email}
              />
              <HelperText type="error" visible={!!errors.email}>
                {errors.email}
              </HelperText>
            </View>
            <View style={styles.halfWidth}>
              <TextInput
                mode="outlined"
                label="Phone Number"
                placeholder="+91XXXXXXXXXX"
                value={formData.phone_number}
                onChangeText={(text) => handleInputChange("phone_number", text)}
                error={!!errors.phone_number}
              />
              <HelperText type="error" visible={!!errors.phone_number}>
                {errors.phone_number}
              </HelperText>
            </View>
          </View>

          <PaperFormDropdown
            label="Company Type"
            items={COMPANY_TYPES}
            selectedValue={formData.type}
            onSelect={(type: string) => handleInputChange("type", type)}
            error={errors.type}
          />

          <TextInput
            mode="outlined"
            label="Address Line 1"
            placeholder="e.g. 123 Industrial Park Rd"
            value={formData.address_line_1}
            onChangeText={(text) => handleInputChange("address_line_1", text)}
            error={!!errors.address_line_1}
          />
          <HelperText type="error" visible={!!errors.address_line_1}>
            {errors.address_line_1}
          </HelperText>

          <TextInput
            mode="outlined"
            label="Address Line 2"
            placeholder="e.g. Building 5, Floor 2"
            value={formData.address_line_2}
            onChangeText={(text) => handleInputChange("address_line_2", text)}
          />

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <TextInput
                mode="outlined"
                label="City"
                placeholder="e.g. Mumbai"
                value={formData.city}
                onChangeText={(text) => handleInputChange("city", text)}
                error={!!errors.city}
              />
              <HelperText type="error" visible={!!errors.city}>
                {errors.city}
              </HelperText>
            </View>
            <View style={styles.halfWidth}>
              <TextInput
                mode="outlined"
                label="State"
                placeholder="e.g. Maharashtra"
                value={formData.state}
                onChangeText={(text) => handleInputChange("state", text)}
                error={!!errors.state}
              />
              <HelperText type="error" visible={!!errors.state}>
                {errors.state}
              </HelperText>
            </View>
          </View>

          <TextInput
            mode="outlined"
            label="Postal Code"
            placeholder="e.g. 400001"
            value={formData.postal_code}
            onChangeText={(text) => handleInputChange("postal_code", text)}
            error={!!errors.postal_code}
          />
          <HelperText type="error" visible={!!errors.postal_code}>
            {errors.postal_code}
          </HelperText>

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <TextInput
                mode="outlined"
                label="Website"
                placeholder="www.acme.com"
                value={formData.website}
                onChangeText={(text) => handleInputChange("website", text)}
              />
            </View>
            <View style={styles.halfWidth}>
              <TextInput
                mode="outlined"
                label="Industry"
                placeholder="e.g. Manufacturing"
                value={formData.industry}
                onChangeText={(text) => handleInputChange("industry", text)}
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </FormModal>
  );
};

const styles = StyleSheet.create({
  formContainer: {
    gap: 4,
  },
  inputContainer: {
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 4,
  },
  halfWidth: {
    flex: 1,
  },
});

export default CompanyForm;
