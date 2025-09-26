import {
  faBug,
  faChartLine,
  faCow,
  faEgg,
  faFish,
  faGripHorizontal,
  faSave,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  Button,
  Card,
  Checkbox,
  Divider,
  IconButton,
  Modal,
  Portal,
  Text,
  TouchableRipple,
  useTheme,
} from "react-native-paper";

type WidgetModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (widgets: string[]) => void;
  initialSelectedWidgets: string[];
  userSubTypes: string[];
};

const ALL_AVAILABLE_WIDGETS = [
  { id: "Task Calendar", name: "Task Calendar", requiredSubType: null },
  { id: "Trend Graph", name: "Financial Trend Graph", requiredSubType: null },
  {
    id: "Compare Graph",
    name: "Financial Compare Graph",
    requiredSubType: null,
  },
  {
    id: "Poultry Task Manager",
    name: "Poultry Task Manager",
    requiredSubType: "Poultry",
  },
  {
    id: "Poultry Inventory Stock",
    name: "Poultry Inventory",
    requiredSubType: "Poultry",
  },
  {
    id: "Apiculture Task Manager",
    name: "Apiculture Task Manager",
    requiredSubType: "Apiculture",
  },
  {
    id: "Apiculture Inventory Stock",
    name: "Apiculture Inventory",
    requiredSubType: "Apiculture",
  },
  {
    id: "Cattle Rearing Task Manager",
    name: "Cattle Rearing Task Manager",
    requiredSubType: "Cattle Rearing",
  },
  {
    id: "Cattle Rearing Inventory Stock",
    name: "Cattle Rearing Inventory",
    requiredSubType: "Cattle Rearing",
  },
];

const WidgetModal = ({
  isOpen,
  onClose,
  onSave,
  initialSelectedWidgets,
  userSubTypes,
}: WidgetModalProps) => {
  const [selectedWidgets, setSelectedWidgets] = useState<string[]>(
    initialSelectedWidgets
  );
  const theme = useTheme();

  useEffect(() => {
    if (isOpen) {
      setSelectedWidgets(initialSelectedWidgets);
    }
  }, [isOpen, initialSelectedWidgets]);

  const availableWidgets = useMemo(() => {
    return ALL_AVAILABLE_WIDGETS.filter(
      (widget) =>
        !widget.requiredSubType || userSubTypes.includes(widget.requiredSubType)
    );
  }, [userSubTypes]);

  const categorizedWidgets = useMemo(() => {
    const groups: Record<string, typeof availableWidgets> = {};
    const financialWidgetIds = ["Trend Graph", "Compare Graph"];
    for (const widget of availableWidgets) {
      const category = financialWidgetIds.includes(widget.id)
        ? "Financial"
        : widget.requiredSubType || "General";
      if (!groups[category]) groups[category] = [];
      groups[category].push(widget);
    }
    const categoryOrder = [
      "General",
      "Financial",
      "Poultry",
      "Cattle Rearing",
      "Apiculture",
    ];
    const orderedGroups: Record<string, typeof availableWidgets> = {};
    for (const categoryName of categoryOrder) {
      if (groups[categoryName]) {
        orderedGroups[categoryName] = groups[categoryName];
      }
    }
    return orderedGroups;
  }, [availableWidgets]);

  const categoryIcons: Record<string, IconDefinition> = {
    General: faGripHorizontal,
    Financial: faChartLine,
    Poultry: faEgg,
    "Cattle Rearing": faCow,
    Apiculture: faBug,
  };

  const handleToggleWidget = (widgetId: string) => {
    setSelectedWidgets((prev) =>
      prev.includes(widgetId)
        ? prev.filter((id) => id !== widgetId)
        : [...prev, widgetId]
    );
  };

  const handleSave = () => onSave(selectedWidgets);

  return (
    <Portal>
      <Modal
        visible={isOpen}
        onDismiss={onClose}
        contentContainerStyle={[
          styles.modalContent,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <View style={styles.header}>
          <Text variant="titleLarge">Manage Dashboard Widgets</Text>
          <IconButton
            icon={() => (
              <FontAwesomeIcon
                icon={faTimes}
                size={22}
                color={theme.colors.onSurfaceVariant}
              />
            )}
            onPress={onClose}
          />
        </View>
        <Divider />
        <ScrollView style={styles.scrollView}>
          {Object.entries(categorizedWidgets).map(
            ([category, widgetsInCategory]) => (
              <Card key={category} style={styles.card}>
                <Card.Title
                  title={category}
                  left={(props) => (
                    <FontAwesomeIcon
                      icon={categoryIcons[category]}
                      size={22}
                      color={theme.colors.onSurfaceVariant}
                    />
                  )}
                />
                <Card.Content>
                  {widgetsInCategory.map((widget) => (
                    <TouchableRipple
                      key={widget.id}
                      onPress={() => handleToggleWidget(widget.id)}
                    >
                      <View style={styles.checkboxRow}>
                        <Checkbox.Android
                          status={
                            selectedWidgets.includes(widget.id)
                              ? "checked"
                              : "unchecked"
                          }
                          color={theme.colors.primary}
                        />
                        <Text
                          style={[
                            styles.checkboxLabel,
                            { color: theme.colors.onSurface },
                          ]}
                        >
                          {widget.name}
                        </Text>
                      </View>
                    </TouchableRipple>
                  ))}
                </Card.Content>
              </Card>
            )
          )}
        </ScrollView>
        <Divider />
        <Card.Actions style={styles.actions}>
          <Button
            onPress={onClose}
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
            mode="contained"
            onPress={handleSave}
            icon={() => (
              <FontAwesomeIcon
                icon={faSave}
                size={18}
                color={theme.colors.onPrimary}
              />
            )}
          >
            Save Changes
          </Button>
        </Card.Actions>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContent: {
    margin: 20,
    borderRadius: 16,
    maxHeight: "90%",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 16,
  },
  scrollView: { paddingHorizontal: 8 },
  card: { marginBottom: 16, backgroundColor: "transparent" },
  actions: { padding: 16, justifyContent: "flex-end" },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  checkboxLabel: {
    marginLeft: 12,
    fontSize: 16,
    flex: 1,
  },
});

export default WidgetModal;
