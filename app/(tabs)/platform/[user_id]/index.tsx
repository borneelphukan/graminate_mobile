import CompareGraph from "@/components/cards/CompareGraph";
import InventoryStockCard from "@/components/cards/InventoryStockCard";
import TaskManager from "@/components/cards/TaskManager";
import TrendGraph from "@/components/cards/TrendGraph";
import PlatformLayout from "@/components/layout/PlatformLayout";

import WidgetModal from "@/components/modals/WidgetModal";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import {
  addDays as addDaysDateFns,
  format as formatDateFns,
  parseISO,
  subDays as subDaysDateFns,
} from "date-fns";
import { useLocalSearchParams, useNavigation } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Calendar } from "react-native-calendars";
import {
  ActivityIndicator,
  Button,
  Divider,
  Modal,
  Portal,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const axiosInstance = axios.create({ baseURL: API_URL });
axiosInstance.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

type TimeFormatOption = "12-hour" | "24-hour";
type User = {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  business_name?: string;
  language?: string;
  time_format?: string;
  type?: string;
  sub_type?: string[];
  widgets?: string[];
};
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
  const allOccupations = new Set<string>(baseSubTypes);
  if (actualSalesData) {
    actualSalesData.forEach((dayData) =>
      dayData.breakdown.forEach((bd) => allOccupations.add(bd.name))
    );
  }
  if (actualProcessedExpenses) {
    actualProcessedExpenses.forEach((dayData) => {
      dayData.cogs.breakdown.forEach((bd) => allOccupations.add(bd.name));
      dayData.expenses.breakdown.forEach((bd) => allOccupations.add(bd.name));
    });
  }
  if (allOccupations.size === 0 && baseSubTypes.length === 0) {
    allOccupations.add("Uncategorized");
  }
  const finalOccupationsList = Array.from(allOccupations);
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
          (grossProfitBreakdown.find((b) => b.name === occName)?.value || 0) -
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

const FirstLoginModal = ({
  isOpen,
  onClose,
  onSubmit,
  userId,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (businessName: string, businessType: string) => void;
  userId: string;
}) => {
  const theme = useTheme();
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");

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
        <Text variant="titleLarge" style={styles.modalTitle}>
          Setup Your Account
        </Text>
        <Text variant="bodyMedium" style={styles.modalSubtitle}>
          Please provide your business details to continue.
        </Text>
        <TextInput
          label="Business Name"
          mode="outlined"
          value={businessName}
          onChangeText={setBusinessName}
          style={styles.modalInput}
        />
        <TextInput
          label="Business Type"
          mode="outlined"
          value={businessType}
          onChangeText={setBusinessType}
          style={styles.modalInput}
        />
        <Button
          mode="contained"
          onPress={() => onSubmit(businessName, businessType)}
          style={styles.modalButton}
        >
          Save & Continue
        </Button>
      </Modal>
    </Portal>
  );
};

