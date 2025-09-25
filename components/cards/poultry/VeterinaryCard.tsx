import React from "react";
import { StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Card,
  Icon,
  Text,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import { IconSource } from "react-native-paper/lib/typescript/components/Icon";

type VeterinaryCardProps = {
  birdsVaccinated: number | null;
  totalBirdsInvolvedInRecord: number | null;
  nextAppointmentDate: string | null;
  onManageClick: () => void;
  loading: boolean;
};

type MetricItemProps = {
  icon: IconSource;
  value: string | React.ReactNode;
  label: string;
};

const MetricItem = ({ icon, value, label }: MetricItemProps) => {
  const theme = useTheme();
  return (
    <Card style={styles.metricCard}>
      <Card.Content style={styles.metricContent}>
        <Icon source={icon} size={28} color={theme.colors.primary} />
        <Text variant="headlineSmall" style={styles.metricValue}>
          {value}
        </Text>
        <Text variant="bodyMedium" style={styles.metricLabel}>
          {label}
        </Text>
      </Card.Content>
    </Card>
  );
};

const VeterinaryCard = ({
  birdsVaccinated,
  totalBirdsInvolvedInRecord,
  nextAppointmentDate,
  onManageClick,
  loading,
}: VeterinaryCardProps) => {
  const theme = useTheme();
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const vaccinatedDisplayValue =
    birdsVaccinated === null || totalBirdsInvolvedInRecord === null
      ? "N/A"
      : `${birdsVaccinated} / ${totalBirdsInvolvedInRecord}`;

  return (
    <Card>
      <Card.Title title="Veterinary Status" titleVariant="titleLarge" />
      <Card.Content>
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" />
          </View>
        ) : (
          <View style={styles.metricsContainer}>
            <View style={styles.metricsRow}>
              <MetricItem
                icon="syringe"
                value={vaccinatedDisplayValue}
                label="Birds Vaccinated (Latest)"
              />
              <MetricItem
                icon="calendar-check"
                value={formatDate(nextAppointmentDate)}
                label="Next Visit"
              />
            </View>
            <TouchableRipple
              onPress={!loading ? onManageClick : undefined}
              disabled={loading}
              style={styles.fullWidthTouchable}
            >
              <MetricItem
                icon="notebook-edit-outline"
                value="Log/View"
                label="Manage Health Data"
              />
            </TouchableRipple>
          </View>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  loaderContainer: {
    minHeight: 160,
    justifyContent: "center",
    alignItems: "center",
  },
  metricsContainer: {
    gap: 12,
  },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  metricCard: {
    flex: 1,
  },
  metricContent: {
    minHeight: 128,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    gap: 8,
  },
  metricValue: {
    fontWeight: "bold",
  },
  metricLabel: {
    textAlign: "center",
  },
  fullWidthTouchable: {
    borderRadius: 12,
  },
});

export default VeterinaryCard;
