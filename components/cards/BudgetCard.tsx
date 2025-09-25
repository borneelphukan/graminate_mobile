import { IconDefinition } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Card, Text, useTheme } from "react-native-paper";

type BudgetCardProps = {
  title: string;
  value: number;
  date: Date;
  icon: IconDefinition;
  bgColor: string;
  iconValueColor: string;
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const BudgetCard = ({
  title,
  value,
  date,
  icon,
  bgColor,
  iconValueColor,
}: BudgetCardProps) => {
  const theme = useTheme();
  const formattedDate = date.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  return (
    <Card style={[styles.card, { backgroundColor: bgColor }]}>
      <Card.Content style={styles.content}>
        <View style={styles.header}>
          <FontAwesomeIcon
            icon={icon}
            size={24}
            color={iconValueColor}
            style={styles.icon}
          />
          <Text
            variant="labelMedium"
            style={[styles.title, { color: theme.colors.onSurface }]}
          >
            {title}
          </Text>
        </View>
        <Text
          variant="headlineSmall"
          style={[styles.value, { color: iconValueColor }]}
        >
          {formatCurrency(value)}
        </Text>
        <Text
          variant="bodySmall"
          style={[styles.date, { color: theme.colors.onSurfaceVariant }]}
        >
          {formattedDate}
        </Text>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  icon: {
    opacity: 0.8,
  },
  title: {
    textTransform: "uppercase",
  },
  value: {
    marginTop: 4,
    fontWeight: "bold",
  },
  date: {
    marginTop: "auto",
    paddingTop: 8,
    opacity: 0.9,
  },
});

export default BudgetCard;
