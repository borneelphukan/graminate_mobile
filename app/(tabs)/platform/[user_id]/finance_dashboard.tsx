import BudgetCard from "@/components/cards/BudgetCard";
import CompareGraph from "@/components/cards/CompareGraph";
import TrendGraph from "@/components/cards/TrendGraph";
import WorkingCapital from "@/components/cards/WorkingCapital";
import PlatformLayout from "@/components/layout/PlatformLayout";
import {
  faArrowLeft,
  faCartArrowDown,
  faChartPie,
  faCreditCard,
  faPiggyBank,
  faSackDollar,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import axiosInstance from "@/lib/axiosInstance";
import {
  addDays as addDaysDateFns,
  endOfMonth,
  format as formatDateFns,
  isWithinInterval,
  parseISO,
  startOfMonth,
  subDays as subDaysDateFns,
} from "date-fns";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { ActivityIndicator, Appbar, Text, useTheme } from "react-native-paper";

const TOTAL_DAYS_FOR_HISTORICAL_DATA = 180;
const today = new Date();
today.setHours(0, 0, 0, 0);

type SubTypeValue = { name: string; value: number };
export type MetricBreakdown = { total: number; breakdown: SubTypeValue[] };
export type DailyFinancialEntry = {
  date: Date;
  revenue: MetricBreakdown;
  cogs: MetricBreakdown;
  grossProfit: MetricBreakdown;
  expenses: MetricBreakdown;
  netProfit: MetricBreakdown;
};
type SaleRecord = {
  sales_id: number;
  user_id: number;
  sales_name?: string;
  sales_date: string;
  occupation?: string;
  items_sold: string[];
  quantities_sold: number[];
  prices_per_unit?: number[];
};
type ExpenseRecord = {
  expense_id: number;
  user_id: number;
  title: string;
  occupation?: string;
  category: string;
  expense: number;
  date_created: string;
};
type ProcessedExpensesForDay = {
  cogs: MetricBreakdown;
  expenses: MetricBreakdown;
};

const DETAILED_EXPENSE_CATEGORIES = {
  "Goods & Services": ["Farm Utilities", "Agricultural Feeds", "Consulting"],
  "Utility Expenses": [
    "Electricity",
    "Labour Salary",
    "Water Supply",
    "Taxes",
    "Others",
  ],
};
const EXPENSE_TYPE_MAP = {
  COGS: "Goods & Services",
  OPERATING_EXPENSES: "Utility Expenses",
};
const categoryToMainGroup: Record<string, string> = {};
for (const mainGroup in DETAILED_EXPENSE_CATEGORIES) {
  DETAILED_EXPENSE_CATEGORIES[
    mainGroup as keyof typeof DETAILED_EXPENSE_CATEGORIES
  ].forEach((subCat) => {
    categoryToMainGroup[subCat] = mainGroup;
  });
}

const generateDailyFinancialData = (
  count: number,
  baseSubTypes: string[],
  actualSalesData?: Map<string, MetricBreakdown>,
  actualProcessedExpenses?: Map<string, ProcessedExpensesForDay>
): DailyFinancialEntry[] => {
  /* unchanged */ return [];
};

const FinanceDashboardScreen = () => {
  const { user_id } = useLocalSearchParams<{ user_id: string }>();
  const navigation = useNavigation();
  const theme = useTheme();
  const [subTypes, setSubTypes] = useState<string[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [fullHistoricalData, setFullHistoricalData] = useState<
    DailyFinancialEntry[]
  >([]);

  useEffect(() => {
    navigation.setOptions({ title: "Finance Dashboard" });
  }, [navigation]);

  const processSalesData = useCallback(
    (
      sales: SaleRecord[],
      userSubTypes: string[]
    ): Map<string, MetricBreakdown> => {
      /* unchanged */ return new Map();
    },
    []
  );
  const processExpensesData = useCallback(
    (
      expenses: ExpenseRecord[],
      userSubTypes: string[]
    ): Map<string, ProcessedExpensesForDay> => {
      /* unchanged */ return new Map();
    },
    []
  );

  useEffect(() => {
    if (!user_id) {
      setIsLoadingData(false);
      return;
    }
    const fetchInitialData = async () => {
      setIsLoadingData(true);
      try {
        const [userResponse, salesResponse, expensesResponse] =
          await Promise.all([
            axiosInstance.get(`/user/${user_id}`),
            axiosInstance.get<{ sales: SaleRecord[] }>(
              `/sales/user/${user_id}`
            ),
            axiosInstance.get<{ expenses: ExpenseRecord[] }>(
              `/expenses/user/${user_id}`
            ),
          ]);
        const fetchedSubTypes = userResponse.data.data?.user?.sub_type || [];
        const finalSubTypes = new Set<string>(fetchedSubTypes);
        const salesRecords = salesResponse.data.sales || [];
        salesRecords.forEach((s) =>
          finalSubTypes.add(s.occupation || "Uncategorized")
        );
        const processedSales = processSalesData(salesRecords, fetchedSubTypes);
        const expenseRecords = expensesResponse.data.expenses || [];
        expenseRecords.forEach((e) =>
          finalSubTypes.add(e.occupation || "Uncategorized")
        );
        const processedExpenses = processExpensesData(
          expenseRecords,
          fetchedSubTypes
        );
        setSubTypes(Array.from(finalSubTypes));
        const generatedData = generateDailyFinancialData(
          TOTAL_DAYS_FOR_HISTORICAL_DATA,
          Array.from(finalSubTypes),
          processedSales,
          processedExpenses
        );
        setFullHistoricalData(generatedData);
      } catch (error) {
        Alert.alert("Error", "Could not load financial data.");
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchInitialData();
  }, [user_id, processSalesData, processExpensesData]);

  const currentMonthCardData = useMemo(() => {
    const currentMonthStart = startOfMonth(today);
    const currentMonthEnd = endOfMonth(today);
    let totals = { revenue: 0, cogs: 0, expenses: 0 };
    fullHistoricalData.forEach((entry) => {
      if (
        isWithinInterval(entry.date, {
          start: currentMonthStart,
          end: currentMonthEnd,
        })
      ) {
        totals.revenue += entry.revenue.total;
        totals.cogs += entry.cogs.total;
        totals.expenses += entry.expenses.total;
      }
    });
    const grossProfit = totals.revenue - totals.cogs;
    const netProfit = grossProfit - totals.expenses;
    const isDark = theme.dark;
    return [
      {
        title: "Revenue",
        value: totals.revenue,
        icon: faSackDollar,
        bgColor: isDark ? "#14532d" : "#dcfce7",
        iconValueColor: isDark ? "#86efac" : "#16a34a",
      },
      {
        title: "COGS",
        value: totals.cogs,
        icon: faCartArrowDown,
        bgColor: isDark ? "#713f12" : "#fef3c7",
        iconValueColor: isDark ? "#fcd34d" : "#b45309",
      },
      {
        title: "Gross Profit",
        value: grossProfit,
        icon: faChartPie,
        bgColor: isDark ? "#164e63" : "#cffafe",
        iconValueColor: isDark ? "#67e8f9" : "#0891b2",
      },
      {
        title: "Expenses",
        value: totals.expenses,
        icon: faCreditCard,
        bgColor: isDark ? "#7f1d1d" : "#fee2e2",
        iconValueColor: isDark ? "#fca5a5" : "#b91c1c",
      },
      {
        title: "Net Profit",
        value: netProfit,
        icon: faPiggyBank,
        bgColor: isDark ? "#1e3a8a" : "#dbeafe",
        iconValueColor: isDark ? "#93c5fd" : "#2563eb",
      },
    ];
  }, [fullHistoricalData, theme.dark]);

  const renderContent = () => {
    if (isLoadingData) {
      return (
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" />
        </View>
      );
    }
    return (
      <View style={styles.widgetContainer}>
        <View style={styles.cardGrid}>
          {currentMonthCardData.map((card, index) => (
            <View key={index} style={styles.cardWrapper}>
              <BudgetCard {...card} date={today} />
            </View>
          ))}
        </View>
        <TrendGraph
          initialFullHistoricalData={fullHistoricalData}
          initialSubTypes={subTypes}
          isLoadingData={isLoadingData}
        />
        <CompareGraph
          initialFullHistoricalData={fullHistoricalData}
          isLoadingData={isLoadingData}
        />
        <WorkingCapital />
      </View>
    );
  };

  return (
    <PlatformLayout>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: theme.colors.background }}
      >
        <Appbar.Header elevated>
          <Appbar.Action
            icon={() => (
              <FontAwesomeIcon
                icon={faArrowLeft}
                size={22}
                color={theme.colors.onSurface}
              />
            )}
            onPress={() => router.back()}
          />
          <Appbar.Content title="Finance Dashboard" />
        </Appbar.Header>
        <ScrollView contentContainerStyle={styles.container}>
          {renderContent()}
        </ScrollView>
      </SafeAreaView>
    </PlatformLayout>
  );
};

const styles = StyleSheet.create({
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: { padding: 16 },
  widgetContainer: { gap: 32 },
  cardGrid: { flexDirection: "row", flexWrap: "wrap", margin: -8 },
  cardWrapper: { width: "50%", padding: 8 },
});

export default FinanceDashboardScreen;
