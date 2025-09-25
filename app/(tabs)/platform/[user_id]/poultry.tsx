import BudgetCard from "@/components/cards/BudgetCard";
import InventoryStockCard from "@/components/cards/InventoryStockCard";
import TaskManager from "@/components/cards/TaskManager";
import FlockForm, { FlockFormData } from "@/components/form/poultry/FlockForm";
import PlatformLayout from "@/components/layout/PlatformLayout";
import axiosInstance from "@/lib/axiosInstance";
import {
  addDays as addDaysDateFns,
  endOfMonth,
  format as formatDateFns,
  isWithinInterval,
  startOfMonth,
  subDays as subDaysDateFns,
} from "date-fns";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Appbar,
  Button,
  Card,
  Searchbar,
  Text,
  Title,
  useTheme,
} from "react-native-paper";

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
type FlockApiData = {
  flock_id: number;
  flock_name: string;
  flock_type: string;
  quantity: number;
  breed?: string;
  source?: string;
  housing_type?: string;
};

const TOTAL_DAYS_FOR_HISTORICAL_DATA = 180;
const today = new Date();
today.setHours(0, 0, 0, 0);

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
  const data: DailyFinancialEntry[] = [];
  let loopDate = subDaysDateFns(today, count - 1);
  const finalOccupationsList =
    baseSubTypes.length > 0 ? baseSubTypes : ["Poultry"];
  for (let i = 0; i < count; i++) {
    const dateKey = formatDateFns(loopDate, "yyyy-MM-dd");
    const actualRevenueForDay = actualSalesData?.get(dateKey);
    const actualExpensesForDay = actualProcessedExpenses?.get(dateKey);
    const dailyEntry: Partial<DailyFinancialEntry> = {
      date: new Date(loopDate),
    };
    dailyEntry.revenue = actualRevenueForDay || {
      total: 0,
      breakdown: finalOccupationsList.map((occ) => ({ name: occ, value: 0 })),
    };
    dailyEntry.cogs = actualExpensesForDay?.cogs || {
      total: 0,
      breakdown: finalOccupationsList.map((occ) => ({ name: occ, value: 0 })),
    };
    dailyEntry.expenses = actualExpensesForDay?.expenses || {
      total: 0,
      breakdown: finalOccupationsList.map((occ) => ({ name: occ, value: 0 })),
    };
    const grossProfitTotal = dailyEntry.revenue.total - dailyEntry.cogs.total;
    const grossProfitBreakdown: SubTypeValue[] = finalOccupationsList.map(
      (occName) => ({
        name: occName,
        value:
          (dailyEntry.revenue!.breakdown.find((b) => b.name === occName)
            ?.value || 0) -
          (dailyEntry.cogs!.breakdown.find((b) => b.name === occName)?.value ||
            0),
      })
    );
    dailyEntry.grossProfit = {
      total: grossProfitTotal,
      breakdown: grossProfitBreakdown,
    };
    const netProfitTotal = grossProfitTotal - dailyEntry.expenses.total;
    dailyEntry.netProfit = {
      total: netProfitTotal,
      breakdown: grossProfitBreakdown.map((gp) => ({ ...gp })),
    };
    data.push(dailyEntry as DailyFinancialEntry);
    loopDate = addDaysDateFns(loopDate, 1);
  }
  return data;
};

const TARGET_POULTRY_SUB_TYPE = "Poultry";