const DashboardScreen = () => {
  const navigation = useNavigation();
  const { user_id } = useLocalSearchParams<{ user_id: string }>();
  const theme = useTheme();

  const [userData, setUserData] = useState<User | null>(null);
  const [isUserDataLoading, setIsUserDataLoading] = useState<boolean>(true);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState<boolean>(false);
  const [isWidgetModalOpen, setIsWidgetModalOpen] = useState<boolean>(false);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  const [successModal, setSuccessModal] = useState({
    isOpen: false,
    title: "",
    text: "",
  });
  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    title: "",
    text: "",
  });
  const [fetchErrorModal, setFetchErrorModal] = useState({
    isOpen: false,
    title: "",
    text: "",
  });

  const [financeSubTypes, setFinanceSubTypes] = useState<string[]>([]);
  const [isFinanceLoading, setIsFinanceLoading] = useState(true);
  const [fullHistoricalData, setFullHistoricalData] = useState<
    DailyFinancialEntry[]
  >([]);

  const [timeFormat, setTimeFormat] = useState<TimeFormatOption>("24-hour");
  const [widgets, setWidgets] = useState<string[]>([]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const updateUserWidgets = async (userId: string, newWidgets: string[]) => {
    await axiosInstance.put(`/user/${userId}`, { widgets: newWidgets });
    setWidgets(newWidgets);
  };

  useEffect(() => {
    if (!user_id) return;
    let isMounted = true;
    setIsUserDataLoading(true);
    const fetchUserData = async () => {
      try {
        const response = await axiosInstance.get(`/user/${user_id}`);
        const fetchedUser = response.data?.data?.user as User | undefined;
        if (fetchedUser && isMounted) {
          setUserData(fetchedUser);
          navigation.setOptions({
            title: `Dashboard - ${fetchedUser.first_name}`,
          });
          if (fetchedUser.time_format)
            setTimeFormat(fetchedUser.time_format as TimeFormatOption);
          setWidgets(fetchedUser.widgets || []);
          if (!fetchedUser.business_name || !fetchedUser.type)
            setIsSetupModalOpen(true);
        } else if (isMounted) {
          throw new Error("User not found");
        }
      } catch (error) {
        if (isMounted)
          setFetchErrorModal({
            isOpen: true,
            title: "Error",
            text: "Failed to fetch user data. Please log in again.",
          });
      } finally {
        if (isMounted) setIsUserDataLoading(false);
      }
    };
    fetchUserData();
    return () => {
      isMounted = false;
    };
  }, [user_id, navigation]);

  const processSalesData = useCallback(
    (
      sales: SaleRecord[],
      userSubTypes: string[]
    ): Map<string, MetricBreakdown> => {
      const dailyRevenueMap = new Map<string, MetricBreakdown>();
      const occupationsEncountered = new Set<string>(userSubTypes);
      sales.forEach((sale) => {
        occupationsEncountered.add(sale.occupation || "Uncategorized");
      });
      const allRelevantOccupations = Array.from(occupationsEncountered);
      sales.forEach((sale) => {
        const saleDateStr = formatDateFns(
          parseISO(sale.sales_date),
          "yyyy-MM-dd"
        );
        let totalSaleAmount = (sale.quantities_sold || []).reduce(
          (acc, qty, i) => acc + qty * (sale.prices_per_unit?.[i] || 0),
          0
        );
        const occupation = sale.occupation || "Uncategorized";
        if (!dailyRevenueMap.has(saleDateStr)) {
          dailyRevenueMap.set(saleDateStr, {
            total: 0,
            breakdown: allRelevantOccupations.map((st) => ({
              name: st,
              value: 0,
            })),
          });
        }
        const dayData = dailyRevenueMap.get(saleDateStr)!;
        dayData.total += totalSaleAmount;
        const occupationEntry = dayData.breakdown.find(
          (b) => b.name === occupation
        );
        if (occupationEntry) occupationEntry.value += totalSaleAmount;
      });
      return dailyRevenueMap;
    },
    []
  );

  const processExpensesData = useCallback(
    (
      expenses: ExpenseRecord[],
      userSubTypes: string[]
    ): Map<string, ProcessedExpensesForDay> => {
      const dailyExpensesMap = new Map<string, ProcessedExpensesForDay>();
      const occupationsEncountered = new Set<string>(userSubTypes);
      expenses.forEach((expense) => {
        occupationsEncountered.add(expense.occupation || "Uncategorized");
      });
      const allRelevantOccupations = Array.from(occupationsEncountered);
      expenses.forEach((expense) => {
        const expenseDateStr = formatDateFns(
          parseISO(expense.date_created),
          "yyyy-MM-dd"
        );
        const expenseAmount = Number(expense.expense) || 0;
        const occupation = expense.occupation || "Uncategorized";
        const mainCategoryGroup = categoryToMainGroup[expense.category];
        let expenseType: "cogs" | "expenses" | null =
          mainCategoryGroup === EXPENSE_TYPE_MAP.COGS
            ? "cogs"
            : mainCategoryGroup === EXPENSE_TYPE_MAP.OPERATING_EXPENSES
            ? "expenses"
            : null;
        if (!expenseType) return;
        if (!dailyExpensesMap.has(expenseDateStr)) {
          dailyExpensesMap.set(expenseDateStr, {
            cogs: {
              total: 0,
              breakdown: allRelevantOccupations.map((st) => ({
                name: st,
                value: 0,
              })),
            },
            expenses: {
              total: 0,
              breakdown: allRelevantOccupations.map((st) => ({
                name: st,
                value: 0,
              })),
            },
          });
        }
        const dayDataContainer = dailyExpensesMap.get(expenseDateStr)!;
        const targetMetricBreakdown = dayDataContainer[expenseType];
        targetMetricBreakdown.total += expenseAmount;
        const occupationEntry = targetMetricBreakdown.breakdown.find(
          (b) => b.name === occupation
        );
        if (occupationEntry) occupationEntry.value += expenseAmount;
      });
      return dailyExpensesMap;
    },
    []
  );

  useEffect(() => {
    if (!user_id) {
      setIsFinanceLoading(false);
      return;
    }
    const fetchFinanceData = async () => {
      setIsFinanceLoading(true);
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
        const salesRecords = salesResponse.data.sales || [];
        const expenseRecords = expensesResponse.data.expenses || [];
        const processedSales = processSalesData(salesRecords, fetchedSubTypes);
        const processedExpenses = processExpensesData(
          expenseRecords,
          fetchedSubTypes
        );
        const allSubTypes = new Set<string>(fetchedSubTypes);
        salesRecords.forEach((s) =>
          allSubTypes.add(s.occupation || "Uncategorized")
        );
        expenseRecords.forEach((e) =>
          allSubTypes.add(e.occupation || "Uncategorized")
        );
        setFinanceSubTypes(Array.from(allSubTypes));
        const generatedData = generateDailyFinancialData(
          TOTAL_DAYS_FOR_HISTORICAL_DATA,
          Array.from(allSubTypes),
          processedSales,
          processedExpenses
        );
        setFullHistoricalData(generatedData);
      } catch (error) {
        Alert.alert("Error", "Could not load financial widget data.");
      } finally {
        setIsFinanceLoading(false);
      }
    };
    fetchFinanceData();
  }, [user_id, processSalesData, processExpensesData]);

  useEffect(() => {
    if (successModal.isOpen)
      Alert.alert(successModal.title, successModal.text, [
        {
          text: "OK",
          onPress: () =>
            setSuccessModal({ isOpen: false, title: "", text: "" }),
        },
      ]);
  }, [successModal]);
  useEffect(() => {
    if (errorModal.isOpen)
      Alert.alert(errorModal.title, errorModal.text, [
        {
          text: "OK",
          onPress: () => setErrorModal({ isOpen: false, title: "", text: "" }),
        },
      ]);
  }, [errorModal]);
  useEffect(() => {
    if (fetchErrorModal.isOpen)
      Alert.alert(fetchErrorModal.title, fetchErrorModal.text, [
        {
          text: "OK",
          onPress: () =>
            setFetchErrorModal({ isOpen: false, title: "", text: "" }),
        },
      ]);
  }, [fetchErrorModal]);

  const handleFirstLogin = async (
    businessName: string,
    businessType: string
  ) => {
    try {
      await axiosInstance.put(`/user/${user_id}`, {
        business_name: businessName,
        type: businessType,
      });
      setSuccessModal({
        isOpen: true,
        title: "Welcome!",
        text: "Your account is now set up.",
      });
      setUserData((prev) =>
        prev
          ? { ...prev, business_name: businessName, type: businessType }
          : prev
      );
      setIsSetupModalOpen(false);
    } catch (error) {
      setErrorModal({
        isOpen: true,
        title: "Error",
        text: "Failed to update business info.",
      });
    }
  };

  const handleSaveWidgets = async (newWidgets: string[]) => {
    if (!user_id) return;
    try {
      await updateUserWidgets(user_id, newWidgets);
      setIsWidgetModalOpen(false);
      setSuccessModal({
        isOpen: true,
        title: "Success",
        text: "Your widget preferences have been saved.",
      });
    } catch (error) {
      setErrorModal({
        isOpen: true,
        title: "Error",
        text: "Failed to update widgets.",
      });
    }
  };

  const formatDate = (date: Date) =>
    date.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  const formatTime = (date: Date) =>
    date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: timeFormat === "12-hour",
    });

  return (
    <PlatformLayout>
      <SafeAreaView
        style={[styles.flex, { backgroundColor: theme.colors.background }]}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.header}>
            <View>
              <Text variant="headlineSmall">
                {isUserDataLoading
                  ? "Loading..."
                  : `Hello ${userData?.first_name || "User"},`}
              </Text>
            </View>
            <View style={styles.dateTimeContainer}>
              <Text variant="titleMedium">{formatDate(currentDateTime)}</Text>
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                {formatTime(currentDateTime)}
              </Text>
            </View>
          </View>
          <Divider style={styles.divider} />
          <Button
            mode="text"
            onPress={() => setIsWidgetModalOpen(true)}
            style={styles.manageButton}
          >
            Manage Widgets
          </Button>
          <View style={styles.widgetContainer}>
            {isUserDataLoading ? (
              <ActivityIndicator size="large" />
            ) : (
              widgets.map((widgetName) => {
                if (widgetName === "Task Calendar")
                  return <Calendar key={widgetName} />;
                if (widgetName === "Trend Graph")
                  return (
                    <TrendGraph
                      key={widgetName}
                      initialFullHistoricalData={fullHistoricalData}
                      initialSubTypes={financeSubTypes}
                      isLoadingData={isFinanceLoading}
                    />
                  );
                if (widgetName === "Compare Graph")
                  return (
                    <CompareGraph
                      key={widgetName}
                      initialFullHistoricalData={fullHistoricalData}
                      isLoadingData={isFinanceLoading}
                    />
                  );

                const subTypeMatch = userData?.sub_type?.find((subType) =>
                  widgetName.startsWith(subType)
                );
                if (subTypeMatch) {
                  if (widgetName.endsWith("Task Manager"))
                    return (
                      <TaskManager
                        key={widgetName}
                        userId={parseInt(user_id!, 10)}
                        projectType={subTypeMatch}
                      />
                    );
                  if (widgetName.endsWith("Inventory Stock"))
                    return (
                      <InventoryStockCard
                        key={widgetName}
                        userId={user_id}
                        title={`${subTypeMatch} Supplies`}
                        category={subTypeMatch}
                      />
                    );
                }
                return null;
              })
            )}
          </View>
        </ScrollView>
        {user_id && (
          <FirstLoginModal
            isOpen={isSetupModalOpen}
            userId={user_id}
            onSubmit={handleFirstLogin}
            onClose={() => setIsSetupModalOpen(false)}
          />
        )}
        <WidgetModal
          isOpen={isWidgetModalOpen}
          onClose={() => setIsWidgetModalOpen(false)}
          onSave={handleSaveWidgets}
          initialSelectedWidgets={widgets}
          userSubTypes={userData?.sub_type || []}
        />
      </SafeAreaView>
    </PlatformLayout>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  dateTimeContainer: { alignItems: "flex-end" },
  divider: { marginVertical: 8 },
  manageButton: { alignSelf: "flex-start", marginBottom: 16 },
  widgetContainer: { gap: 24 },
  modalContent: { padding: 20, margin: 20, borderRadius: 16 },
  modalTitle: { marginBottom: 8 },
  modalSubtitle: { marginBottom: 16 },
  modalInput: { marginBottom: 12 },
  modalButton: { marginTop: 8 },
});

export default DashboardScreen;
