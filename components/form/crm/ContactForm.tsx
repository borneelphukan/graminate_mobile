import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import {
  HelperText,
  Menu,
  TextInput,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import { FormModal } from "../../modals/FormModal";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faUser,
  faEnvelope,
  faPhone,
  faAddressBook,
  faMapPin,
  faCity,
  faMap,
  faHashtag,
  faChevronDown,
} from "@fortawesome/free-solid-svg-icons";

const CONTACT_TYPES = [
  "Customer",
  "Supplier",
  "Lead",
  "Partner",
  "Employee",
  "Other",
];

export type ContactFormData = {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  type: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  postal_code: string;
};

type ContactFormProps = {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: (data: ContactFormData) => Promise<void>;
};

const PaperFormDropdown = ({
  label,
  items,
  selectedValue,
  onSelect,
  error,
  leftIcon,
}: {
  label: string;
  items: string[];
  selectedValue: string;
  onSelect: (value: string) => void;
  error?: string;
  leftIcon?: IconDefinition;
}) => {
  const [visible, setVisible] = useState(false);
  const theme = useTheme();

  return (
    <View style={styles.inputContainer}>
      <Menu
        visible={visible}
        onDismiss={() => setVisible(false)}
        anchor={
          <TouchableRipple onPress={() => setVisible(true)}>
            <View pointerEvents="none">
              <TextInput
                mode="outlined"
                label={label}
                value={selectedValue}
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

const ContactForm = ({ isVisible, onClose, onSubmit }: ContactFormProps) => {
  const theme = useTheme();
  const [formData, setFormData] = useState<ContactFormData>({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    type: "",
    address_line_1: "",
    address_line_2: "",
    city: "",
    state: "",
    postal_code: "",
  });
  const [errors, setErrors] = useState<Partial<ContactFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: keyof ContactFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = () => {
    const newErrors: Partial<ContactFormData> = {};
    if (!formData.first_name.trim())
      newErrors.first_name = "First Name is required.";
    if (!formData.type) newErrors.type = "Contact Type is required.";
    if (!formData.address_line_1.trim())
      newErrors.address_line_1 = "Address is required.";
    if (!formData.city.trim()) newErrors.city = "City is required.";
    if (!formData.state.trim()) newErrors.state = "State is required.";
    if (!formData.postal_code.trim())
      newErrors.postal_code = "Postal Code is required.";
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email))
      newErrors.email = "Please enter a valid email address.";
    const E164_REGEX = /^\+?[1-9]\d{9,14}$/;
    if (
      formData.phone_number &&
      !E164_REGEX.test(formData.phone_number.replace(/\s/g, ""))
    ) {
      newErrors.phone_number =
        "Enter a valid phone number (e.g. +91XXXXXXXXXX).";
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
      // Handle submission error (e.g., show an alert)
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormModal
      isVisible={isVisible}
      onClose={onClose}
      title="Add New Contact"
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      submitButtonText="Save Contact"
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formContainer}>
          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <TextInput
                mode="outlined"
                label="First Name"
                placeholder="e.g. John"
                value={formData.first_name}
                onChangeText={(text) => handleInputChange("first_name", text)}
                error={!!errors.first_name}
                left={
                  <TextInput.Icon
                    icon={() => (
                      <FontAwesomeIcon
                        icon={faUser}
                        size={18}
                        color={theme.colors.onSurfaceVariant}
                      />
                    )}
                  />
                }
              />
              <HelperText type="error" visible={!!errors.first_name}>
                {errors.first_name}
              </HelperText>
            </View>
            <View style={styles.halfWidth}>
              <TextInput
                mode="outlined"
                label="Last Name"
                placeholder="e.g. Doe"
                value={formData.last_name}
                onChangeText={(text) => handleInputChange("last_name", text)}
              />
            </View>
          </View>

          <TextInput
            mode="outlined"
            label="Email"
            placeholder="e.g. john.doe@example.com"
            value={formData.email}
            onChangeText={(text) => handleInputChange("email", text)}
            error={!!errors.email}
            left={
              <TextInput.Icon
                icon={() => (
                  <FontAwesomeIcon
                    icon={faEnvelope}
                    size={18}
                    color={theme.colors.onSurfaceVariant}
                  />
                )}
              />
            }
          />
          <HelperText type="error" visible={!!errors.email}>
            {errors.email}
          </HelperText>

          <TextInput
            mode="outlined"
            label="Phone Number"
            placeholder="e.g. +91XXXXXXXXXX"
            value={formData.phone_number}
            onChangeText={(text) => handleInputChange("phone_number", text)}
            error={!!errors.phone_number}
            keyboardType="phone-pad"
            left={
              <TextInput.Icon
                icon={() => (
                  <FontAwesomeIcon
                    icon={faPhone}
                    size={18}
                    color={theme.colors.onSurfaceVariant}
                  />
                )}
              />
            }
          />
          <HelperText type="error" visible={!!errors.phone_number}>
            {errors.phone_number}
          </HelperText>

          <PaperFormDropdown
            label="Contact Type"
            items={CONTACT_TYPES}
            selectedValue={formData.type}
            onSelect={(type: string) => handleInputChange("type", type)}
            error={errors.type}
            leftIcon={faAddressBook}
          />

          <TextInput
            mode="outlined"
            label="Address Line 1"
            placeholder="e.g. 123 Main St"
            value={formData.address_line_1}
            onChangeText={(text) => handleInputChange("address_line_1", text)}
            error={!!errors.address_line_1}
            left={
              <TextInput.Icon
                icon={() => (
                  <FontAwesomeIcon
                    icon={faMapPin}
                    size={18}
                    color={theme.colors.onSurfaceVariant}
                  />
                )}
              />
            }
          />
          <HelperText type="error" visible={!!errors.address_line_1}>
            {errors.address_line_1}
          </HelperText>

          <TextInput
            mode="outlined"
            label="Address Line 2"
            placeholder="e.g. Apt 4B"
            value={formData.address_line_2}
            onChangeText={(text) => handleInputChange("address_line_2", text)}
          />

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <TextInput
                mode="outlined"
                label="City"
                placeholder="e.g. Bengaluru"
                value={formData.city}
                onChangeText={(text) => handleInputChange("city", text)}
                error={!!errors.city}
                left={
                  <TextInput.Icon
                    icon={() => (
                      <FontAwesomeIcon
                        icon={faCity}
                        size={18}
                        color={theme.colors.onSurfaceVariant}
                      />
                    )}
                  />
                }
              />
              <HelperText type="error" visible={!!errors.city}>
                {errors.city}
              </HelperText>
            </View>
            <View style={styles.halfWidth}>
              <TextInput
                mode="outlined"
                label="State"
                placeholder="e.g. Karnataka"
                value={formData.state}
                onChangeText={(text) => handleInputChange("state", text)}
                error={!!errors.state}
                left={
                  <TextInput.Icon
                    icon={() => (
                      <FontAwesomeIcon
                        icon={faMap}
                        size={18}
                        color={theme.colors.onSurfaceVariant}
                      />
                    )}
                  />
                }
              />
              <HelperText type="error" visible={!!errors.state}>
                {errors.state}
              </HelperText>
            </View>
          </View>

          <TextInput
            mode="outlined"
            label="Postal Code"
            placeholder="e.g. 560001"
            value={formData.postal_code}
            onChangeText={(text) => handleInputChange("postal_code", text)}
            error={!!errors.postal_code}
            keyboardType="number-pad"
            left={
              <TextInput.Icon
                icon={() => (
                  <FontAwesomeIcon
                    icon={faHashtag}
                    size={18}
                    color={theme.colors.onSurfaceVariant}
                  />
                )}
              />
            }
          />
          <HelperText type="error" visible={!!errors.postal_code}>
            {errors.postal_code}
          </HelperText>
        </View>
      </ScrollView>
    </FormModal>
  );
};

const styles = StyleSheet.create({
  formContainer: { gap: 4 },
  inputContainer: { marginBottom: 12 },
  row: { flexDirection: "row", gap: 16 },
  halfWidth: { flex: 1 },
});

export default ContactForm;
