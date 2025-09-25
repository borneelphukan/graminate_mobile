import axiosInstance from "@/lib/axiosInstance";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Divider,
  HelperText,
  IconButton,
  Menu,
  Modal,
  Portal,
  TextInput,
  TouchableRipple,
  useTheme,
} from "react-native-paper";

export const UNITS = [
  "kg",
  "grams (g)",
  "quintal",
  "ton",
  "lbs",
  "bag",
  "crate",
  "box",
  "sack",
  "bale",
  "bundle",
  "liter",
  "ml",
  "bottle",
  "can",
  "drum",
  "packet",
  "tin",
  "sachet",
  "unit",
  "set",
  "piece",
  "kit",
  "pair",
  "gallon",
  "barrel",
  "tank",
  "roll",
  "carton",
  "strip",
];

type FeedRecord = {
  feed_id?: number;
  feed_date: string;
  feed_given: string;
  amount_given: number | string;
  units: string;
};

type ItemRecord = {
  inventory_id: number;
  item_name: string;
  units: string;
  quantity: number;
  feed?: boolean;
};

type PoultryFeedsModalProps = {
  isVisible: boolean;
  onClose: () => void;
  formTitle: string;
  flockId: number;
  userId: number;
  feedRecordToEdit?: FeedRecord | null;
  onRecordSaved: () => void;
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

const PoultryFeedsModal = ({
  isVisible,
  onClose,
  formTitle,
  flockId,
  userId,
  feedRecordToEdit,
  onRecordSaved,
}: PoultryFeedsModalProps) => {
  const theme = useTheme();
  const [feedDate, setFeedDate] = useState("");
  const [feedGiven, setFeedGiven] = useState("");
  const [amountGiven, setAmountGiven] = useState<number | string>("");
  const [units, setUnits] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errors, setErrors] = useState<
    Partial<Record<keyof FeedRecord, string>>
  >({});
  const [inventoryFeedObjects, setInventoryFeedObjects] = useState<
    ItemRecord[]
  >([]);
  const [loadingInventory, setLoadingInventory] = useState(false);

  const resetForm = useCallback(() => {
    setFeedDate(new Date().toISOString().split("T")[0]);
    setFeedGiven("");
    setAmountGiven("");
    setUnits("");
    setErrors({});
  }, []);

  const fetchFeedInventoryItems = useCallback(async () => {
    if (!userId) return;
    setLoadingInventory(true);
    try {
      const response = await axiosInstance.get<{ items: ItemRecord[] }>(
        `/inventory/${userId}`,
        { params: { item_group: "Poultry" } }
      );
      setInventoryFeedObjects(
        (response.data.items || []).filter((item) => item.feed === true)
      );
    } catch (error) {
      setInventoryFeedObjects([]);
    } finally {
      setLoadingInventory(false);
    }
  }, [userId]);

  useEffect(() => {
    if (isVisible) {
      fetchFeedInventoryItems();
      if (feedRecordToEdit) {
        setFeedDate(
          feedRecordToEdit.feed_date
            ? new Date(feedRecordToEdit.feed_date).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0]
        );
        setFeedGiven(feedRecordToEdit.feed_given ?? "");
        setAmountGiven(feedRecordToEdit.amount_given?.toString() ?? "");
        setUnits(feedRecordToEdit.units ?? "");
      } else {
        resetForm();
      }
    }
  }, [feedRecordToEdit, isVisible, fetchFeedInventoryItems, resetForm]);

  const handleFeedGivenSelect = (selectedItemName: string) => {
    setFeedGiven(selectedItemName);
    const selectedItemObject = inventoryFeedObjects.find(
      (item) => item.item_name === selectedItemName
    );
    if (selectedItemObject) setUnits(selectedItemObject.units);
    if (errors.feed_given)
      setErrors((prev) => ({ ...prev, feed_given: undefined }));
  };

  const validateForm = () => {
    const newErrors: Partial<Record<keyof FeedRecord, string>> = {};
    if (!feedDate) newErrors.feed_date = "Feed date is required";
    if (!feedGiven.trim()) newErrors.feed_given = "Feed name is required";
    const numAmount = Number(amountGiven);
    if (amountGiven === "" || isNaN(numAmount) || numAmount <= 0)
      newErrors.amount_given = "Amount must be a positive number";
    if (!units) newErrors.units = "Unit is required";
    if (!feedRecordToEdit && feedGiven.trim() && numAmount > 0) {
      const selectedItem = inventoryFeedObjects.find(
        (item) => item.item_name === feedGiven
      );
      if (selectedItem && selectedItem.quantity < numAmount)
        newErrors.amount_given = `Insufficient stock. Available: ${selectedItem.quantity} ${selectedItem.units}`;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    const payload = {
      user_id: userId,
      flock_id: flockId,
      feed_date: feedDate,
      feed_given: feedGiven,
      amount_given: Number(amountGiven),
      units,
    };
    try {
      if (feedRecordToEdit?.feed_id) {
        await axiosInstance.put(
          `/poultry-feeds/update/${feedRecordToEdit.feed_id}`,
          payload
        );
      } else {
        await axiosInstance.post("/poultry-feeds/add", payload);
        const selectedItem = inventoryFeedObjects.find(
          (item) => item.item_name === payload.feed_given
        );
        if (selectedItem) {
          await axiosInstance.put(
            `/inventory/update/${selectedItem.inventory_id}`,
            {
              ...selectedItem,
              quantity: selectedItem.quantity - payload.amount_given,
            }
          );
        }
      }
      onRecordSaved();
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to save feed record."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!feedRecordToEdit?.feed_id) return;
    setIsDeleting(true);
    try {
      await axiosInstance.delete(
        `/poultry-feeds/delete/${feedRecordToEdit.feed_id}`
      );
      onRecordSaved();
      onClose();
      Alert.alert("Success", "Feed record deleted successfully!");
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to delete feed record."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Portal>
      <Modal
        visible={isVisible}
        onDismiss={onClose}
        contentContainerStyle={styles.modalContent}
      >
        <Card>
          <Card.Title
            title={formTitle}
            titleVariant="titleLarge"
            right={(props) => (
              <IconButton {...props} icon="close" onPress={onClose} />
            )}
          />
          <Divider />
          <Card.Content>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={styles.formContainer}>
                <TextInput
                  mode="outlined"
                  label="Feed Date"
                  value={feedDate}
                  onChangeText={setFeedDate}
                  error={!!errors.feed_date}
                  right={<TextInput.Icon icon="calendar" />}
                />
                <HelperText type="error" visible={!!errors.feed_date}>
                  {errors.feed_date}
                </HelperText>

                {loadingInventory ? (
                  <ActivityIndicator style={styles.loader} />
                ) : (
                  <PaperFormDropdown
                    label="Feed Given"
                    items={inventoryFeedObjects.map((item) => item.item_name)}
                    selectedValue={feedGiven}
                    onSelect={handleFeedGivenSelect}
                    placeholder="Select a feed"
                    error={errors.feed_given}
                  />
                )}

                <View style={styles.row}>
                  <View style={styles.halfWidth}>
                    <TextInput
                      mode="outlined"
                      label="Amount Given"
                      value={String(amountGiven)}
                      onChangeText={setAmountGiven}
                      placeholder="e.g., 10.5"
                      keyboardType="numeric"
                      error={!!errors.amount_given}
                    />
                    <HelperText type="error" visible={!!errors.amount_given}>
                      {errors.amount_given}
                    </HelperText>
                  </View>
                  <View style={styles.halfWidth}>
                    <PaperFormDropdown
                      label="Unit"
                      items={UNITS}
                      selectedValue={units}
                      onSelect={(val: string) => setUnits(val)}
                      placeholder="Select unit"
                      error={errors.units}
                    />
                  </View>
                </View>
              </View>
            </ScrollView>
          </Card.Content>
          <Divider />
          <Card.Actions style={styles.actions}>
            {feedRecordToEdit && (
              <Button
                onPress={handleDelete}
                textColor={theme.colors.error}
                disabled={isSubmitting || isDeleting}
                loading={isDeleting}
              >
                Delete
              </Button>
            )}
            <View style={styles.rightActions}>
              <Button onPress={onClose} disabled={isSubmitting || isDeleting}>
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleSubmit}
                loading={isSubmitting}
                disabled={isSubmitting || isDeleting || loadingInventory}
              >
                {feedRecordToEdit ? "Update" : "Add"}
              </Button>
            </View>
          </Card.Actions>
        </Card>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContent: { margin: 20, maxHeight: "90%" },
  formContainer: { gap: 4, paddingVertical: 16 },
  loader: { marginVertical: 20 },
  inputContainerFull: { marginBottom: 12 },
  row: { flexDirection: "row", gap: 16 },
  halfWidth: { flex: 1 },
  actions: { justifyContent: "space-between", padding: 16 },
  rightActions: { flexDirection: "row", gap: 8 },
});

export default PoultryFeedsModal;
