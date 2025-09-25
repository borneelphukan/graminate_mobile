import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  Appbar,
  Button,
  HelperText,
  Modal,
  Portal,
  Surface,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";

export type ApiaryFormData = {
  apiary_name: string;
  number_of_hives: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  postal_code: string;
  area: string;
};

type ApicultureFormProps = {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: (data: ApiaryFormData) => Promise<void>;
  apiaryToEdit?: { [key: string]: any } | null;
  formTitle?: string;
};

type ApiaryFormErrors = {
  apiary_name?: string;
  number_of_hives?: string;
  area?: string;
};

const ApicultureForm = ({
  isVisible,
  onClose,
  onSubmit,
  apiaryToEdit,
  formTitle,
}: ApicultureFormProps) => {
  const theme = useTheme();
  const [formData, setFormData] = useState<ApiaryFormData>({
    apiary_name: "",
    number_of_hives: "",
    address_line_1: "",
    address_line_2: "",
    city: "",
    state: "",
    postal_code: "",
    area: "",
  });
  const [errors, setErrors] = useState<ApiaryFormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isVisible) {
      if (apiaryToEdit) {
        setFormData({
          apiary_name: apiaryToEdit.apiary_name || "",
          number_of_hives: String(apiaryToEdit.number_of_hives || ""),
          address_line_1: apiaryToEdit.address_line_1 || "",
          address_line_2: apiaryToEdit.address_line_2 || "",
          city: apiaryToEdit.city || "",
          state: apiaryToEdit.state || "",
          postal_code: apiaryToEdit.postal_code || "",
          area: apiaryToEdit.area != null ? String(apiaryToEdit.area) : "",
        });
      } else {
        setFormData({
          apiary_name: "",
          number_of_hives: "",
          address_line_1: "",
          address_line_2: "",
          city: "",
          state: "",
          postal_code: "",
          area: "",
        });
      }
      setErrors({});
    }
  }, [apiaryToEdit, isVisible]);

  const handleInputChange = (name: keyof ApiaryFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof ApiaryFormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = useCallback(() => {
    const newErrors: ApiaryFormErrors = {};
    if (!formData.apiary_name.trim())
      newErrors.apiary_name = "Bee yard name is required.";
    if (!formData.number_of_hives.trim())
      newErrors.number_of_hives = "Number of hives is required.";
    else if (
      !/^\d+$/.test(formData.number_of_hives) ||
      Number(formData.number_of_hives) <= 0
    ) {
      newErrors.number_of_hives = "Must be a positive whole number.";
    }
    if (
      formData.area.trim() !== "" &&
      (isNaN(Number(formData.area)) || Number(formData.area) < 0)
    ) {
      newErrors.area = "Area must be a non-negative number.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error("Submission failed in form:", error);
      setErrors({ apiary_name: "Failed to save bee yard. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const renderInputField = (
    label: string,
    name: keyof ApiaryFormData,
    isOptional = false,
    keyboardType: "default" | "numeric" = "default"
  ) => {
    const error = errors[name as keyof ApiaryFormErrors];
    return (
      <View>
        <TextInput
          label={isOptional ? `${label} (Optional)` : label}
          value={formData[name]}
          onChangeText={(text) => handleInputChange(name, text)}
          keyboardType={keyboardType}
          mode="outlined"
          error={!!error}
        />
        <HelperText type="error" visible={!!error}>
          {error}
        </HelperText>
      </View>
    );
  };

  return (
    <Portal>
      <Modal
        visible={isVisible}
        onDismiss={onClose}
        contentContainerStyle={styles.modalContainer}
      >
        <Surface style={styles.surface}>
          <Appbar.Header elevated>
            <Appbar.Content
              title={
                formTitle || (apiaryToEdit ? "Edit Bee Yard" : "Add Bee Yard")
              }
            />
            <Appbar.Action icon="close" onPress={onClose} />
          </Appbar.Header>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <HelperText
              type="error"
              visible={!!errors.apiary_name && !formData.apiary_name.trim()}
            >
              {errors.apiary_name}
            </HelperText>
            {renderInputField("Bee Yard Name", "apiary_name")}
            {renderInputField(
              "Number of Hives",
              "number_of_hives",
              false,
              "numeric"
            )}
            {renderInputField("Address Line 1", "address_line_1", true)}
            {renderInputField("Address Line 2", "address_line_2", true)}
            <View style={styles.row}>
              <View style={styles.halfWidth}>
                {renderInputField("City", "city", true)}
              </View>
              <View style={styles.halfWidth}>
                {renderInputField("State", "state", true)}
              </View>
            </View>
            {renderInputField("Postal Code", "postal_code", true, "numeric")}
            {renderInputField("Area (m²)", "area", true, "numeric")}

            <View style={styles.footer}>
              <Button onPress={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleSubmit}
                loading={isLoading}
                disabled={isLoading}
              >
                {apiaryToEdit ? "Update" : "Add"}
              </Button>
            </View>
          </ScrollView>
        </Surface>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: { justifyContent: "flex-end" },
  surface: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "90%",
  },
  scrollContent: { padding: 16 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 16 },
  halfWidth: { flex: 1 },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 16,
  },
});

export default ApicultureForm;
