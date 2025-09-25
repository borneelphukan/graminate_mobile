import {
  eachDayOfInterval,
  endOfMonth,
  format,
  isBefore,
  isSameDay,
  isValid as isValidDate,
  startOfMonth,
  subDays as subDaysDateFns,
  subMonths,
} from "date-fns";
import React, { useEffect, useMemo, useState } from "react";
import { Dimensions, ScrollView, StyleSheet, View } from "react-native";
import { BarChart } from "react-native-chart-kit";
import {
  ActivityIndicator,
  Button,
  Card,
  Menu,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";

export type DailyFinancialEntry = {
  date: Date;
  revenue: { total: number };
  cogs: { total: number };
  grossProfit: { total: number };
  expenses: { total: number };
  netProfit: { total: number };
};

const FINANCIAL_METRICS = [
  "Revenue",
  "COGS",
  "Gross Profit",
  "Expenses",
  "Net Profit",
] as const;
type FinancialMetric = (typeof FINANCIAL_METRICS)[number];

const TIME_RANGE_OPTIONS = ["Weekly", "Monthly", "3 Months"] as const;
type TimeRange = (typeof TIME_RANGE_OPTIONS)[number];

const METRIC_COLORS: Record<FinancialMetric, string> = {
  Revenue: "rgba(34, 197, 94, 1)",
  COGS: "rgba(234, 179, 8, 1)",
  "Gross Profit": "rgba(6, 182, 212, 1)",
  Expenses: "rgba(239, 68, 68, 1)",
  "Net Profit": "rgba(59, 130, 246, 1)",
};

const today = new Date();
today.setHours(0, 0, 0, 0);

const metricToKeyMap: Record<
  FinancialMetric,
  keyof Omit<DailyFinancialEntry, "date">
> = {
  Revenue: "revenue",
  COGS: "cogs",
  "Gross Profit": "grossProfit",
  Expenses: "expenses",
  "Net Profit": "netProfit",
};

const ITEMS_PER_PAGE = 7;

type CompareGraphProps = {
  initialFullHistoricalData: DailyFinancialEntry[];
  isLoadingData: boolean;
};

const PaperMenuDropdown = ({ label, items, selectedValue, onSelect }: any) => {
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
          contentStyle={styles.dropdownButton}
        >
          {`${label}: ${selectedValue}`}
        </Button>
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
  );
};

