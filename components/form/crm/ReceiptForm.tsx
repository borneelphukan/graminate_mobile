import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, ScrollView, StyleSheet, View } from "react-native";
import { Calendar, DateData } from "react-native-calendars";
import {
  ActivityIndicator,
  Button,
  Card,
  Divider,
  HelperText,
  IconButton,
  List,
  Modal,
  Portal,
  Surface,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import { FormModal } from "../../modals/FormModal";

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const api = axios.create({ baseURL: API_URL });

type Item = { description: string; quantity: string; rate: string };
const initialItem: Item = { description: "", quantity: "1", rate: "0" };

export type ReceiptFormData = {
  title: string;
  receiptNumber: string;
  billTo: string;
  dueDate: string;
  paymentTerms: string;
  notes: string;
  tax: string;
  discount: string;
  shipping: string;
  items: Item[];
  linked_sale_id: number | null;
};

type SaleRecordForDropdown = {
  sales_id: number;
  sales_name?: string;
  sales_date: string;
  items_sold: string[];
  occupation?: string;
  invoice_created: boolean;
  prices_per_unit?: number[];
};

type ReceiptFormProps = {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: (data: ReceiptFormData) => Promise<void>;
  user_id: string | undefined | null;
};

const ReceiptForm = ({
  isVisible,
  onClose,
  onSubmit,
  user_id,
}: ReceiptFormProps) => {
  const theme = useTheme();
  const [formData, setFormData] = useState<ReceiptFormData>({
    title: "",
    receiptNumber: "",
    billTo: "",
    dueDate: "",
    paymentTerms: "",
    notes: "",
    tax: "0",
    discount: "0",
    shipping: "0",
    items: [initialItem],
    linked_sale_id: null,
  });
  const [errors, setErrors] = useState<Partial<ReceiptFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [allSales, setAllSales] = useState<SaleRecordForDropdown[]>([]);
  const [isLoadingSales, setIsLoadingSales] = useState(false);
  const [isSalesDropdownVisible, setSalesDropdownVisible] = useState(false);

  useEffect(() => {
    if (!isVisible || !user_id) {
      setAllSales([]);
      return;
    }
    const fetchSales = async () => {
      setIsLoadingSales(true);
      try {
        const token = await AsyncStorage.getItem("accessToken");
        if (!token) throw new Error("Authentication token not found.");
        const response = await api.get<{ sales: SaleRecordForDropdown[] }>(
          `/sales/user/${user_id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setAllSales(response.data.sales || []);
      } catch (error) {
        console.error("Failed to load sales data:", error);
        Alert.alert("Error", "Could not load sales data for linking.");
      } finally {
        setIsLoadingSales(false);
      }
    };
    fetchSales();
  }, [isVisible, user_id]);

  const handleInputChange = (field: keyof ReceiptFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof ReceiptFormData])
      setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleItemChange = (
    index: number,
    field: keyof Item,
    value: string
  ) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    handleInputChange("items", newItems);
  };

  const addItem = () =>
    handleInputChange("items", [...formData.items, initialItem]);
  const removeItem = (index: number) =>
    handleInputChange(
      "items",
      formData.items.filter((_, i) => i !== index)
    );

  const handleSaleSelection = (saleId: number | null) => {
    setSalesDropdownVisible(false);
    if (!saleId) {
      handleInputChange("linked_sale_id", null);
      handleInputChange("title", "");
      handleInputChange("billTo", "");
      handleInputChange("items", [initialItem]);
      return;
    }
    const sale = allSales.find((s) => s.sales_id === saleId);
    if (sale) {
      if (sale.invoice_created)
        Alert.alert(
          "Warning",
          "This sale already has an invoice linked. Proceed with caution."
        );
      const saleTitle = sale.sales_name
        ? `Invoice for ${sale.sales_name}`
        : `Invoice for Sale #${sale.sales_id}`;
      const billToName = sale.occupation || "Customer";
      const itemsFromSale = sale.items_sold.map((desc, i) => ({
        description: desc,
        quantity: "1",
        rate: String(sale.prices_per_unit?.[i] || 0),
      }));
      setFormData((prev) => ({
        ...prev,
        linked_sale_id: sale.sales_id,
        title: saleTitle,
        billTo: billToName,
        items: itemsFromSale.length > 0 ? itemsFromSale : [initialItem],
      }));
    }
  };

  const showDatePicker = () => setDatePickerVisible(true);
  const handleDayPress = (day: DateData) => {
    handleInputChange("dueDate", day.dateString);
    setDatePickerVisible(false);
  };

  const { subtotal, total } = useMemo(() => {
    const sub = formData.items.reduce(
      (acc, item) =>
        acc + (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0),
      0
    );
    const taxAmount = sub * (parseFloat(formData.tax) / 100 || 0);
    const discountAmount = parseFloat(formData.discount) || 0;
    const shippingAmount = parseFloat(formData.shipping) || 0;
    const tot = sub + taxAmount - discountAmount + shippingAmount;
    return { subtotal: sub, total: tot };
  }, [formData.items, formData.tax, formData.discount, formData.shipping]);

  const selectedSaleDisplay = useMemo(() => {
    if (!formData.linked_sale_id) return "None (No Linked Sale)";
    const sale = allSales.find((s) => s.sales_id === formData.linked_sale_id);
    return sale?.sales_name || `Sale #${formData.linked_sale_id}`;
  }, [formData.linked_sale_id, allSales]);

  const validateForm = () => {
    const newErrors: Partial<ReceiptFormData> = {};
    if (!formData.title.trim()) newErrors.title = "Invoice Title is required.";
    if (!formData.billTo.trim()) newErrors.billTo = "Bill To is required.";
    if (!formData.dueDate.trim()) newErrors.dueDate = "Due Date is required.";
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
    <>
      <FormModal
        isVisible={isVisible}
        onClose={onClose}
        title="Add New Receipt"
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitButtonText="Save Receipt"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TextInput
            mode="outlined"
            label="Invoice Title"
            placeholder="e.g. Services Rendered"
            value={formData.title}
            onChangeText={(text) => handleInputChange("title", text)}
            error={!!errors.title}
          />
          <HelperText type="error" visible={!!errors.title}>
            {errors.title}
          </HelperText>
          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <TextInput
                mode="outlined"
                label="Bill To"
                placeholder="Customer Name"
                value={formData.billTo}
                onChangeText={(text) => handleInputChange("billTo", text)}
                error={!!errors.billTo}
              />
              <HelperText type="error" visible={!!errors.billTo}>
                {errors.billTo}
              </HelperText>
            </View>
            <View style={styles.halfWidth}>
              <TouchableRipple onPress={showDatePicker}>
                <TextInput
                  mode="outlined"
                  label="Due Date"
                  value={formData.dueDate}
                  placeholder="Select due date"
                  editable={false}
                  pointerEvents="none"
                  right={<TextInput.Icon icon="calendar" />}
                  error={!!errors.dueDate}
                />
              </TouchableRipple>
              <HelperText type="error" visible={!!errors.dueDate}>
                {errors.dueDate}
              </HelperText>
            </View>
          </View>

          <TouchableRipple
            onPress={() => setSalesDropdownVisible(true)}
            disabled={isLoadingSales}
          >
            <TextInput
              mode="outlined"
              label="Link to Sale (Optional)"
              value={selectedSaleDisplay}
              editable={false}
              right={
                isLoadingSales ? (
                  <TextInput.Icon icon={() => <ActivityIndicator />} />
                ) : (
                  <TextInput.Icon icon="menu-down" />
                )
              }
            />
          </TouchableRipple>

          <Text variant="titleMedium" style={styles.itemsHeader}>
            Items
          </Text>
          {formData.items.map((item, index) => (
            <Card key={index} style={styles.itemCard} mode="outlined">
              <Card.Title
                title={`Item #${index + 1}`}
                right={(props) =>
                  formData.items.length > 1 ? (
                    <IconButton
                      {...props}
                      icon="delete-outline"
                      onPress={() => removeItem(index)}
                    />
                  ) : null
                }
              />
              <Card.Content style={styles.itemContent}>
                <TextInput
                  mode="outlined"
                  label="Description"
                  value={item.description}
                  onChangeText={(text) =>
                    handleItemChange(index, "description", text)
                  }
                />
                <View style={styles.row}>
                  <TextInput
                    style={styles.itemInput}
                    mode="outlined"
                    label="Qty"
                    keyboardType="numeric"
                    value={item.quantity}
                    onChangeText={(text) =>
                      handleItemChange(index, "quantity", text)
                    }
                  />
                  <TextInput
                    style={styles.itemInput}
                    mode="outlined"
                    label="Rate (₹)"
                    keyboardType="numeric"
                    value={item.rate}
                    onChangeText={(text) =>
                      handleItemChange(index, "rate", text)
                    }
                  />
                  <Surface style={styles.totalSurface} elevation={1}>
                    <Text variant="bodyLarge">
                      ₹
                      {(
                        (parseFloat(item.quantity) || 0) *
                        (parseFloat(item.rate) || 0)
                      ).toFixed(2)}
                    </Text>
                  </Surface>
                </View>
              </Card.Content>
            </Card>
          ))}
          <Button
            icon="plus"
            mode="outlined"
            onPress={addItem}
            style={styles.addItemButton}
          >
            Add Item
          </Button>

          <Divider style={styles.divider} />

          <View style={styles.row}>
            <TextInput
              style={styles.thirdWidth}
              mode="outlined"
              label="Tax (%)"
              placeholder="0"
              value={formData.tax}
              onChangeText={(text) => handleInputChange("tax", text)}
            />
            <TextInput
              style={styles.thirdWidth}
              mode="outlined"
              label="Discount (₹)"
              placeholder="0.00"
              value={formData.discount}
              onChangeText={(text) => handleInputChange("discount", text)}
            />
            <TextInput
              style={styles.thirdWidth}
              mode="outlined"
              label="Shipping (₹)"
              placeholder="0.00"
              value={formData.shipping}
              onChangeText={(text) => handleInputChange("shipping", text)}
            />
          </View>

          <Surface style={styles.summarySurface} elevation={1}>
            <View style={styles.summaryRow}>
              <Text variant="bodyLarge">Subtotal</Text>
              <Text variant="bodyLarge">₹{subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text variant="titleMedium">Total</Text>
              <Text variant="titleMedium">₹{total.toFixed(2)}</Text>
            </View>
          </Surface>
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
              formData.dueDate ? { [formData.dueDate]: { selected: true } } : {}
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
        <Modal
          visible={isSalesDropdownVisible}
          onDismiss={() => setSalesDropdownVisible(false)}
          contentContainerStyle={[
            styles.modalContent,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <List.Section>
            <List.Subheader>Link to a Sale</List.Subheader>
            <FlatList
              data={[
                { sales_id: null, sales_name: "None (No Linked Sale)" },
                ...allSales,
              ]}
              keyExtractor={(item) => String(item.sales_id)}
              renderItem={({ item }) => (
                <List.Item
                  title={item.sales_name || `Sale #${item.sales_id}`}
                  onPress={() =>
                    handleSaleSelection(item.sales_id as number | null)
                  }
                />
              )}
            />
          </List.Section>
        </Modal>
      </Portal>
    </>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 16, marginTop: 12 },
  halfWidth: { flex: 1 },
  thirdWidth: { flex: 1 },
  itemsHeader: { marginTop: 24, marginBottom: 8 },
  itemCard: { marginBottom: 12 },
  itemContent: { gap: 12 },
  itemInput: { flex: 1 },
  totalSurface: {
    flex: 1,
    justifyContent: "center",
    alignItems: "flex-end",
    padding: 8,
    borderRadius: 4,
  },
  addItemButton: { marginTop: 12 },
  divider: { marginVertical: 24 },
  summarySurface: { marginTop: 16, padding: 16, borderRadius: 8 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  modalContent: { margin: 20, borderRadius: 16 },
});

export default ReceiptForm;
