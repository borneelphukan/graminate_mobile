import axiosInstance from "@/lib/axiosInstance";
import React, { useEffect, useState } from "react";
import { Alert, FlatList, ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Checkbox,
  HelperText,
  List,
  Menu,
  Surface,
  TextInput,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import { FormModal } from "../../modals/FormModal";

export const UNITS = [
  "kg",
  "g",
  "liters",
  "ml",
  "units",
  "packets",
  "boxes",
  "bottles",
  "cans",
  "bags",
  "rolls",
  "meters",
  "feet",
];

export type InventoryFormData = {
  itemName: string;
  itemGroup: string;
  units: string;
  quantity: string;
  pricePerUnit: string;
  minimumLimit: string;
  feed: boolean;
};

type InventoryFormProps = {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: (data: InventoryFormData) => Promise<void>;
  formTitle?: string;
  userId?: string;
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

const InventoryForm = ({
  isVisible,
  onClose,
  onSubmit,
  formTitle = "Add New Item",
  userId,
}: InventoryFormProps) => {
  const theme = useTheme();
  const [formData, setFormData] = useState<InventoryFormData>({
    itemName: "",
    itemGroup: "",
    units: "",
    quantity: "",
    pricePerUnit: "",
    minimumLimit: "",
    feed: false,
  });
  const [errors, setErrors] = useState<Partial<InventoryFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subTypes, setSubTypes] = useState<string[]>([]);
  const [isLoadingSubTypes, setIsLoadingSubTypes] = useState(true);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const fetchUserSubTypes = async () => {
      if (!userId) {
        setIsLoadingSubTypes(false);
        setSubTypes([]);
        return;
      }
      setIsLoadingSubTypes(true);
      try {
        const response = await axiosInstance.get(`/user/${userId}`);
        const user = response.data?.data?.user ?? response.data?.user;
        setSubTypes(Array.isArray(user?.sub_type) ? user.sub_type : []);
      } catch (err) {
        setSubTypes([]);
      } finally {
        setIsLoadingSubTypes(false);
      }
    };
    if (isVisible) {
      fetchUserSubTypes();
    }
  }, [userId, isVisible]);

  const handleInputChange = (
    field: keyof InventoryFormData,
    value: string | boolean
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = () => {
    const newErrors: Partial<InventoryFormData> = {};
    if (!formData.itemName.trim())
      newErrors.itemName = "Item Name is required.";
    if (!formData.itemGroup.trim())
      newErrors.itemGroup = "Item Occupation is required.";
    if (!formData.units) newErrors.units = "Units are required.";
    if (!formData.quantity.trim()) newErrors.quantity = "Quantity is required.";
    else if (isNaN(Number(formData.quantity)) || Number(formData.quantity) < 0)
      newErrors.quantity = "Enter a valid, non-negative quantity.";
    if (!formData.pricePerUnit.trim())
      newErrors.pricePerUnit = "Price is required.";
    else if (
      isNaN(Number(formData.pricePerUnit)) ||
      Number(formData.pricePerUnit) < 0
    )
      newErrors.pricePerUnit = "Enter a valid, non-negative price.";
    if (
      formData.minimumLimit.trim() &&
      (isNaN(Number(formData.minimumLimit)) ||
        Number(formData.minimumLimit) < 0)
    )
      newErrors.minimumLimit = "Enter a valid, non-negative limit.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert("Validation Error", "Please fill required fields correctly.");
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      setFormData({
        itemName: "",
        itemGroup: "",
        units: "",
        quantity: "",
        pricePerUnit: "",
        minimumLimit: "",
        feed: false,
      });
      onClose();
    } catch (error) {
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleItemGroupChange = (text: string) => {
    handleInputChange("itemGroup", text);
    if (text.length > 0) {
      setSuggestions(
        subTypes.filter((s) => s.toLowerCase().includes(text.toLowerCase()))
      );
    } else {
      setSuggestions(subTypes);
    }
    setShowSuggestions(true);
  };

  const selectSuggestion = (suggestion: string) => {
    handleInputChange("itemGroup", suggestion);
    setShowSuggestions(false);
  };

  return (
    <FormModal
      isVisible={isVisible}
      onClose={onClose}
      title={formTitle}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      submitButtonText="Add Item"
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formContainer}>
          <TextInput
            mode="outlined"
            label="Item Name"
            placeholder="e.g. Premium Arabica Beans"
            value={formData.itemName}
            onChangeText={(text) => handleInputChange("itemName", text)}
            error={!!errors.itemName}
          />
          <HelperText type="error" visible={!!errors.itemName}>
            {errors.itemName}
          </HelperText>

          {formData.itemName.trim().length > 0 && (
            <Checkbox.Item
              label="Is this a Feed?"
              status={formData.feed ? "checked" : "unchecked"}
              onPress={() => handleInputChange("feed", !formData.feed)}
              mode="android"
            />
          )}

          <View style={styles.suggestionsContainer}>
            <TextInput
              mode="outlined"
              label="Item Occupation"
              placeholder="e.g. Raw Coffee, Packaging"
              value={formData.itemGroup}
              onChangeText={handleItemGroupChange}
              onFocus={() => {
                setSuggestions(subTypes);
                setShowSuggestions(true);
              }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              error={!!errors.itemGroup}
            />
            {showSuggestions && (
              <Surface
                style={[
                  styles.suggestionsSurface,
                  { backgroundColor: theme.colors.elevation.level2 },
                ]}
                elevation={3}
              >
                {isLoadingSubTypes ? (
                  <ActivityIndicator style={styles.loader} />
                ) : (
                  <FlatList
                    data={suggestions}
                    keyExtractor={(item, index) => `${item}-${index}`}
                    renderItem={({ item }) => (
                      <List.Item
                        title={item}
                        onPress={() => selectSuggestion(item)}
                      />
                    )}
                    ListEmptyComponent={
                      <List.Item title="No categories found." />
                    }
                    keyboardShouldPersistTaps="handled"
                  />
                )}
              </Surface>
            )}
          </View>
          <HelperText type="error" visible={!!errors.itemGroup}>
            {errors.itemGroup}
          </HelperText>

          <PaperFormDropdown
            label="Units"
            items={UNITS}
            selectedValue={formData.units}
            onSelect={(value: string) => handleInputChange("units", value)}
            error={errors.units}
          />

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <TextInput
                mode="outlined"
                label="Quantity"
                placeholder="e.g. 100"
                value={formData.quantity}
                onChangeText={(text) => handleInputChange("quantity", text)}
                error={!!errors.quantity}
                keyboardType="numeric"
              />
              <HelperText type="error" visible={!!errors.quantity}>
                {errors.quantity}
              </HelperText>
            </View>
            <View style={styles.halfWidth}>
              <TextInput
                mode="outlined"
                label="Price Per Unit"
                placeholder="e.g. 25.50"
                value={formData.pricePerUnit}
                onChangeText={(text) => handleInputChange("pricePerUnit", text)}
                error={!!errors.pricePerUnit}
                keyboardType="numeric"
              />
              <HelperText type="error" visible={!!errors.pricePerUnit}>
                {errors.pricePerUnit}
              </HelperText>
            </View>
          </View>

          <TextInput
            mode="outlined"
            label="Minimum Stock Limit (Optional)"
            placeholder="e.g. 10"
            value={formData.minimumLimit}
            onChangeText={(text) => handleInputChange("minimumLimit", text)}
            error={!!errors.minimumLimit}
            keyboardType="numeric"
          />
          <HelperText type="error" visible={!!errors.minimumLimit}>
            {errors.minimumLimit}
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
  suggestionsContainer: { zIndex: 10 },
  suggestionsSurface: {
    position: "absolute",
    top: 60,
    width: "100%",
    borderRadius: 4,
    maxHeight: 180,
  },
  loader: { padding: 16 },
});

export default InventoryForm;
