import { FormModal } from "@/components/modals/FormModal";
import {
  faCalendarAlt,
  faChevronDown,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { format } from "date-fns";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import {
  Button,
  Card,
  Chip,
  HelperText,
  Menu,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from "react-native-paper";

const PaperFormDropdown = ({
  label,
  items,
  selectedValue,
  onSelect,
  error,
  disabled = false,
}: any) => {
  const [visible, setVisible] = useState(false);
  const theme = useTheme();
  return (
    <View style={styles.inputContainer}>
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
              editable={false}
              pointerEvents="none"
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

export type InspectionData = {
  inspection_id?: number;
  hive_id: number;
  inspection_date: string;
  queen_status?: string;
  queen_introduced_date?: string;
  brood_pattern?: string;
  notes?: string;
  symptoms?: string[];
  population_strength?: string;
  frames_of_brood?: number | null;
  frames_of_nectar_honey?: number | null;
  frames_of_pollen?: number | null;
  room_to_lay?: string;
  queen_cells_observed?: string;
  queen_cells_count?: number | null;
  varroa_mite_method?: string;
  varroa_mite_count?: number | null;
  actions_taken?: string;
};
export type InspectionSubmitData = Omit<
  InspectionData,
  "inspection_id" | "hive_id"
>;

interface InspectionFormProps {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: (data: InspectionSubmitData) => Promise<void>;
  formTitle: string;
  hiveId: number;
  inspectionToEdit?: InspectionData | null;
}

const QUEEN_STATUS_OPTIONS = [
  "Present & Healthy",
  "Absent (No Queen)",
  "Weak (Poor Laying)",
  "Drone-Laying",
  "Virgin (Unmated)",
  "Recently Introduced",
  "Swarmed (Gone)",
];
const BROOD_PATTERN_OPTIONS = [
  "Good (Healthy)",
  "Spotty (Irregular)",
  "Drone-Laying",
  "No Brood (Empty Comb)",
];
const POPULATION_STRENGTH_OPTIONS = ["Booming", "Strong", "Moderate", "Weak"];
const ROOM_TO_LAY_OPTIONS = ["Plenty", "Adequate", "Limited", "None"];
const QUEEN_CELLS_OBSERVED_OPTIONS = ["Yes", "No"];

const InspectionForm = ({
  isVisible,
  onClose,
  onSubmit,
  formTitle,
  inspectionToEdit,
}: InspectionFormProps) => {
  const theme = useTheme();
  const [formData, setFormData] = useState({
    inspection_date: format(new Date(), "yyyy-MM-dd"),
    queen_status: "",
    queen_introduced_date: "",
    brood_pattern: "",
    notes: "",
    symptoms: [] as string[],
    population_strength: "",
    frames_of_brood: "",
    frames_of_nectar_honey: "",
    frames_of_pollen: "",
    room_to_lay: "",
    queen_cells_observed: "",
    queen_cells_count: "",
    varroa_mite_method: "",
    varroa_mite_count: "",
    actions_taken: "",
  });
  const [currentSymptom, setCurrentSymptom] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = useCallback(() => {
    setFormData({
      inspection_date: format(new Date(), "yyyy-MM-dd"),
      queen_status: "",
      queen_introduced_date: "",
      brood_pattern: "",
      notes: "",
      symptoms: [],
      population_strength: "",
      frames_of_brood: "",
      frames_of_nectar_honey: "",
      frames_of_pollen: "",
      room_to_lay: "",
      queen_cells_observed: "",
      queen_cells_count: "",
      varroa_mite_method: "",
      varroa_mite_count: "",
      actions_taken: "",
    });
    setCurrentSymptom("");
  }, []);

  useEffect(() => {
    if (isVisible) {
      if (inspectionToEdit) {
        setFormData({
          inspection_date: format(
            new Date(inspectionToEdit.inspection_date),
            "yyyy-MM-dd"
          ),
          queen_status: inspectionToEdit.queen_status || "",
          queen_introduced_date: inspectionToEdit.queen_introduced_date
            ? format(
                new Date(inspectionToEdit.queen_introduced_date),
                "yyyy-MM-dd"
              )
            : "",
          brood_pattern: inspectionToEdit.brood_pattern || "",
          notes: inspectionToEdit.notes || "",
          symptoms: inspectionToEdit.symptoms || [],
          population_strength: inspectionToEdit.population_strength || "",
          frames_of_brood: String(inspectionToEdit.frames_of_brood ?? ""),
          frames_of_nectar_honey: String(
            inspectionToEdit.frames_of_nectar_honey ?? ""
          ),
          frames_of_pollen: String(inspectionToEdit.frames_of_pollen ?? ""),
          room_to_lay: inspectionToEdit.room_to_lay || "",
          queen_cells_observed: inspectionToEdit.queen_cells_observed || "",
          queen_cells_count: String(inspectionToEdit.queen_cells_count ?? ""),
          varroa_mite_method: inspectionToEdit.varroa_mite_method || "",
          varroa_mite_count: String(inspectionToEdit.varroa_mite_count ?? ""),
          actions_taken: inspectionToEdit.actions_taken || "",
        });
      } else {
        resetForm();
      }
    }
  }, [inspectionToEdit, isVisible, resetForm]);

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddSymptom = () => {
    if (
      currentSymptom.trim() &&
      !formData.symptoms.includes(currentSymptom.trim())
    ) {
      handleInputChange("symptoms", [
        ...formData.symptoms,
        currentSymptom.trim(),
      ]);
      setCurrentSymptom("");
    }
  };

  const handleRemoveSymptom = (symptomToRemove: string) => {
    handleInputChange(
      "symptoms",
      formData.symptoms.filter((s) => s !== symptomToRemove)
    );
  };

  const handleSubmit = async () => {
    if (!formData.inspection_date) {
      Alert.alert("Validation Error", "Inspection date is required.");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload: InspectionSubmitData = {
        inspection_date: formData.inspection_date,
        queen_status: formData.queen_status || undefined,
        queen_introduced_date: formData.queen_introduced_date || undefined,
        brood_pattern: formData.brood_pattern || undefined,
        notes: formData.notes || undefined,
        symptoms: formData.symptoms.length > 0 ? formData.symptoms : undefined,
        population_strength: formData.population_strength || undefined,
        actions_taken: formData.actions_taken || undefined,
        room_to_lay: formData.room_to_lay || undefined,
        queen_cells_observed: formData.queen_cells_observed || undefined,
        varroa_mite_method: formData.varroa_mite_method || undefined,
        frames_of_brood: formData.frames_of_brood
          ? parseInt(formData.frames_of_brood, 10)
          : null,
        frames_of_nectar_honey: formData.frames_of_nectar_honey
          ? parseInt(formData.frames_of_nectar_honey, 10)
          : null,
        frames_of_pollen: formData.frames_of_pollen
          ? parseInt(formData.frames_of_pollen, 10)
          : null,
        queen_cells_count: formData.queen_cells_count
          ? parseInt(formData.queen_cells_count, 10)
          : null,
        varroa_mite_count: formData.varroa_mite_count
          ? parseInt(formData.varroa_mite_count, 10)
          : null,
      };
      await onSubmit(payload);
    } catch (error) {
      Alert.alert(
        "Submission Error",
        "Failed to save inspection. Please try again."
      );
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
      submitButtonText={
        inspectionToEdit ? "Update Inspection" : "Add Inspection"
      }
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formContainer}>
          <TextInput
            mode="outlined"
            label="Inspection Date"
            value={formData.inspection_date}
            onChangeText={(val) => handleInputChange("inspection_date", val)}
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
          <View style={styles.row}>
            <PaperFormDropdown
              label="Queen Status"
              items={QUEEN_STATUS_OPTIONS}
              selectedValue={formData.queen_status}
              onSelect={(val: string) => handleInputChange("queen_status", val)}
            />
            <TextInput
              mode="outlined"
              label="Queen Introduced Date"
              value={formData.queen_introduced_date}
              onChangeText={(val) =>
                handleInputChange("queen_introduced_date", val)
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
              style={styles.halfWidth}
            />
          </View>
          <View style={styles.row}>
            <PaperFormDropdown
              label="Brood Pattern"
              items={BROOD_PATTERN_OPTIONS}
              selectedValue={formData.brood_pattern}
              onSelect={(val: string) =>
                handleInputChange("brood_pattern", val)
              }
            />
            <PaperFormDropdown
              label="Population Strength"
              items={POPULATION_STRENGTH_OPTIONS}
              selectedValue={formData.population_strength}
              onSelect={(val: string) =>
                handleInputChange("population_strength", val)
              }
            />
          </View>

          <Card mode="outlined" style={styles.card}>
            <Card.Title title="Frame Estimates" />
            <Card.Content style={styles.cardContent}>
              <TextInput
                label="Brood"
                keyboardType="numeric"
                value={formData.frames_of_brood}
                onChangeText={(val) =>
                  handleInputChange("frames_of_brood", val)
                }
              />
              <TextInput
                label="Nectar/Honey"
                keyboardType="numeric"
                value={formData.frames_of_nectar_honey}
                onChangeText={(val) =>
                  handleInputChange("frames_of_nectar_honey", val)
                }
              />
              <TextInput
                label="Pollen"
                keyboardType="numeric"
                value={formData.frames_of_pollen}
                onChangeText={(val) =>
                  handleInputChange("frames_of_pollen", val)
                }
              />
            </Card.Content>
          </Card>

          <PaperFormDropdown
            label="Room to Lay?"
            items={ROOM_TO_LAY_OPTIONS}
            selectedValue={formData.room_to_lay}
            onSelect={(val: string) => handleInputChange("room_to_lay", val)}
          />

          <View style={styles.row}>
            <PaperFormDropdown
              label="Queen Cells Observed?"
              items={QUEEN_CELLS_OBSERVED_OPTIONS}
              selectedValue={formData.queen_cells_observed}
              onSelect={(val: string) =>
                handleInputChange("queen_cells_observed", val)
              }
            />
            <TextInput
              label="Count"
              keyboardType="numeric"
              value={formData.queen_cells_count}
              onChangeText={(val) =>
                handleInputChange("queen_cells_count", val)
              }
              disabled={formData.queen_cells_observed !== "Yes"}
              style={styles.halfWidth}
            />
          </View>

          <Card mode="outlined" style={styles.card}>
            <Card.Title title="Symptoms Observed" />
            <Card.Content style={styles.cardContent}>
              <View style={styles.symptomInputRow}>
                <TextInput
                  style={styles.symptomInput}
                  value={currentSymptom}
                  onChangeText={setCurrentSymptom}
                  placeholder="e.g., Varroa mites"
                />
                <Button
                  mode="contained-tonal"
                  onPress={handleAddSymptom}
                  style={styles.addButton}
                >
                  Add
                </Button>
              </View>
              <View style={styles.chipContainer}>
                {formData.symptoms.map((symptom) => (
                  <Chip
                    key={symptom}
                    onClose={() => handleRemoveSymptom(symptom)}
                    closeIcon={() => (
                      <FontAwesomeIcon
                        icon={faTimes}
                        size={16}
                        color={theme.colors.onSurfaceVariant}
                      />
                    )}
                    style={styles.chip}
                  >
                    {symptom}
                  </Chip>
                ))}
              </View>
            </Card.Content>
          </Card>

          <TextInput
            mode="outlined"
            label="Actions Taken"
            multiline
            numberOfLines={4}
            value={formData.actions_taken}
            onChangeText={(val) => handleInputChange("actions_taken", val)}
          />
          <TextInput
            mode="outlined"
            label="General Notes"
            multiline
            numberOfLines={4}
            value={formData.notes}
            onChangeText={(val) => handleInputChange("notes", val)}
          />
        </View>
      </ScrollView>
    </FormModal>
  );
};

const styles = StyleSheet.create({
  formContainer: { gap: 16 },
  inputContainer: { flex: 1 },
  row: { flexDirection: "row", gap: 16 },
  halfWidth: { flex: 1 },
  card: { marginTop: 8 },
  cardContent: { gap: 12 },
  symptomInputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  symptomInput: { flex: 1 },
  addButton: { flexShrink: 0 },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  chip: {},
});

export default InspectionForm;
