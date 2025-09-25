import axiosInstance from "@/lib/axiosInstance";
import {
  addDays as addDaysDateFns,
  format as formatDateFns,
  parseISO,
  subDays as subDaysDateFns,
} from "date-fns";
import { useCallback, useEffect, useMemo, useState } from "react";

export type SubTypeValue = { name: string; value: number };
export type MetricBreakdown = { total: number; breakdown: SubTypeValue[] };

export type DailyFinancialEntry = {
  date: Date;
  revenue: MetricBreakdown;
  cogs: MetricBreakdown;
  grossProfit: MetricBreakdown;
  expenses: MetricBreakdown;
  netProfit: MetricBreakdown;
};

export type SaleRecord = {
  sales_id: number;
  sales_date: string;
  occupation?: string;
  items_sold: string[];
  quantities_sold: number[];
  prices_per_unit?: number[];
};

export type ExpenseRecord = {
  expense_id: number;
  occupation?: string;
  category: string;
  expense: number;
  date_created: string;
};

export type ExpenseCategoryConfig = {
  detailedCategories: Record<string, string[]>;
  expenseTypeMap: { COGS: string; OPERATING_EXPENSES: string };
};

const TOTAL_DAYS_FOR_HISTORICAL_DATA = 180;
const today = new Date();
today.setHours(0, 0, 0, 0);

const createCategoryToMainGroupMap = (
  detailedCategories: Record<string, string[]>
): Record<string, string> => {
  const map: Record<string, string> = {};
  for (const mainGroup in detailedCategories) {
    detailedCategories[mainGroup].forEach((subCat) => {
      map[subCat] = mainGroup;
    });
  }
  return map;
};

type ProcessedExpensesForDay = {
  cogs: MetricBreakdown;
  expenses: MetricBreakdown;
};

