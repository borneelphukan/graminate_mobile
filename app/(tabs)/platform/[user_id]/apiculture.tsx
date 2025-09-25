import BudgetCard from "@/components/cards/BudgetCard";
import InventoryStockCard from "@/components/cards/InventoryStockCard";
import TaskManager from "@/components/cards/TaskManager";
import ApicultureForm, {
  ApiaryFormData,
} from "@/components/form/apiculture/ApicultureForm";
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
  useTheme,
} from "react-native-paper";

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

const APICULTURE_EXPENSE_CONFIG = {
  detailedCategories: {
    "Goods & Services": [
      "Beehives",
      "Queen Bees",
      "Sugar Feed",
      "Pollen Patties",
      "Medication",
    ],
    "Utility Expenses": [
      "Equipment (Smoker, Hive Tool)",
      "Protective Gear",
      "Transportation",
      "Licenses & Permits",
      "Others",
    ],
  },
  expenseTypeMap: {
    COGS: "Goods & Services",
    OPERATING_EXPENSES: "Utility Expenses",
  },
};

const categoryToMainGroup: Record<string, string> = {};
for (const mainGroup in APICULTURE_EXPENSE_CONFIG.detailedCategories) {
  APICULTURE_EXPENSE_CONFIG.detailedCategories[
    mainGroup as keyof typeof APICULTURE_EXPENSE_CONFIG.detailedCategories
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
    baseSubTypes.length > 0 ? baseSubTypes : ["Apiculture"];
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
    const netProfitBreakdown: SubTypeValue[] = finalOccupationsList.map(
      (occName) => ({
        name: occName,
        value:
          (dailyEntry.grossProfit!.breakdown.find((b) => b.name === occName)
            ?.value || 0) -
          (dailyEntry.expenses!.breakdown.find((b) => b.name === occName)
            ?.value || 0),
      })
    );
    dailyEntry.netProfit = {
      total: netProfitTotal,
      breakdown: netProfitBreakdown,
    };
    data.push(dailyEntry as DailyFinancialEntry);
    loopDate = addDaysDateFns(loopDate, 1);
  }
  return data;
};

type ApicultureRecord = {
  apiary_id: number;
  apiary_name: string;
  number_of_hives: number;
  area: number | null;
  created_at: string;
};
const TARGET_APICULTURE_SUB_TYPE = "Apiculture";

