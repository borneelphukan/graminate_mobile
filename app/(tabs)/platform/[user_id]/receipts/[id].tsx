import PlatformLayout from "@/components/layout/PlatformLayout";
import {
  faArrowLeft,
  faBoxesPacking,
  faCalendarAlt,
  faCalendarDay,
  faEllipsisV,
  faFileContract,
  faFileInvoice,
  faHashtag,
  faIndianRupeeSign,
  faPen,
  faPercent,
  faPlus,
  faSave,
  faShareAlt,
  faTag,
  faTimes,
  faTrashAlt,
  faTruck,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from "react-native";
import { Calendar, DateData } from "react-native-calendars";
import {
  ActivityIndicator,
  Appbar,
  Button,
  Card,
  Divider,
  IconButton,
  Menu,
  Modal,
  Portal,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from "react-native-paper";

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const api = axios.create({ baseURL: API_URL });

type ApiItem = { description: string; quantity: number; rate: number };
type Receipt = {
  invoice_id: number;
  title: string;
  receipt_number: string | null;
  bill_to: string;
  due_date: string;
  receipt_date: string;
  payment_terms: string | null;
  notes: string | null;
  tax: number;
  discount: number;
  shipping: number;
  items: ApiItem[];
};
type FormItem = { description: string; quantity: string; rate: string };
type Form = {
  title: string;
  receiptNumber: string;
  billTo: string;
  dueDate: string;
  paymentTerms: string;
  notes: string;
  tax: string;
  discount: string;
  shipping: string;
  items: FormItem[];
};

const initialFormState: Form = {
  title: "",
  receiptNumber: "",
  billTo: "",
  dueDate: "",
  paymentTerms: "",
  notes: "",
  tax: "0",
  discount: "0",
  shipping: "0",
  items: [{ description: "", quantity: "1", rate: "0" }],
};

const formatDateForInput = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    return date.toISOString().split("T")[0];
  } catch {
    return "";
  }
};

const transformApiItemsToFormItems = (apiItems: ApiItem[]): FormItem[] => {
  if (!apiItems || apiItems.length === 0)
    return [{ description: "", quantity: "1", rate: "0" }];
  return apiItems.map((item) => ({
    description: item.description || "",
    quantity: String(item.quantity || 0),
    rate: String(item.rate || 0),
  }));
};