const generateDailyFinancialData = (
  count: number,
  userSubTypesForGeneration: string[],
  actualSalesRevenueMap?: Map<string, MetricBreakdown>,
  actualProcessedExpenses?: Map<string, ProcessedExpensesForDay>
): DailyFinancialEntry[] => {
  const data: DailyFinancialEntry[] = [];
  let loopDate = subDaysDateFns(today, count - 1);

  for (let i = 0; i < count; i++) {
    const dateKey = formatDateFns(loopDate, "yyyy-MM-dd");

    const actualRevenueForDay = actualSalesRevenueMap?.get(dateKey);
    const actualExpensesForDay = actualProcessedExpenses?.get(dateKey);

    const dailyEntry: Partial<DailyFinancialEntry> = {
      date: new Date(loopDate),
    };

    dailyEntry.revenue = actualRevenueForDay || {
      total: 0,
      breakdown: userSubTypesForGeneration.map((occ) => ({
        name: occ,
        value: 0,
      })),
    };

    dailyEntry.cogs = actualExpensesForDay?.cogs || {
      total: 0,
      breakdown: userSubTypesForGeneration.map((occ) => ({
        name: occ,
        value: 0,
      })),
    };

    dailyEntry.expenses = actualExpensesForDay?.expenses || {
      total: 0,
      breakdown: userSubTypesForGeneration.map((occ) => ({
        name: occ,
        value: 0,
      })),
    };

    const grossProfitTotal = dailyEntry.revenue.total - dailyEntry.cogs.total;
    const grossProfitBreakdown: SubTypeValue[] = userSubTypesForGeneration.map(
      (occName) => {
        const revVal =
          dailyEntry.revenue!.breakdown.find((b) => b.name === occName)
            ?.value || 0;
        const cogsVal =
          dailyEntry.cogs!.breakdown.find((b) => b.name === occName)?.value ||
          0;
        return { name: occName, value: revVal - cogsVal };
      }
    );
    dailyEntry.grossProfit = {
      total: grossProfitTotal,
      breakdown: grossProfitBreakdown,
    };

    const netProfitTotal = grossProfitTotal - dailyEntry.expenses.total;
    const netProfitBreakdown: SubTypeValue[] = userSubTypesForGeneration.map(
      (occName) => {
        const gpVal =
          grossProfitBreakdown.find((b) => b.name === occName)?.value || 0;
        const expVal =
          dailyEntry.expenses!.breakdown.find((b) => b.name === occName)
            ?.value || 0;
        return { name: occName, value: gpVal - expVal };
      }
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

type Props = {
  userId: string | undefined;
  targetSubType: string;
  expenseCategoryConfig: ExpenseCategoryConfig;
};

export const useSubTypeFinancialData = ({
  userId,
  targetSubType,
  expenseCategoryConfig,
}: Props) => {
  const [fullHistoricalData, setFullHistoricalData] = useState<
    DailyFinancialEntry[]
  >([]);
  const [isLoadingFinancials, setIsLoadingFinancials] = useState(true);
  const [userSubTypes, setUserSubTypes] = useState<string[]>([]);

  const categoryToMainGroupMap = useMemo(
    () =>
      createCategoryToMainGroupMap(expenseCategoryConfig.detailedCategories),
    [expenseCategoryConfig.detailedCategories]
  );

  const processSalesData = useCallback(
    (
      sales: SaleRecord[],
      allUserSubTypes: string[]
    ): Map<string, MetricBreakdown> => {
      const dailyRevenueMap = new Map<string, MetricBreakdown>();
      const subTypesForProcessing = [
        ...new Set([...allUserSubTypes, targetSubType, "Uncategorized"]),
      ];

      sales.forEach((sale) => {
        const saleDate = parseISO(sale.sales_date);
        const saleDateStr = formatDateFns(saleDate, "yyyy-MM-dd");
        let totalSaleAmount = 0;
        if (
          sale.items_sold &&
          sale.quantities_sold &&
          sale.prices_per_unit &&
          sale.items_sold.length === sale.quantities_sold.length &&
          sale.items_sold.length === sale.prices_per_unit.length
        ) {
          for (let i = 0; i < sale.items_sold.length; i++) {
            totalSaleAmount +=
              (sale.quantities_sold[i] || 0) * (sale.prices_per_unit[i] || 0);
          }
        }
        const occupation = sale.occupation || "Uncategorized";
        if (!dailyRevenueMap.has(saleDateStr)) {
          const initialBreakdown = subTypesForProcessing.map((st) => ({
            name: st,
            value: 0,
          }));
          dailyRevenueMap.set(saleDateStr, {
            total: 0,
            breakdown: initialBreakdown,
          });
        }
        const dayData = dailyRevenueMap.get(saleDateStr)!;
        dayData.total += totalSaleAmount;
        const occupationEntry = dayData.breakdown.find(
          (b) => b.name === occupation
        );
        if (occupationEntry) {
          occupationEntry.value += totalSaleAmount;
        } else {
          dayData.breakdown.push({ name: occupation, value: totalSaleAmount });
          if (!subTypesForProcessing.includes(occupation))
            subTypesForProcessing.push(occupation);
        }
      });
      return dailyRevenueMap;
    },
    [targetSubType]
  );

  const processExpensesData = useCallback(
    (
      expenses: ExpenseRecord[],
      allUserSubTypes: string[]
    ): Map<string, ProcessedExpensesForDay> => {
      const dailyExpensesMap = new Map<string, ProcessedExpensesForDay>();
      const subTypesForProcessing = [
        ...new Set([...allUserSubTypes, targetSubType, "Uncategorized"]),
      ];

      expenses.forEach((expense) => {
        const expenseDate = parseISO(expense.date_created);
        const expenseDateStr = formatDateFns(expenseDate, "yyyy-MM-dd");
        const expenseAmount = Number(expense.expense) || 0;
        const occupation = expense.occupation || "Uncategorized";

        const mainCategoryGroup = categoryToMainGroupMap[expense.category];
        let expenseTypeKey: "cogs" | "expenses" | null = null;

        if (mainCategoryGroup === expenseCategoryConfig.expenseTypeMap.COGS) {
          expenseTypeKey = "cogs";
        } else if (
          mainCategoryGroup ===
          expenseCategoryConfig.expenseTypeMap.OPERATING_EXPENSES
        ) {
          expenseTypeKey = "expenses";
        }

        if (!expenseTypeKey) return;

        if (!dailyExpensesMap.has(expenseDateStr)) {
          dailyExpensesMap.set(expenseDateStr, {
            cogs: {
              total: 0,
              breakdown: subTypesForProcessing.map((st) => ({
                name: st,
                value: 0,
              })),
            },
            expenses: {
              total: 0,
              breakdown: subTypesForProcessing.map((st) => ({
                name: st,
                value: 0,
              })),
            },
          });
        }

        const dayDataContainer = dailyExpensesMap.get(expenseDateStr)!;
        const targetMetricBreakdown = dayDataContainer[expenseTypeKey];

        targetMetricBreakdown.total += expenseAmount;
        const occupationEntry = targetMetricBreakdown.breakdown.find(
          (b) => b.name === occupation
        );

        if (occupationEntry) {
          occupationEntry.value += expenseAmount;
        } else {
          const newOccEntry = { name: occupation, value: expenseAmount };
          targetMetricBreakdown.breakdown.push(newOccEntry);
          if (!subTypesForProcessing.includes(occupation))
            subTypesForProcessing.push(occupation);
        }
      });
      return dailyExpensesMap;
    },
    [
      targetSubType,
      categoryToMainGroupMap,
      expenseCategoryConfig.expenseTypeMap,
    ]
  );

  useEffect(() => {
    if (!userId) {
      setIsLoadingFinancials(false);
      return;
    }
    setIsLoadingFinancials(true);
    const fetchFinancialRelatedData = async () => {
      let fetchedUserSubTypesInternal: string[] = [];
      let processedSalesRevenueMap: Map<string, MetricBreakdown> = new Map();
      let processedExpensesMap: Map<string, ProcessedExpensesForDay> =
        new Map();
      let finalSubTypesForGeneration: string[] = [];

      try {
        const userPromise = axiosInstance.get(`/user/${userId}`);
        const salesPromise = axiosInstance.get<{ sales: SaleRecord[] }>(
          `/sales/user/${userId}`
        );
        const expensesPromise = axiosInstance.get<{
          expenses: ExpenseRecord[];
        }>(`/expenses/user/${userId}`);

        const [userResponse, salesResponse, expensesResponse] =
          await Promise.all([userPromise, salesPromise, expensesPromise]);

        const userData = userResponse.data.user ?? userResponse.data.data?.user;
        if (userData && userData.sub_type) {
          const rawSubTypes = userData.sub_type;
          fetchedUserSubTypesInternal = Array.isArray(rawSubTypes)
            ? rawSubTypes
            : typeof rawSubTypes === "string"
            ? rawSubTypes.replace(/[{}"]/g, "").split(",").filter(Boolean)
            : [];
        }
        setUserSubTypes(fetchedUserSubTypesInternal);

        const allKnownOccupations = new Set([
          ...fetchedUserSubTypesInternal,
          targetSubType,
          "Uncategorized",
        ]);

        const salesRecords = salesResponse.data.sales || [];
        processedSalesRevenueMap = processSalesData(
          salesRecords,
          fetchedUserSubTypesInternal
        );

        processedSalesRevenueMap.forEach((metric) =>
          metric.breakdown.forEach((bd) => allKnownOccupations.add(bd.name))
        );

        const expenseRecords = expensesResponse.data.expenses || [];
        processedExpensesMap = processExpensesData(
          expenseRecords,
          fetchedUserSubTypesInternal
        );

        processedExpensesMap.forEach((dayData) => {
          dayData.cogs.breakdown.forEach((bd) =>
            allKnownOccupations.add(bd.name)
          );
          dayData.expenses.breakdown.forEach((bd) =>
            allKnownOccupations.add(bd.name)
          );
        });

        finalSubTypesForGeneration = Array.from(allKnownOccupations);
      } catch (error) {
        console.error(
          `useSubTypeFinancialData (${targetSubType}): Error fetching financial related data:`,
          error
        );
      }

      const data = generateDailyFinancialData(
        TOTAL_DAYS_FOR_HISTORICAL_DATA,
        finalSubTypesForGeneration.length > 0
          ? finalSubTypesForGeneration
          : [targetSubType, "Uncategorized"],
        processedSalesRevenueMap,
        processedExpensesMap
      );
      setFullHistoricalData(data);
      setIsLoadingFinancials(false);
    };
    fetchFinancialRelatedData();
  }, [
    userId,
    targetSubType,
    processSalesData,
    processExpensesData,
    expenseCategoryConfig,
  ]);

  return {
    fullHistoricalData,
    isLoadingFinancials,
    userSubTypes,
  };
};
