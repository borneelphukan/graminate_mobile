import {
  eachDayOfInterval,
  endOfMonth,
  format,
  isBefore,
  isSameDay,
  isValid as isValidDate,
  min as minDateFn,
  startOfMonth,
  subDays as subDaysDateFns,
  subMonths,
} from "date-fns";
import React, { useEffect, useMemo, useState } from "react";
import { Dimensions, ScrollView, StyleSheet, View } from "react-native";
import { LineChart } from "react-native-chart-kit";
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
  revenue: { total: number; breakdown: { name: string; value: number }[] };
  cogs: { total: number; breakdown: { name: string; value: number }[] };
  grossProfit: { total: number; breakdown: { name: string; value: number }[] };
  expenses: { total: number; breakdown: { name: string; value: number }[] };
  netProfit: { total: number; breakdown: { name: string; value: number }[] };
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

const CHART_COLORS = [
  "rgba(75, 192, 192, 1)",
  "rgba(255, 159, 64, 1)",
  "rgba(153, 102, 255, 1)",
  "rgba(255, 99, 132, 1)",
  "rgba(54, 162, 235, 1)",
  "rgba(255, 206, 86, 1)",
  "rgba(128,128,128, 1)",
  "rgba(239, 68, 68, 1)",
  "rgba(34, 197, 94, 1)",
  "rgba(234, 179, 8, 1)",
  "rgba(6, 182, 212, 1)",
  "rgba(59, 130, 246, 1)",
];

const ITEMS_PER_PAGE = 7;
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

type TrendGraphProps = {
  initialFullHistoricalData: DailyFinancialEntry[];
  initialSubTypes: string[];
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

const TrendGraph = ({
  initialFullHistoricalData,
  initialSubTypes,
  isLoadingData,
}: TrendGraphProps) => {
  const theme = useTheme();
  const [selectedMetric, setSelectedMetric] =
    useState<FinancialMetric>("Revenue");
  const [selectedTimeRange, setSelectedTimeRange] =
    useState<TimeRange>("Monthly");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    setCurrentPage(0);
  }, [selectedMetric, selectedTimeRange, startDate, endDate]);

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
    if (initialFullHistoricalData.length === 0) return [];
    let vS: Date, vE: Date;
    if (isCustomDateRangeActive && startDate && endDate) {
      vS = startDate;
      vE = endDate;
    } else {
      if (selectedTimeRange === "Weekly") {
        vE = today;
        vS = subDaysDateFns(vE, 6);
      } else if (selectedTimeRange === "Monthly") {
        const tMD = today;
        vS = startOfMonth(tMD);
        vE = endOfMonth(tMD);
      } else {
        vS = startOfMonth(subMonths(today, 2));
        vE = minDateFn([today, endOfMonth(today)]);
      }
    }
    return eachDayOfInterval({ start: vS, end: vE });
  }, [
    isCustomDateRangeActive,
    startDate,
    endDate,
    selectedTimeRange,
    initialFullHistoricalData.length,
  ]);

  const totalPages = Math.ceil(currentIntervalDates.length / ITEMS_PER_PAGE);

  const { lineChartData } = useMemo(() => {
    if (currentIntervalDates.length === 0)
      return { lineChartData: { labels: [], datasets: [], legend: [] } };
    const startIndex = currentPage * ITEMS_PER_PAGE;
    const paginatedDates = currentIntervalDates.slice(
      startIndex,
      startIndex + ITEMS_PER_PAGE
    );
    const metricKey = metricToKeyMap[selectedMetric];
    let lineLabels: string[] = [];
    const lineDatasets = initialSubTypes.map(() => ({ data: [] as number[] }));

    paginatedDates.forEach((day) => {
      lineLabels.push(format(day, "MMM d"));
      const dataPoint = initialFullHistoricalData.find((fd) =>
        isSameDay(fd.date, day)
      );
      initialSubTypes.forEach((sub, i) => {
        const val =
          dataPoint?.[metricKey]?.breakdown.find((b) => b.name === sub)
            ?.value ?? 0;
        lineDatasets[i].data.push(val);
      });
    });

    return {
      lineChartData: {
        labels: lineLabels,
        datasets: initialSubTypes.map((sub, i) => ({
          data: lineDatasets[i].data,
          color: (opacity = 1) =>
            CHART_COLORS[i % CHART_COLORS.length].replace(
              /, 1\)/,
              `, ${opacity})`
            ),
          strokeWidth: 2,
        })),
        legend: initialSubTypes,
      },
    };
  }, [
    selectedMetric,
    currentIntervalDates,
    initialSubTypes,
    initialFullHistoricalData,
    currentPage,
  ]);

  const chartConfig = {
    backgroundColor: theme.colors.surface,
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) =>
      theme.dark
        ? `rgba(165, 243, 252, ${opacity})`
        : `rgba(0, 128, 128, ${opacity})`,
    labelColor: (opacity = 1) =>
      `rgba(${theme.dark ? "243, 244, 246" : "0, 0, 0"}, ${opacity})`,
    propsForLabels: { fontSize: 10, fontWeight: "bold" },
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

  return (
    <Card>
      <ScrollView contentContainerStyle={styles.container}>
        <Text variant="titleLarge" style={styles.centeredText}>
          Financial Trends
        </Text>
        <Text
          variant="bodyMedium"
          style={[styles.centeredText, styles.subtitle]}
        >
          Select a metric and time range to analyze.
        </Text>

        <View style={styles.controlsContainer}>
          <PaperMenuDropdown
            label="Metric"
            items={FINANCIAL_METRICS}
            selectedValue={selectedMetric}
            onSelect={(item: any) => setSelectedMetric(item)}
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
              onSelect={(item: any) => setSelectedTimeRange(item)}
            />
          )}
        </View>

        <View style={styles.chartSection}>
          <Text variant="titleMedium" style={styles.centeredText}>
            {selectedMetric} Trend
          </Text>
          {lineChartData.labels.length > 0 ? (
            <>
              <LineChart
                data={lineChartData}
                width={Dimensions.get("window").width - 50}
                height={250}
                yAxisLabel="₹"
                chartConfig={chartConfig}
                bezier
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

export default TrendGraph;
