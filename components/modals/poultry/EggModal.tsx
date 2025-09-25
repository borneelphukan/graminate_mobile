import axiosInstance from "@/lib/axiosInstance";
import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
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

type EggRecord = {
  egg_id?: number;
  date_collected: string;
  small_eggs: number;
  medium_eggs: number;
  large_eggs: number;
  extra_large_eggs: number;
  broken_eggs: number;
};

type EggModalProps = {
  isVisible: boolean;
  onClose: () => void;
  formTitle: string;
  flockId: number;
  userId: number;
  eggRecordToEdit?: EggRecord | null;
  onRecordSaved: () => void;
};

const EggModal = ({
  isVisible,
  onClose,
  formTitle,
  flockId,
  userId,
  eggRecordToEdit,
  onRecordSaved,
}: EggModalProps) => {
  const theme = useTheme();
  const [dateCollected, setDateCollected] = useState("");
  const [smallEggs, setSmallEggs] = useState<string>("");
  const [mediumEggs, setMediumEggs] = useState<string>("");
  const [largeEggs, setLargeEggs] = useState<string>("");
  const [extraLargeEggs, setExtraLargeEggs] = useState<string>("");
  const [brokenEggs, setBrokenEggs] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<
    Partial<Record<keyof EggRecord, string>>
  >({});

  const resetForm = () => {
    setDateCollected(new Date().toISOString().split("T")[0]);
    setSmallEggs("");
    setMediumEggs("");
    setLargeEggs("");
    setExtraLargeEggs("");
    setBrokenEggs("");
    setErrors({});
  };

  useEffect(() => {
    if (isVisible) {
      if (eggRecordToEdit) {
        setDateCollected(
          eggRecordToEdit.date_collected
            ? new Date(eggRecordToEdit.date_collected)
                .toISOString()
                .split("T")[0]
            : new Date().toISOString().split("T")[0]
        );
        setSmallEggs(String(eggRecordToEdit.small_eggs ?? ""));
        setMediumEggs(String(eggRecordToEdit.medium_eggs ?? ""));
        setLargeEggs(String(eggRecordToEdit.large_eggs ?? ""));
        setExtraLargeEggs(String(eggRecordToEdit.extra_large_eggs ?? ""));
        setBrokenEggs(String(eggRecordToEdit.broken_eggs ?? ""));
      } else {
        resetForm();
      }
    }
  }, [eggRecordToEdit, isVisible]);

  const validateForm = () => {
    const newErrors: Partial<Record<keyof EggRecord, string>> = {};
    if (!dateCollected) newErrors.date_collected = "Date is required";

    const checkNonNegativeInteger = (
      value: string,
      fieldName: keyof EggRecord
    ) => {
      if (
        value !== "" &&
        (isNaN(Number(value)) ||
          Number(value) < 0 ||
          !Number.isInteger(Number(value)))
      ) {
        newErrors[fieldName] = "Must be a whole number.";
      }
    };

    checkNonNegativeInteger(smallEggs, "small_eggs");
    checkNonNegativeInteger(mediumEggs, "medium_eggs");
    checkNonNegativeInteger(largeEggs, "large_eggs");
    checkNonNegativeInteger(extraLargeEggs, "extra_large_eggs");
    checkNonNegativeInteger(brokenEggs, "broken_eggs");

    if (!smallEggs && !mediumEggs && !largeEggs && !extraLargeEggs) {
      newErrors.small_eggs = "At least one egg size quantity is required.";
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
      date_collected: dateCollected,
      small_eggs: Number(smallEggs) || 0,
      medium_eggs: Number(mediumEggs) || 0,
      large_eggs: Number(largeEggs) || 0,
      extra_large_eggs: Number(extraLargeEggs) || 0,
      broken_eggs: Number(brokenEggs) || 0,
    };

    try {
      if (eggRecordToEdit?.egg_id) {
        await axiosInstance.put(
          `/poultry-eggs/update/${eggRecordToEdit.egg_id}`,
          payload
        );
      } else {
        await axiosInstance.post("/poultry-eggs/add", payload);
      }
      onRecordSaved();
      onClose();
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to save egg record."
      );
    } finally {
      setIsSubmitting(false);
    }
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
            <Appbar.Content title={formTitle} />
            <Appbar.Action icon="close" onPress={onClose} />
          </Appbar.Header>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <TextInput
              label="Date Collected"
              value={dateCollected}
              onChangeText={setDateCollected}
              mode="outlined"
              error={!!errors.date_collected}
            />
            <HelperText type="error" visible={!!errors.date_collected}>
              {errors.date_collected}
            </HelperText>

            <Text variant="titleMedium" style={styles.subHeader}>
              Egg Counts
            </Text>

            <TextInput
              label="Small Eggs"
              value={smallEggs}
              onChangeText={setSmallEggs}
              placeholder="e.g., 10"
              keyboardType="number-pad"
              mode="outlined"
              error={!!errors.small_eggs}
            />
            <HelperText type="error" visible={!!errors.small_eggs}>
              {errors.small_eggs}
            </HelperText>

            <TextInput
              label="Medium Eggs"
              value={mediumEggs}
              onChangeText={setMediumEggs}
              placeholder="e.g., 20"
              keyboardType="number-pad"
              mode="outlined"
              error={!!errors.medium_eggs}
            />
            <HelperText type="error" visible={!!errors.medium_eggs}>
              {errors.medium_eggs}
            </HelperText>

            <TextInput
              label="Large Eggs"
              value={largeEggs}
              onChangeText={setLargeEggs}
              placeholder="e.g., 15"
              keyboardType="number-pad"
              mode="outlined"
              error={!!errors.large_eggs}
            />
            <HelperText type="error" visible={!!errors.large_eggs}>
              {errors.large_eggs}
            </HelperText>

            <TextInput
              label="Extra Large Eggs"
              value={extraLargeEggs}
              onChangeText={setExtraLargeEggs}
              placeholder="e.g., 5"
              keyboardType="number-pad"
              mode="outlined"
              error={!!errors.extra_large_eggs}
            />
            <HelperText type="error" visible={!!errors.extra_large_eggs}>
              {errors.extra_large_eggs}
            </HelperText>

            <TextInput
              label="Broken Eggs"
              value={brokenEggs}
              onChangeText={setBrokenEggs}
              placeholder="e.g., 2"
              keyboardType="number-pad"
              mode="outlined"
              error={!!errors.broken_eggs}
            />
            <HelperText type="error" visible={!!errors.broken_eggs}>
              {errors.broken_eggs}
            </HelperText>
          </ScrollView>
          <View
            style={[
              styles.footer,
              { borderTopColor: theme.colors.outlineVariant },
            ]}
          >
            <Button onPress={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              {eggRecordToEdit ? "Update" : "Add"}
            </Button>
          </View>
        </Surface>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: { justifyContent: "center", alignItems: "center" },
  surface: {
    width: "90%",
    maxHeight: "90%",
    borderRadius: 16,
    overflow: "hidden",
  },
  scrollContent: { padding: 16 },
  subHeader: { marginTop: 16, marginBottom: 8 },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    padding: 16,
    borderTopWidth: 1,
  },
});

export default EggModal;