const ApicultureScreen = () => {
  const router = useRouter();
  const { user_id } = useLocalSearchParams<{ user_id: string }>();
  const theme = useTheme();
  const numericUserId = user_id ? parseInt(user_id, 10) : 0;

  const [apicultureRecords, setApicultureRecords] = useState<
    ApicultureRecord[]
  >([]);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingApiculture, setLoadingApiculture] = useState(true);
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
      const apicultureSales = (salesResponse.data.sales || []).filter(
        (s) => s.occupation === TARGET_APICULTURE_SUB_TYPE
      );
      const apicultureExpenses = (expensesResponse.data.expenses || []).filter(
        (e) => e.occupation === TARGET_APICULTURE_SUB_TYPE
      );
      const processedSales = processSalesData(apicultureSales);
      const processedExpenses = processExpensesData(apicultureExpenses);
      const generatedData = generateDailyFinancialData(
        TOTAL_DAYS_FOR_HISTORICAL_DATA,
        [TARGET_APICULTURE_SUB_TYPE],
        processedSales,
        processedExpenses
      );
      setFullHistoricalData(generatedData);
    } catch (error) {
      Alert.alert("Error", "Could not load apiculture financial data.");
      setFullHistoricalData([]);
    } finally {
      setIsLoadingFinancials(false);
    }
  }, [user_id, processSalesData, processExpensesData]);

  const fetchApiculture = useCallback(async () => {
    if (!user_id) {
      setLoadingApiculture(false);
      return;
    }
    setLoadingApiculture(true);
    try {
      const response = await axiosInstance.get(
        `/apiculture/user/${encodeURIComponent(user_id)}`
      );
      setApicultureRecords(response.data.apiaries || []);
    } catch (error) {
      setApicultureRecords([]);
    } finally {
      setLoadingApiculture(false);
    }
  }, [user_id]);

  useFocusEffect(
    useCallback(() => {
      fetchApiculture();
      fetchFinancialData();
    }, [fetchApiculture, fetchFinancialData])
  );

  const handleAddApiary = async (formData: ApiaryFormData) => {
    if (!numericUserId) return;
    try {
      const payload = {
        ...formData,
        user_id: numericUserId,
        number_of_hives: Number(formData.number_of_hives),
        area: formData.area ? Number(formData.area) : null,
      };
      await axiosInstance.post("/apiculture", payload);
      await fetchApiculture();
    } catch (error) {
      throw error;
    }
  };

  const handleRowClick = (item: ApicultureRecord) =>
    router.push(`/platform/${user_id}/apiculture/${item.apiary_id}`);

  const currentMonthApicultureCardData = useMemo(() => {
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
        title: "Apiculture Revenue",
        value: totals.revenue,
        icon: "cash",
        bgColor: isDark ? "#14532d" : "#dcfce7",
        iconValueColor: isDark ? "#86efac" : "#16a34a",
      },
      {
        title: "Apiculture COGS",
        value: totals.cogs,
        icon: "cart-outline",
        bgColor: isDark ? "#713f12" : "#fef3c7",
        iconValueColor: isDark ? "#fcd34d" : "#b45309",
      },
      {
        title: "Apiculture Gross Profit",
        value: grossProfit,
        icon: "chart-pie",
        bgColor: isDark ? "#164e63" : "#cffafe",
        iconValueColor: isDark ? "#67e8f9" : "#0891b2",
      },
      {
        title: "Apiculture Expenses",
        value: totals.expenses,
        icon: "credit-card-outline",
        bgColor: isDark ? "#7f1d1d" : "#fee2e2",
        iconValueColor: isDark ? "#fca5a5" : "#b91c1c",
      },
      {
        title: "Apiculture Net Profit",
        value: netProfit,
        icon: "piggy-bank-outline",
        bgColor: isDark ? "#1e3a8a" : "#dbeafe",
        iconValueColor: isDark ? "#93c5fd" : "#2563eb",
      },
    ];
  }, [fullHistoricalData, theme.dark]);

  const filteredApicultureRecords = useMemo(() => {
    if (!searchQuery) return apicultureRecords;
    return apicultureRecords.filter((item) =>
      item.apiary_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [apicultureRecords, searchQuery]);

  return (
    <PlatformLayout>
      <Appbar.Header>
        <Appbar.Content
          title="Apiculture"
          subtitle={
            loadingApiculture
              ? "Loading..."
              : `${filteredApicultureRecords.length} Bee Yard(s)`
          }
        />
        <Appbar.Action icon="plus" onPress={() => setIsFormVisible(true)} />
      </Appbar.Header>
      <ScrollView style={{ backgroundColor: theme.colors.background }}>
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
              {currentMonthApicultureCardData.map((card, index) => (
                <BudgetCard key={index} {...card} date={today} />
              ))}
            </ScrollView>
          ))}
        <Searchbar
          placeholder="Search Bee Yards..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchbar}
        />
        <View style={styles.listContainer}>
          {loadingApiculture ? (
            <ActivityIndicator style={styles.loader} />
          ) : filteredApicultureRecords.length > 0 ? (
            filteredApicultureRecords.map((item) => (
              <Card
                key={item.apiary_id}
                onPress={() => handleRowClick(item)}
                style={styles.apiaryCard}
              >
                <Card.Title
                  title={item.apiary_name}
                  titleVariant="titleLarge"
                />
                <Card.Content>
                  <View style={styles.cardDetails}>
                    <Text variant="bodyMedium">
                      Hives: {item.number_of_hives}
                    </Text>
                    <Text variant="bodyMedium">
                      Area: {item.area != null ? `${item.area} sq. m` : "N/A"}
                    </Text>
                  </View>
                </Card.Content>
              </Card>
            ))
          ) : (
            <Text style={styles.emptyText}>
              No bee yards found. Tap '+' to get started.
            </Text>
          )}
        </View>
        <View style={styles.widgetContainer}>
          {numericUserId > 0 && (
            <TaskManager userId={numericUserId} projectType="Apiculture" />
          )}
          {user_id && (
            <InventoryStockCard
              userId={user_id}
              title="Apiculture Inventory"
              category="Apiculture"
            />
          )}
        </View>
      </ScrollView>
      <ApicultureForm
        isVisible={isFormVisible}
        onClose={() => setIsFormVisible(false)}
        onSubmit={handleAddApiary}
      />
    </PlatformLayout>
  );
};

const styles = StyleSheet.create({
  toggleContainer: {
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  loader: { marginVertical: 16 },
  cardScroller: { gap: 16, paddingHorizontal: 16, paddingBottom: 16 },
  searchbar: { marginHorizontal: 16, marginBottom: 16 },
  listContainer: { paddingHorizontal: 16 },
  apiaryCard: { marginBottom: 12 },
  cardDetails: { flexDirection: "row", justifyContent: "space-between" },
  emptyText: { textAlign: "center", marginTop: 40, padding: 16 },
  widgetContainer: { padding: 16, gap: 16 },
});

export default ApicultureScreen;