const ReceiptDetails = () => {
  const { user_id, data } = useLocalSearchParams<{
    user_id: string;
    data: string;
  }>();
  const theme = useTheme();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [formData, setFormData] = useState<Form>(initialFormState);
  const [initialFormData, setInitialFormData] =
    useState<Form>(initialFormState);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [isMoreMenuVisible, setMoreMenuVisible] = useState(false);

  useEffect(() => {
    if (data) {
      try {
        const parsedReceipt: Receipt = JSON.parse(data);
        setReceipt(parsedReceipt);
        const formItems = transformApiItemsToFormItems(parsedReceipt.items);
        const newFormValues: Form = {
          title: parsedReceipt.title || "",
          receiptNumber: parsedReceipt.receipt_number || "",
          billTo: parsedReceipt.bill_to || "",
          dueDate: formatDateForInput(parsedReceipt.due_date),
          paymentTerms: parsedReceipt.payment_terms || "",
          notes: parsedReceipt.notes || "",
          tax: String(parsedReceipt.tax || 0),
          discount: String(parsedReceipt.discount || 0),
          shipping: String(parsedReceipt.shipping || 0),
          items: formItems,
        };
        setFormData(newFormValues);
        setInitialFormData(newFormValues);
      } catch (error) {
        Alert.alert("Error", "Invalid receipt data.");
        router.back();
      }
    } else {
      Alert.alert("Error", "No receipt data.");
      router.back();
    }
  }, [data]);

  const handleInputChange = (field: keyof Form, value: any) =>
    setFormData((prev) => ({ ...prev, [field]: value }));
  const handleItemChange = (
    index: number,
    field: keyof FormItem,
    value: string
  ) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    handleInputChange("items", newItems);
  };
  const addItem = () =>
    handleInputChange("items", [
      ...formData.items,
      { description: "", quantity: "1", rate: "0" },
    ]);
  const removeItem = (index: number) => {
    if (formData.items.length > 1)
      handleInputChange(
        "items",
        formData.items.filter((_, i) => i !== index)
      );
  };
  const hasChanges = useMemo(
    () => JSON.stringify(formData) !== JSON.stringify(initialFormData),
    [formData, initialFormData]
  );

  const { subtotal, total } = useMemo(() => {
    const sub = formData.items.reduce(
      (acc, item) =>
        acc + (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0),
      0
    );
    const taxAmount = sub * (parseFloat(formData.tax) / 100 || 0);
    const discountAmount = parseFloat(formData.discount) || 0;
    const shippingAmount = parseFloat(formData.shipping) || 0;
    return {
      subtotal: sub,
      total: sub + taxAmount - discountAmount + shippingAmount,
    };
  }, [formData.items, formData.tax, formData.discount, formData.shipping]);

  const handleDayPress = (day: DateData) => {
    handleInputChange("dueDate", day.dateString);
    setDatePickerVisible(false);
  };

  const handleSave = async () => {
    if (!receipt) return;
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem("accessToken");
      const payload = {
        invoice_id: receipt.invoice_id,
        title: formData.title,
        receipt_number: formData.receiptNumber || null,
        bill_to: formData.billTo,
        due_date: formData.dueDate || null,
        payment_terms: formData.paymentTerms || null,
        notes: formData.notes || null,
        tax: parseFloat(formData.tax) || 0,
        discount: parseFloat(formData.discount) || 0,
        shipping: parseFloat(formData.shipping) || 0,
        items: formData.items
          .map(({ description, quantity, rate }) => ({
            description,
            quantity: Number(quantity) || 0,
            rate: Number(rate) || 0,
          }))
          .filter(
            (item) => item.description.trim() !== "" && item.quantity > 0
          ),
      };
      await api.put("/receipts/update", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      Alert.alert("Success", "Receipt updated successfully.");
      router.replace(
        `/platform/${user_id}/crm?view=receipts&refresh=${new Date().getTime()}`
      );
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to update receipt."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!receipt) return;
    Alert.alert(
      "Delete Receipt",
      `Are you sure you want to delete "${receipt.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              const token = await AsyncStorage.getItem("accessToken");
              await api.delete(`/receipts/delete/${receipt.invoice_id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              Alert.alert("Success", "Receipt deleted.");
              router.replace(
                `/platform/${user_id}/crm?view=receipts&refresh=${new Date().getTime()}`
              );
            } catch (error: any) {
              Alert.alert(
                "Error",
                error.response?.data?.error || "Failed to delete receipt."
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleShare = async () => {
    if (!receipt) return;
    try {
      const message = `
Receipt: ${formData.title}
Billed To: ${formData.billTo}
Total Amount: ₹${total.toFixed(2)}
    `.trim();
      await Share.share({ message });
    } catch (error) {
      Alert.alert("Error", "Failed to share receipt.");
    }
  };

  if (!receipt) {
    return (
      <PlatformLayout>
        <Appbar.Header>
          <Appbar.Action
            icon={() => (
              <FontAwesomeIcon
                icon={faArrowLeft}
                size={22}
                color={theme.colors.onSurface}
              />
            )}
            onPress={() => router.back()}
          />
          <Appbar.Content title="Loading..." />
        </Appbar.Header>
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      </PlatformLayout>
    );
  }

  return (
    <PlatformLayout>
      <Appbar.Header>
        <Appbar.Action
          icon={() => (
            <FontAwesomeIcon
              icon={faArrowLeft}
              size={22}
              color={theme.colors.onSurface}
            />
          )}
          onPress={() => router.back()}
        />
        <Appbar.Content title="Receipt Details" />
        <Menu
          visible={isMoreMenuVisible}
          onDismiss={() => setMoreMenuVisible(false)}
          anchor={
            <Appbar.Action
              icon={() => (
                <FontAwesomeIcon
                  icon={faEllipsisV}
                  size={22}
                  color={theme.colors.onSurface}
                />
              )}
              onPress={() => setMoreMenuVisible(true)}
            />
          }
        >
          <Menu.Item
            onPress={() => {
              setMoreMenuVisible(false);
              handleDelete();
            }}
            title="Delete Receipt"
            leadingIcon={() => (
              <FontAwesomeIcon
                icon={faTrashAlt}
                size={20}
                color={theme.colors.error}
              />
            )}
            titleStyle={{ color: theme.colors.error }}
          />
          <Menu.Item
            onPress={() => {
              setMoreMenuVisible(false);
              handleShare();
            }}
            title="Share Receipt"
            leadingIcon={() => (
              <FontAwesomeIcon
                icon={faShareAlt}
                size={20}
                color={theme.colors.onSurfaceVariant}
              />
            )}
          />
        </Menu>
      </Appbar.Header>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <TextInput
            mode="outlined"
            label="Invoice Title"
            value={formData.title}
            onChangeText={(val) => handleInputChange("title", val)}
            left={
              <TextInput.Icon
                icon={() => (
                  <FontAwesomeIcon
                    icon={faFileInvoice}
                    size={18}
                    color={theme.colors.onSurfaceVariant}
                  />
                )}
              />
            }
          />
          <TextInput
            mode="outlined"
            label="Bill To"
            value={formData.billTo}
            onChangeText={(val) => handleInputChange("billTo", val)}
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
          <TouchableRipple onPress={() => setDatePickerVisible(true)}>
            <View pointerEvents="none">
              <TextInput
                mode="outlined"
                label="Due Date"
                value={formData.dueDate}
                editable={false}
                left={
                  <TextInput.Icon
                    icon={() => (
                      <FontAwesomeIcon
                        icon={faCalendarDay}
                        size={18}
                        color={theme.colors.onSurfaceVariant}
                      />
                    )}
                  />
                }
                right={
                  <TextInput.Icon
                    icon={() => (
                      <FontAwesomeIcon
                        icon={faCalendarAlt}
                        size={18}
                        color={theme.colors.onSurfaceVariant}
                      />
                    )}
                  />
                }
              />
            </View>
          </TouchableRipple>
          <TextInput
            mode="outlined"
            label="Invoice Number (Optional)"
            value={formData.receiptNumber}
            onChangeText={(val) => handleInputChange("receiptNumber", val)}
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
          <TextInput
            mode="outlined"
            label="Payment Terms (Optional)"
            value={formData.paymentTerms}
            onChangeText={(val) => handleInputChange("paymentTerms", val)}
            left={
              <TextInput.Icon
                icon={() => (
                  <FontAwesomeIcon
                    icon={faFileContract}
                    size={18}
                    color={theme.colors.onSurfaceVariant}
                  />
                )}
              />
            }
          />
          <Text variant="titleMedium" style={styles.itemsHeader}>
            Items
          </Text>
          {formData.items.map((item, index) => (
            <Card key={index} style={styles.itemCard} mode="outlined">
              <Card.Title
                title={`Item #${index + 1}`}
                right={() =>
                  formData.items.length > 1 ? (
                    <IconButton
                      icon={() => (
                        <FontAwesomeIcon
                          icon={faTrashAlt}
                          size={18}
                          color={theme.colors.error}
                        />
                      )}
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
                  left={
                    <TextInput.Icon
                      icon={() => (
                        <FontAwesomeIcon
                          icon={faPen}
                          size={16}
                          color={theme.colors.onSurfaceVariant}
                        />
                      )}
                    />
                  }
                />
                <View style={styles.row}>
                  <TextInput
                    style={styles.itemInput}
                    mode="outlined"
                    label="Quantity"
                    keyboardType="numeric"
                    value={item.quantity}
                    onChangeText={(text) =>
                      handleItemChange(index, "quantity", text)
                    }
                    left={
                      <TextInput.Icon
                        icon={() => (
                          <FontAwesomeIcon
                            icon={faBoxesPacking}
                            size={16}
                            color={theme.colors.onSurfaceVariant}
                          />
                        )}
                      />
                    }
                  />
                  <TextInput
                    style={styles.itemInput}
                    mode="outlined"
                    label="Rate"
                    keyboardType="numeric"
                    value={item.rate}
                    onChangeText={(text) =>
                      handleItemChange(index, "rate", text)
                    }
                    left={
                      <TextInput.Icon
                        icon={() => (
                          <FontAwesomeIcon
                            icon={faIndianRupeeSign}
                            size={16}
                            color={theme.colors.onSurfaceVariant}
                          />
                        )}
                      />
                    }
                  />
                </View>
              </Card.Content>
            </Card>
          ))}
          <Button
            icon={() => (
              <FontAwesomeIcon
                icon={faPlus}
                size={18}
                color={theme.colors.primary}
              />
            )}
            mode="outlined"
            onPress={addItem}
            style={styles.addItemButton}
          >
            Add Item
          </Button>
          <View style={styles.row}>
            <TextInput
              style={styles.thirdWidth}
              mode="outlined"
              label="Tax"
              keyboardType="numeric"
              value={formData.tax}
              onChangeText={(text) => handleInputChange("tax", text)}
              left={
                <TextInput.Icon
                  icon={() => (
                    <FontAwesomeIcon
                      icon={faPercent}
                      size={16}
                      color={theme.colors.onSurfaceVariant}
                    />
                  )}
                />
              }
            />
            <TextInput
              style={styles.thirdWidth}
              mode="outlined"
              label="Discount"
              keyboardType="numeric"
              value={formData.discount}
              onChangeText={(text) => handleInputChange("discount", text)}
              left={
                <TextInput.Icon
                  icon={() => (
                    <FontAwesomeIcon
                      icon={faTag}
                      size={16}
                      color={theme.colors.onSurfaceVariant}
                    />
                  )}
                />
              }
            />
            <TextInput
              style={styles.thirdWidth}
              mode="outlined"
              label="Shipping"
              keyboardType="numeric"
              value={formData.shipping}
              onChangeText={(text) => handleInputChange("shipping", text)}
              left={
                <TextInput.Icon
                  icon={() => (
                    <FontAwesomeIcon
                      icon={faTruck}
                      size={16}
                      color={theme.colors.onSurfaceVariant}
                    />
                  )}
                />
              }
            />
          </View>
          <Card style={styles.summaryCard}>
            <Card.Content>
              <View style={styles.summaryRow}>
                <Text variant="bodyLarge">Subtotal</Text>
                <Text variant="bodyLarge">₹{subtotal.toFixed(2)}</Text>
              </View>
              <Divider style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text variant="titleMedium">Total</Text>
                <Text variant="titleMedium">₹{total.toFixed(2)}</Text>
              </View>
            </Card.Content>
          </Card>
        </ScrollView>
        <Appbar style={styles.footer}>
          <Button
            style={styles.footerButton}
            mode="outlined"
            onPress={() => router.back()}
            icon={() => (
              <FontAwesomeIcon
                icon={faTimes}
                size={18}
                color={theme.colors.primary}
              />
            )}
          >
            Cancel
          </Button>
          <Button
            style={styles.footerButton}
            mode="contained"
            onPress={handleSave}
            disabled={!hasChanges || saving}
            loading={saving}
            icon={() => (
              <FontAwesomeIcon
                icon={faSave}
                size={18}
                color={
                  !hasChanges || saving
                    ? theme.colors.onSurfaceDisabled
                    : theme.colors.onPrimary
                }
              />
            )}
          >
            Save Changes
          </Button>
        </Appbar>
      </KeyboardAvoidingView>
      <Portal>
        <Modal
          visible={isDatePickerVisible}
          onDismiss={() => setDatePickerVisible(false)}
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
                formData.dueDate
                  ? { [formData.dueDate]: { selected: true } }
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
    </PlatformLayout>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { padding: 16, gap: 16, paddingBottom: 80 },
  row: { flexDirection: "row", gap: 16 },
  thirdWidth: { flex: 1 },
  itemsHeader: { marginTop: 16, marginBottom: 8 },
  itemCard: { marginBottom: 12 },
  itemContent: { gap: 12 },
  itemInput: { flex: 1 },
  addItemButton: { marginTop: 8 },
  summaryCard: { marginTop: 24, elevation: 2 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  summaryDivider: { marginVertical: 8 },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  footerButton: { flex: 1, marginHorizontal: 8 },
  modalContent: { margin: 20, borderRadius: 16, overflow: "hidden" },
});

export default ReceiptDetails;
