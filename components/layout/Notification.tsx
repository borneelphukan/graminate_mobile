import React from "react";
import { StyleSheet } from "react-native";
import { List, useTheme } from "react-native-paper";

export type NotificationProps = {
  title: string;
  description: string;
  darkMode?: boolean;
};

export const Notification = ({ title, description }: NotificationProps) => {
  const theme = useTheme();

  return (
    <List.Item
      title={title}
      description={description}
      titleStyle={styles.title}
      descriptionNumberOfLines={3}
      style={[
        styles.container,
        { backgroundColor: theme.colors.elevation.level1 },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
    borderRadius: 8,
    paddingVertical: 8,
  },
  title: {
    fontWeight: "bold",
  },
});
