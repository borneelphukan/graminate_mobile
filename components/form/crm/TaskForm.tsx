import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import React, { useEffect, useState } from "react";
import { Alert, FlatList, ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  List,
  Surface,
  TextInput,
  useTheme,
} from "react-native-paper";
import { FormModal } from "../../modals/FormModal";

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const api = axios.create({ baseURL: API_URL });

export type TaskFormData = { project: string };

type TaskFormProps = {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: (data: TaskFormData) => Promise<void>;
  user_id: string | undefined | null;
};

const TaskForm = ({ isVisible, onClose, onSubmit, user_id }: TaskFormProps) => {
  const theme = useTheme();
  const [formData, setFormData] = useState<TaskFormData>({ project: "" });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subTypes, setSubTypes] = useState<string[]>([]);
  const [isLoadingSubTypes, setIsLoadingSubTypes] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (!isVisible || !user_id) {
      setSubTypes([]);
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const fetchUserSubTypes = async () => {
      setIsLoadingSubTypes(true);
      try {
        const token = await AsyncStorage.getItem("accessToken");
        if (!token) throw new Error("Authentication token not found.");
        const response = await api.get(`/user/${user_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const user = response.data?.user;
        const fetchedSubTypes = Array.isArray(user?.sub_type)
          ? user.sub_type
          : [];
        setSubTypes(fetchedSubTypes);
        if (formData.project.length > 0) {
          setSuggestions(
            fetchedSubTypes.filter((s: string) =>
              s.toLowerCase().includes(formData.project.toLowerCase())
            )
          );
        } else {
          setSuggestions(fetchedSubTypes);
        }
      } catch (err) {
        console.error("Error fetching user sub_types:", err);
        setSubTypes([]);
        setSuggestions([]);
      } finally {
        setIsLoadingSubTypes(false);
      }
    };
    fetchUserSubTypes();
  }, [isVisible, user_id, formData.project]);

  const handleInputChange = (value: string) => {
    setFormData({ project: value });
    if (error) setError(null);
    if (value.length > 0) {
      setSuggestions(
        subTypes.filter((subType) =>
          subType.toLowerCase().includes(value.toLowerCase())
        )
      );
    } else {
      setSuggestions(subTypes);
    }
    setShowSuggestions(true);
  };

  const selectSuggestion = (suggestion: string) => {
    setFormData({ project: suggestion });
    setShowSuggestions(false);
  };

  const handleSubmit = async () => {
    setShowSuggestions(false);
    if (!formData.project.trim()) {
      setError("Project Name is required.");
      Alert.alert("Validation Error", "Please provide a project name.");
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      setFormData({ project: "" });
      onClose();
    } catch (err) {
      console.error("Task submission error:", err);
      Alert.alert(
        "Submission Error",
        "Failed to save project. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormModal
      isVisible={isVisible}
      onClose={onClose}
      title="Add New Project"
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      submitButtonText="Save Project"
      onBackgroundPress={
        showSuggestions ? () => setShowSuggestions(false) : onClose
      }
      onScrollBeginDrag={() => setShowSuggestions(false)}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.suggestionsContainer}>
          <TextInput
            mode="outlined"
            label="Project Name / Task Category"
            placeholder="e.g. Poultry, Dairy Farming"
            value={formData.project}
            onChangeText={handleInputChange}
            onFocus={() => {
              if (subTypes.length > 0) {
                setSuggestions(subTypes);
                setShowSuggestions(true);
              }
            }}
            right={
              isLoadingSubTypes ? (
                <TextInput.Icon icon={() => <ActivityIndicator />} />
              ) : null
            }
          />
          {showSuggestions && (
            <Surface
              style={[
                styles.suggestionsSurface,
                { backgroundColor: theme.colors.elevation.level2 },
              ]}
              elevation={3}
            >
              <FlatList
                data={suggestions}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <List.Item
                    title={item}
                    onPress={() => selectSuggestion(item)}
                  />
                )}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={<List.Item title="No suggestions found" />}
              />
            </Surface>
          )}
        </View>
      </ScrollView>
    </FormModal>
  );
};

const styles = StyleSheet.create({
  suggestionsContainer: { zIndex: 10 },
  suggestionsSurface: {
    position: "absolute",
    top: 60,
    width: "100%",
    borderRadius: 4,
    maxHeight: 200,
  },
});

export default TaskForm;