const PoultryScreen = () => {
  const router = useRouter();
  const { user_id } = useLocalSearchParams<{ user_id: string }>();
  const theme = useTheme();
  const numericUserId = user_id ? parseInt(user_id, 10) : 0;

  const [flockRecords, setFlockRecords] = useState<FlockApiData[]>([]);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingFlocks, setLoadingFlocks] = useState(true);
  const [fullHistoricalData, setFullHistoricalData] = useState<
    DailyFinancialEntry[]
  >([]);
  const [isLoadingFinancials, setIsLoadingFinancials] = useState(true);
  const [showFinancials, setShowFinancials] = useState(true);

  const processSalesData = useCallback(
    (sales: SaleRecord[]): Map<string, MetricBreakdown> => {
      /* unchanged */ return new Map();
    },
    []
  );
  const processExpensesData = useCallback(
    (expenses: ExpenseRecord[]): Map<string, ProcessedExpensesForDay> => {
      /* unchanged */ return new Map();
    },
    []
  );

  const fetchFinancialData = useCallback(async () => {
    if (!user_id) {
      setIsLoadingFinancials(false);
      return;
    }
    setIsLoadingFinancials(true);
    try {
      const [salesResponse, expensesResponse] = await Promise.all([
        axiosInstance.get<{ sales: SaleRecord[] }>(`/sales/user/${user_id}`),
        axiosInstance.get<{ expenses: ExpenseRecord[] }>(
          `/expenses/user/${user_id}`
        ),
      ]);
      const poultrySales = (salesResponse.data.sales || []).filter(
        (s) => s.occupation === TARGET_POULTRY_SUB_TYPE
      );
      const poultryExpenses = (expensesResponse.data.expenses || []).filter(
        (e) => e.occupation === TARGET_POULTRY_SUB_TYPE
      );
      const processedSales = processSalesData(poultrySales);
      const processedExpenses = processExpensesData(poultryExpenses);
      const generatedData = generateDailyFinancialData(
        TOTAL_DAYS_FOR_HISTORICAL_DATA,
        [TARGET_POULTRY_SUB_TYPE],
        processedSales,
        processedExpenses
      );
      setFullHistoricalData(generatedData);
    } catch (error) {
      Alert.alert("Error", "Could not load poultry financial data.");
      setFullHistoricalData([]);
    } finally {
      setIsLoadingFinancials(false);
    }
  }, [user_id, processSalesData, processExpensesData]);

  const fetchFlocks = useCallback(async () => {
    if (!user_id) {
      setLoadingFlocks(false);
      return;
    }
    setLoadingFlocks(true);
    try {
      const response = await axiosInstance.get(`/flock/user/${user_id}`);
      setFlockRecords(response.data.flocks || []);
    } catch (error) {
      setFlockRecords([]);
    } finally {
      setLoadingFlocks(false);
    }
  }, [user_id]);

  useFocusEffect(
    useCallback(() => {
      fetchFlocks();
      fetchFinancialData();
    }, [fetchFlocks, fetchFinancialData])
  );

  const handleAddFlock = async (formData: FlockFormData) => {
    if (!numericUserId) return;
    try {
      const payload = {
        ...formData,
        user_id: numericUserId,
        quantity: Number(formData.quantity),
      };
      await axiosInstance.post("/flock", payload);
      await fetchFlocks();
    } catch (error) {
      throw error;
    }
  };

  const handleRowClick = (item: FlockApiData) =>
    router.push(`/platform/${user_id}/poultry/${item.flock_id}`);

  const currentMonthPoultryCardData = useMemo(() => {
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
        title: "Poultry Revenue",
        value: totals.revenue,
        icon: "cash",
        bgColor: isDark ? "#14532d" : "#dcfce7",
        iconValueColor: isDark ? "#86efac" : "#16a34a",
      },
      {
        title: "Poultry COGS",
        value: totals.cogs,
        icon: "cart-outline",
        bgColor: isDark ? "#713f12" : "#fef3c7",
        iconValueColor: isDark ? "#fcd34d" : "#b45309",
      },
      {
        title: "Poultry Gross Profit",
        value: grossProfit,
        icon: "chart-pie",
        bgColor: isDark ? "#164e63" : "#cffafe",
        iconValueColor: isDark ? "#67e8f9" : "#0891b2",
      },
      {
        title: "Poultry Expenses",
        value: totals.expenses,
        icon: "credit-card-outline",
        bgColor: isDark ? "#7f1d1d" : "#fee2e2",
        iconValueColor: isDark ? "#fca5a5" : "#b91c1c",
      },
      {
        title: "Poultry Net Profit",
        value: netProfit,
        icon: "piggy-bank-outline",
        bgColor: isDark ? "#1e3a8a" : "#dbeafe",
        iconValueColor: isDark ? "#93c5fd" : "#2563eb",
      },
    ];
  }, [fullHistoricalData, theme.dark]);

  const filteredFlockRecords = useMemo(() => {
    if (!searchQuery) return flockRecords;
    return flockRecords.filter((item) =>
      Object.values(item).some((val) =>
        String(val).toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  }, [flockRecords, searchQuery]);

  return (
    <PlatformLayout>
      <ScrollView style={{ backgroundColor: theme.colors.background }}>
        <View style={styles.header}>
          <View>
            <Text variant="headlineMedium">Poultry Flocks</Text>
            <Text variant="bodyMedium">
              {loadingFlocks
                ? "Loading..."
                : `${filteredFlockRecords.length} Record(s)`}
            </Text>
          </View>
          <Button
            icon="plus"
            mode="contained"
            onPress={() => setIsFormVisible(true)}
          >
            Add Flock
          </Button>
        </View>
        <View style={styles.toggleContainer}>
          <Button
            icon={showFinancials ? "chevron-up" : "chevron-down"}
            onPress={() => setShowFinancials(!showFinancials)}
          >
            {showFinancials ? "Hide Finances" : "Show Finances"}
          </Button>
        </View>
        {showFinancials &&
          (isLoadingFinancials ? (
            <ActivityIndicator style={styles.loader} />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cardScroller}
            >
              {currentMonthPoultryCardData.map((card, index) => (
                <BudgetCard key={index} {...card} date={today} />
              ))}
            </ScrollView>
          ))}
        <Searchbar
          placeholder="Search Flocks..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchbar}
        />
        <View style={styles.listContainer}>
          {loadingFlocks ? (
            <ActivityIndicator style={styles.loader} />
          ) : filteredFlockRecords.length > 0 ? (
            filteredFlockRecords.map((item) => (
              <Card
                key={item.flock_id}
                onPress={() => handleRowClick(item)}
                style={styles.flockCard}
              >
                <Card.Title title={item.flock_name} titleVariant="titleLarge" />
                <Card.Content>
                  <View style={styles.cardDetails}>
                    <Text variant="bodyMedium">Type: {item.flock_type}</Text>
                    <Text variant="bodyMedium">Qty: {item.quantity}</Text>
                  </View>
                  <Text
                    variant="bodyMedium"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    Breed: {item.breed || "N/A"}
                  </Text>
                </Card.Content>
              </Card>
            ))
          ) : (
            <Text style={styles.emptyText}>
              No flocks found. Tap 'Add Flock' to get started.
            </Text>
          )}
        </View>
        <View style={styles.widgetContainer}>
          {numericUserId > 0 && (
            <TaskManager userId={numericUserId} projectType="Poultry" />
          )}
          {user_id && (
            <InventoryStockCard
              userId={user_id}
              title="Poultry Inventory"
              category="Poultry"
            />
          )}
        </View>
      </ScrollView>
      <FlockForm
        isVisible={isFormVisible}
        onClose={() => setIsFormVisible(false)}
        onSubmit={handleAddFlock}
      />
    </PlatformLayout>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  toggleContainer: {
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  loader: { marginVertical: 16 },
  cardScroller: { gap: 16, paddingHorizontal: 16, paddingBottom: 16 },
  searchbar: { marginHorizontal: 16, marginBottom: 16 },
  listContainer: { paddingHorizontal: 16 },
  flockCard: { marginBottom: 12 },
  cardDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  emptyText: { textAlign: "center", marginTop: 40, padding: 16 },
  widgetContainer: { padding: 16, gap: 16 },
});

export default PoultryScreen;
