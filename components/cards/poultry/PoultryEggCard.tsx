import {
  addDays as addDaysDateFns,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  isBefore,
  min as minDateFn,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import React, { useEffect, useMemo, useState } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import { LineChart } from "react-native-chart-kit";
import {
  ActivityIndicator,
  Button,
  Card,
  Icon,
  Menu,
  SegmentedButtons,
  Text,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import { IconSource } from "react-native-paper/lib/typescript/components/Icon";

// --- Type Definitions ---
type LatestEggMetrics = {
  totalEggs: number;
  brokenEggs: number;
  smallEggs: number;
  mediumEggs: number;
  largeEggs: number;
  extraLargeEggs: number;
};
export type PeriodOption = "Weekly" | "Monthly" | "3 Months";
const TIME_RANGE_OPTIONS: PeriodOption[] = ["Weekly", "Monthly", "3 Months"];
const today = new Date();
today.setHours(0, 0, 0, 0);

type ViewOption = "graphs" | "metrics";

type ChartData = {
  labels: string[];
  datasets: Array<{
    data: number[];
    label?: string;
    color?: (opacity: number) => string;
    strokeWidth?: number;
  }>;
  legend?: string[];
};

type Props = {
  latestMetrics: LatestEggMetrics | null;
  eggCollectionLineData: ChartData;
  onManageClick: () => void;
  loading: boolean;
  error: string | null;
  onPeriodChange: (startDate: Date, endDate: Date) => void;
  earliestDataDate: Date | null;
};

// --- Sub-components using React Native Paper ---
type MetricItemProps = {
  icon: IconSource;
  value: string | React.ReactNode;
  label: string;
  isLoading?: boolean;
  isLatest?: boolean;
};

const MetricItem = ({
  icon,
  value,
  label,
  isLoading,
  isLatest,
}: MetricItemProps) => {
  const theme = useTheme();
  return (
    <Card style={styles.metricCard}>
      <Card.Content style={styles.metricContent}>
        <Icon source={icon} color={theme.colors.primary} size={28} />
        {isLoading ? (
          <View
            style={[
              styles.loaderPlaceholder,
              { backgroundColor: theme.colors.surfaceDisabled },
            ]}
          />
        ) : (
          <Text variant="headlineSmall" style={styles.metricValue}>
            {value}
          </Text>
        )}
        <Text variant="bodyMedium" style={styles.metricLabel}>
          {label} {isLatest && <Text variant="labelSmall">(Last Entry)</Text>}
        </Text>
      </Card.Content>
    </Card>
  );
};

const PaperDropdownSmall = ({
  items,
  selected,
  onSelect,
}: {
  items: string[];
  selected: string;
  onSelect: (item: string) => void;
}) => {
  const [visible, setVisible] = useState(false);
  return (
    <Menu
      visible={visible}
      onDismiss={() => setVisible(false)}
      anchor={
        <Button
          mode="outlined"
          onPress={() => setVisible(true)}
          icon="chevron-down"
        >
          {selected}
        </Button>
      }
    >
      {items.map((item) => (
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
  );
};

const PoultryEggCard = ({
  latestMetrics,
  eggCollectionLineData: rawEggCollectionLineData,
  onManageClick,
  loading,
  error,
  onPeriodChange,
  earliestDataDate,
}: Props) => {
  const theme = useTheme();
  const [activeView, setActiveView] = useState<ViewOption>("graphs");
  const [selectedTimeRange, setSelectedTimeRange] =
    useState<PeriodOption>("Weekly");
  const [dateOffset, setDateOffset] = useState(0);

  const viewToggleOptions = [
    { value: "graphs", label: "Graphs", icon: "chart-line" },
    { value: "metrics", label: "Metrics", icon: "view-grid" },
  ];

  const currentInterval = useMemo(() => {
    let viewStartDate: Date, viewEndDate: Date;
    const referenceDate = today;
    if (selectedTimeRange === "Weekly") {
      const targetWeekStart = startOfWeek(addWeeks(referenceDate, dateOffset), {
        weekStartsOn: 1,
      });
      viewStartDate = targetWeekStart;
      viewEndDate = endOfWeek(targetWeekStart, { weekStartsOn: 1 });
    } else if (selectedTimeRange === "Monthly") {
      const targetMonthStart = startOfMonth(
        addMonths(referenceDate, dateOffset)
      );
      viewStartDate = targetMonthStart;
      viewEndDate = endOfMonth(targetMonthStart);
    } else {
      const threeMonthsViewEnd = endOfMonth(
        addMonths(referenceDate, dateOffset)
      );
      viewEndDate = minDateFn([threeMonthsViewEnd, today]);
      viewStartDate = startOfMonth(subMonths(viewEndDate, 2));
    }
    return { viewStartDate, viewEndDate };
  }, [selectedTimeRange, dateOffset]);

  useEffect(() => {
    onPeriodChange(currentInterval.viewStartDate, currentInterval.viewEndDate);
  }, [currentInterval, onPeriodChange]);

  useEffect(() => {
    setDateOffset(0);
  }, [selectedTimeRange]);

  const navigationStates = useMemo(() => {
    let isPrevDisabled = false;
    const isNextDisabled = dateOffset === 0;
    if (earliestDataDate) {
      if (selectedTimeRange === "Weekly") {
        const prevWeekStart = startOfWeek(addWeeks(today, dateOffset - 1), {
          weekStartsOn: 1,
        });
        isPrevDisabled =
          isBefore(prevWeekStart, earliestDataDate) &&
          !isBefore(addDaysDateFns(earliestDataDate, 6), prevWeekStart);
      } else if (selectedTimeRange === "Monthly") {
        const prevMonthStart = startOfMonth(addMonths(today, dateOffset - 1));
        isPrevDisabled =
          isBefore(prevMonthStart, earliestDataDate) &&
          !isBefore(endOfMonth(earliestDataDate), prevMonthStart);
      } else if (selectedTimeRange === "3 Months") {
        const threeMonthsAgoStart = startOfMonth(
          subMonths(addMonths(today, dateOffset), 2 + 3)
        );
        isPrevDisabled =
          isBefore(threeMonthsAgoStart, earliestDataDate) &&
          !isBefore(
            endOfMonth(addMonths(earliestDataDate, 2)),
            threeMonthsAgoStart
          );
      }
    } else {
      isPrevDisabled = true;
    }
    return { isPrevDisabled, isNextDisabled };
  }, [dateOffset, selectedTimeRange, earliestDataDate]);

  const handleTimeRangeSelect = (period: string) =>
    setSelectedTimeRange(period as PeriodOption);
  const handlePrev = () => setDateOffset((prev) => prev - 1);
  const handleNext = () => setDateOffset((prev) => prev + 1);

  const chartConfig = {
    backgroundColor: theme.colors.surface,
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) =>
      theme.dark
        ? `rgba(209, 213, 219, ${opacity})`
        : `rgba(55, 65, 81, ${opacity})`,
    labelColor: (opacity = 1) =>
      `rgba(${theme.dark ? "156, 163, 175" : "107, 114, 128"}, ${opacity})`,
    propsForDots: { r: "4", strokeWidth: "2" },
    style: { borderRadius: 16 },
  };

  const getDominantEggSize = (metrics: LatestEggMetrics | null): string => {
    if (!metrics) return "N/A";
    const sizesMap = {
      S: metrics.smallEggs || 0,
      M: metrics.mediumEggs || 0,
      L: metrics.largeEggs || 0,
      XL: metrics.extraLargeEggs || 0,
    };
    let maxCount = Math.max(...Object.values(sizesMap));
    if (maxCount === 0) return "N/A";
    return Object.entries(sizesMap)
      .filter(([, count]) => count === maxCount)
      .map(([size, count]) => `${size} (${count.toLocaleString()})`)
      .join(", ");
  };

  const renderContent = () => {
    if (loading && rawEggCollectionLineData.datasets.length === 0) {
      return (
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" />
        </View>
      );
    }
    if (error) {
      return (
        <View style={styles.centeredContainer}>
          <Icon source="alert-circle" color={theme.colors.error} size={48} />
          <Text variant="titleMedium" style={{ color: theme.colors.error }}>
            Error loading egg data
          </Text>
          <Text variant="bodyMedium" style={styles.textCenter}>
            {error}
          </Text>
        </View>
      );
    }

    if (activeView === "metrics") {
      return (
        <View style={styles.metricsGrid}>
          <MetricItem
            icon="egg-outline"
            value={getDominantEggSize(latestMetrics)}
            label="Dominant Size(s)"
            isLoading={loading && !latestMetrics}
            isLatest={!!latestMetrics}
          />
          <MetricItem
            icon="alert-triangle-outline"
            value={
              latestMetrics ? latestMetrics.brokenEggs.toLocaleString() : "N/A"
            }
            label="Broken Eggs"
            isLoading={loading && !latestMetrics}
            isLatest={!!latestMetrics}
          />
          <MetricItem
            icon="basket-outline"
            value={
              latestMetrics ? latestMetrics.totalEggs.toLocaleString() : "N/A"
            }
            label="Eggs Collected"
            isLoading={loading && !latestMetrics}
            isLatest={!!latestMetrics}
          />
          <TouchableRipple
            onPress={!loading ? onManageClick : undefined}
            disabled={loading}
            style={styles.metricTouchable}
          >
            <MetricItem
              icon="plus-circle-outline"
              value={"Log & View"}
              label="Manage Records"
              isLoading={loading}
            />
          </TouchableRipple>
        </View>
      );
    }

    if (activeView === "graphs") {
      if (rawEggCollectionLineData.labels?.length === 0 && !loading) {
        return (
          <View style={styles.centeredContainer}>
            <Icon
              source="chart-line"
              color={theme.colors.onSurfaceDisabled}
              size={48}
            />
            <Text variant="titleMedium" style={styles.textCenter}>
              No egg collection data for this period.
            </Text>
            <Text
              variant="bodyMedium"
              style={{
                color: theme.colors.onSurfaceDisabled,
                textAlign: "center",
              }}
            >
              Try logging collections or changing filters.
            </Text>
          </View>
        );
      }
      return (
        <>
          <View style={styles.chartContainer}>
            {loading && (
              <View
                style={[
                  styles.chartLoader,
                  { backgroundColor: theme.colors.backdrop },
                ]}
              >
                <ActivityIndicator size="large" />
              </View>
            )}
            <LineChart
              data={rawEggCollectionLineData}
              width={Dimensions.get("window").width - 48}
              height={320}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              withShadow={false}
              yAxisLabel=""
              yAxisSuffix=""
              fromZero
            />
          </View>
          <View style={styles.dateControls}>
            <Button
              icon="chevron-left"
              onPress={handlePrev}
              disabled={navigationStates.isPrevDisabled || loading}
            >
              Previous
            </Button>
            <PaperDropdownSmall
              items={TIME_RANGE_OPTIONS}
              selected={selectedTimeRange}
              onSelect={handleTimeRangeSelect}
            />
            <Button
              icon="chevron-right"
              onPress={handleNext}
              disabled={navigationStates.isNextDisabled || loading}
              contentStyle={styles.nextButtonContent}
            >
              Next
            </Button>
          </View>
        </>
      );
    }
    return null;
  };

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.header}>
          <Text variant="titleLarge" style={styles.headerTitle}>
            Egg Collection & Grading
          </Text>
          <SegmentedButtons
            value={activeView}
            onValueChange={(value) => setActiveView(value as ViewOption)}
            buttons={viewToggleOptions}
          />
        </View>
        {renderContent()}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: { flex: 1 },
  header: { gap: 16, marginBottom: 8 },
  headerTitle: { textAlign: "center" },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 300,
    padding: 16,
    gap: 12,
  },
  textCenter: { textAlign: "center" },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 16,
    rowGap: 16,
  },
  metricCard: { width: "100%", height: "100%" },
  metricTouchable: { width: "48%", borderRadius: 12 },
  metricContent: {
    alignItems: "center",
    padding: 16,
    gap: 8,
    flex: 1,
    justifyContent: "center",
  },
  metricValue: { fontWeight: "bold" },
  metricLabel: { textAlign: "center" },
  loaderPlaceholder: { height: 32, width: 90, borderRadius: 8 },
  chartContainer: {
    marginTop: 16,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 320,
  },
  chartLoader: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    borderRadius: 16,
  },
  chart: { borderRadius: 16 },
  dateControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
  },
  nextButtonContent: { flexDirection: "row-reverse" },
});

export default PoultryEggCard;