const CompareGraph = ({
  initialFullHistoricalData,
  isLoadingData,
}: CompareGraphProps) => {
  const theme = useTheme();
  const [selectedMetric1, setSelectedMetric1] =
    useState<FinancialMetric>("Revenue");
  const [selectedMetric2, setSelectedMetric2] =
    useState<FinancialMetric>("COGS");
  const [selectedTimeRange, setSelectedTimeRange] =
    useState<TimeRange>("Monthly");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    setCurrentPage(0);
  }, [selectedTimeRange, startDate, endDate, selectedMetric1, selectedMetric2]);

  const isCustomDateRangeActive = useMemo(
    () =>
      !!(
        startDate &&
        endDate &&
        isValidDate(startDate) &&
        isValidDate(endDate) &&
        !isBefore(endDate, startDate)
      ),
    [startDate, endDate]
  );

  const currentIntervalDates = useMemo(() => {
    if (initialFullHistoricalData.length === 0 && !isCustomDateRangeActive)
      return [];
    let vS: Date, vE: Date;
    if (isCustomDateRangeActive && startDate && endDate) {
      vS = startDate;
      vE = endDate;
    } else {
      const rD = today;
      if (selectedTimeRange === "Weekly") {
        vS = subDaysDateFns(rD, 6);
        vE = rD;
      } else if (selectedTimeRange === "Monthly") {
        const tMD = startOfMonth(rD);
        vS = tMD;
        vE = endOfMonth(tMD);
      } else {
        vS = startOfMonth(subMonths(rD, 2));
        vE = endOfMonth(rD);
      }
    }
    return eachDayOfInterval({ start: vS, end: vE });
  }, [
    isCustomDateRangeActive,
    startDate,
    endDate,
    selectedTimeRange,
    initialFullHistoricalData,
  ]);

  const chartData = useMemo(() => {
    if (currentIntervalDates.length === 0)
      return { labels: [], datasets: [], legend: [] };
    const startIndex = currentPage * ITEMS_PER_PAGE;
    const paginatedDates = currentIntervalDates.slice(
      startIndex,
      startIndex + ITEMS_PER_PAGE
    );
    const labels: string[] = [];
    const data1: number[] = [];
    const data2: number[] = [];

    paginatedDates.forEach((day) => {
      labels.push(format(day, "MMM d"));
      const dataPoint = initialFullHistoricalData.find((fd) =>
        isSameDay(fd.date, day)
      );
      data1.push(
        Math.abs(dataPoint?.[metricToKeyMap[selectedMetric1]]?.total ?? 0)
      );
      data2.push(
        Math.abs(dataPoint?.[metricToKeyMap[selectedMetric2]]?.total ?? 0)
      );
    });

    return {
      labels,
      legend: [selectedMetric1, selectedMetric2],
      datasets: [
        {
          data: data1,
          color: (opacity = 1) =>
            METRIC_COLORS[selectedMetric1].replace(/, 1\)/, `, ${opacity})`),
        },
        {
          data: data2,
          color: (opacity = 1) =>
            METRIC_COLORS[selectedMetric2].replace(/, 1\)/, `, ${opacity})`),
        },
      ],
    };
  }, [
    selectedMetric1,
    selectedMetric2,
    currentIntervalDates,
    initialFullHistoricalData,
    currentPage,
  ]);

  const chartConfig = {
    backgroundColor: theme.colors.surface,
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) =>
      `rgba(${theme.dark ? "255, 255, 255" : "0, 0, 0"}, ${opacity})`,
    labelColor: (opacity = 1) =>
      `rgba(${theme.dark ? "255, 255, 255" : "0, 0, 0"}, ${opacity})`,
    formatYLabel: (y: string) =>
      new Intl.NumberFormat("en-IN", {
        notation: "compact",
        compactDisplay: "short",
      }).format(Number(y)),
  };

  if (isLoadingData) {
    return (
      <Card style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </Card>
    );
  }

  const handleDateChange =
    (setter: (date: Date | null) => void) => (text: string) => {
      const parsedDate = new Date(text);
      if (isValidDate(parsedDate) && text.match(/^\d{4}-\d{2}-\d{2}$/)) {
        setter(parsedDate);
      } else if (text === "") {
        setter(null);
      }
    };

  const totalPages = Math.ceil(currentIntervalDates.length / ITEMS_PER_PAGE);

  return (
    <Card>
      <ScrollView contentContainerStyle={styles.container}>
        <Text variant="titleLarge" style={styles.centeredText}>
          {selectedMetric1} vs {selectedMetric2}
        </Text>
        <Text
          variant="bodyMedium"
          style={[styles.centeredText, styles.subtitle]}
        >
          Compare two financial metrics over time.
        </Text>

        <View style={styles.controlsContainer}>
          <PaperMenuDropdown
            label="Metric 1"
            items={FINANCIAL_METRICS.filter((m) => m !== selectedMetric2)}
            selectedValue={selectedMetric1}
            onSelect={(val: any) => setSelectedMetric1(val)}
          />
          <PaperMenuDropdown
            label="Metric 2"
            items={FINANCIAL_METRICS.filter((m) => m !== selectedMetric1)}
            selectedValue={selectedMetric2}
            onSelect={(val: any) => setSelectedMetric2(val)}
          />
          <TextInput
            mode="outlined"
            label="Start Date"
            placeholder="YYYY-MM-DD"
            value={startDate ? format(startDate, "YYYY-MM-DD") : ""}
            onChangeText={handleDateChange(setStartDate)}
            right={<TextInput.Icon icon="calendar" />}
            style={styles.input}
          />
          <TextInput
            mode="outlined"
            label="End Date"
            placeholder="YYYY-MM-DD"
            value={endDate ? format(endDate, "YYYY-MM-DD") : ""}
            onChangeText={handleDateChange(setEndDate)}
            disabled={!startDate}
            right={<TextInput.Icon icon="calendar" />}
            style={styles.input}
          />
          {!isCustomDateRangeActive && (
            <PaperMenuDropdown
              label="Time Range"
              items={TIME_RANGE_OPTIONS}
              selectedValue={selectedTimeRange}
              onSelect={(range: any) => setSelectedTimeRange(range)}
            />
          )}
        </View>

        <View style={styles.chartSection}>
          {chartData.labels.length > 0 ? (
            <>
              <BarChart
                data={chartData}
                width={Dimensions.get("window").width - 50}
                height={250}
                yAxisLabel="₹"
                yAxisSuffix=""
                fromZero
                chartConfig={chartConfig}
                style={styles.chart}
              />
              <Text
                variant="labelMedium"
                style={[
                  styles.centeredText,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                Timeline
              </Text>
              {totalPages > 1 && (
                <View style={styles.paginationContainer}>
                  <Button
                    icon="chevron-left"
                    mode="text"
                    onPress={() => setCurrentPage((p) => Math.max(0, p - 1))}
                    disabled={currentPage === 0}
                  >
                    Prev
                  </Button>
                  <Button
                    icon="chevron-right"
                    mode="text"
                    onPress={() =>
                      setCurrentPage((p) => Math.min(totalPages - 1, p + 1))
                    }
                    disabled={currentPage >= totalPages - 1}
                    contentStyle={styles.nextButton}
                  >
                    Next
                  </Button>
                </View>
              )}
            </>
          ) : (
            <View
              style={[
                styles.noDataContainer,
                {
                  borderColor: theme.colors.outline,
                  backgroundColor: theme.colors.surfaceVariant,
                },
              ]}
            >
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                No data available for this period.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </Card>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    height: 384,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  container: { padding: 16 },
  centeredText: { textAlign: "center" },
  subtitle: { marginBottom: 16 },
  controlsContainer: { gap: 12, marginBottom: 24 },
  dropdownButton: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
  },
  input: { backgroundColor: "transparent" },
  chartSection: { alignItems: "center", gap: 8 },
  chart: { marginVertical: 16, borderRadius: 16 },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  nextButton: { flexDirection: "row-reverse" },
  noDataContainer: {
    height: 256,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 8,
    marginTop: 16,
  },
});

export default CompareGraph;
