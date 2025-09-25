import axiosInstance from "@/lib/axiosInstance";
import {
  differenceInDays,
  isBefore,
  min as minDateFn,
  parseISO,
  startOfDay,
  subDays,
} from "date-fns";
import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Card,
  Icon,
  ProgressBar,
  Text,
  TouchableRipple,
  useTheme,
} from "react-native-paper";

type ItemRecord = {
  inventory_id: number;
  user_id: number;
  item_name: string;
  item_group: string;
  units: string;
  quantity: number;
  created_at: string;
  price_per_unit: number;
  warehouse_id: number | null;
  minimum_limit?: number;
  status?: string;
  feed?: boolean;
};

type PoultryFeedRecordForGraph = {
  feed_id: number;
  feed_given: string;
  amount_given: number;
  units: string;
  feed_date: string;
};

type FeedItemMetrics = {
  itemName: string;
  currentStockKg: number;
  currentStockDisplay: string;
  avgDailyConsumptionKg: number;
  estimatedDurationDays: number;
  units: string;
};

type Props = {
  feedItems: ItemRecord[];
  getFeedLevelColor: (days: number) => string;
  loadingFeedItems: boolean;
  timesFedToday: number;
  targetFeedingsPerDay: number;
  userId: string;
  flockId: string;
  onManageFeedClick: () => void;
};

type FeedStatItemProps = {
  icon: string;
  value: string | React.ReactNode;
  label: string;
  valueStyle?: object;
};

const FeedStatItem = ({
  icon,
  label,
  value,
  valueStyle,
}: FeedStatItemProps) => {
  const theme = useTheme();
  if (value === null || value === undefined) return null;
  return (
    <Card style={styles.statItemCard}>
      <Card.Content style={styles.statItemContent}>
        <Icon source={icon} size={24} color={theme.colors.primary} />
        <Text variant="bodyLarge" style={styles.statItemLabel}>
          {label}
        </Text>
        {typeof value === "string" ? (
          <Text
            variant="headlineSmall"
            style={[styles.statItemValue, valueStyle]}
          >
            {value}
          </Text>
        ) : (
          value
        )}
      </Card.Content>
    </Card>
  );
};

const PoultryFeedCard = ({
  feedItems: stockFeedItems,
  getFeedLevelColor: getFeedLevelColorProp,
  loadingFeedItems: loadingStockItems,
  timesFedToday,
  targetFeedingsPerDay,
  userId,
  flockId,
  onManageFeedClick,
}: Props) => {
  const theme = useTheme();
  const [allFeedConsumptionRecords, setAllFeedConsumptionRecords] = useState<
    PoultryFeedRecordForGraph[]
  >([]);
  const [loadingConsumptionRecords, setLoadingConsumptionRecords] =
    useState(true);
  const [perFeedItemMetrics, setPerFeedItemMetrics] = useState<
    FeedItemMetrics[]
  >([]);
  const [loadingPerItemMetrics, setLoadingPerItemMetrics] = useState(true);

  const convertAmountToKg = (amount: number, unit: string): number => {
    const unitLower = unit ? unit.toLowerCase() : "";
    if (unitLower === "kg") return amount;
    if (["g", "grams"].includes(unitLower)) return amount / 1000;
    if (["lbs", "pounds"].includes(unitLower)) return amount * 0.453592;
    return 0;
  };

  const fetchAllFeedConsumptionData = useCallback(async () => {
    if (!userId || !flockId) {
      setLoadingConsumptionRecords(false);
      return;
    }
    setLoadingConsumptionRecords(true);
    try {
      const response = await axiosInstance.get<{
        records: PoultryFeedRecordForGraph[];
      }>(`/poultry-feeds/${userId}?flockId=${flockId}&limit=10000`);
      setAllFeedConsumptionRecords(response.data.records || []);
    } catch (error) {
      console.error("Error fetching feed consumption data:", error);
      setAllFeedConsumptionRecords([]);
    } finally {
      setLoadingConsumptionRecords(false);
    }
  }, [userId, flockId]);

  useEffect(() => {
    fetchAllFeedConsumptionData();
  }, [fetchAllFeedConsumptionData]);

  useEffect(() => {
    if (loadingStockItems || loadingConsumptionRecords) {
      setLoadingPerItemMetrics(true);
      return;
    }
    setLoadingPerItemMetrics(true);
    const today = startOfDay(new Date());
    const thirtyDaysAgo = startOfDay(subDays(today, 29));

    const calculatedMetrics: FeedItemMetrics[] = stockFeedItems.map(
      (stockItem) => {
        const consumptionForThisItem = allFeedConsumptionRecords.filter(
          (record) =>
            record.feed_given === stockItem.item_name &&
            isBefore(thirtyDaysAgo, startOfDay(parseISO(record.feed_date)))
        );
        let totalKgConsumedForItemLast30Days = consumptionForThisItem.reduce(
          (total, record) =>
            total + convertAmountToKg(record.amount_given, record.units),
          0
        );
        const earliestRecordDateForItemInPeriod =
          consumptionForThisItem.length > 0
            ? minDateFn(
                consumptionForThisItem.map((r) => parseISO(r.feed_date))
              )
            : thirtyDaysAgo;
        const daysInPeriodWithDataForItem = Math.max(
          1,
          differenceInDays(today, earliestRecordDateForItemInPeriod) + 1
        );
        const avgDailyConsumptionKgForItem =
          consumptionForThisItem.length > 0
            ? totalKgConsumedForItemLast30Days /
              Math.min(30, daysInPeriodWithDataForItem)
            : 0;
        const currentStockKg = convertAmountToKg(
          stockItem.quantity,
          stockItem.units
        );
        const estimatedDurationDays =
          avgDailyConsumptionKgForItem > 0 &&
          isFinite(avgDailyConsumptionKgForItem)
            ? currentStockKg / avgDailyConsumptionKgForItem
            : currentStockKg > 0
            ? Infinity
            : 0;
        return {
          itemName: stockItem.item_name,
          currentStockKg: currentStockKg,
          currentStockDisplay: `${stockItem.quantity.toLocaleString()} ${
            stockItem.units
          }`,
          avgDailyConsumptionKg: avgDailyConsumptionKgForItem,
          estimatedDurationDays: estimatedDurationDays,
          units: stockItem.units,
        };
      }
    );
    setPerFeedItemMetrics(calculatedMetrics);
    setLoadingPerItemMetrics(false);
  }, [
    stockFeedItems,
    allFeedConsumptionRecords,
    loadingStockItems,
    loadingConsumptionRecords,
  ]);

  const feedingStatusValue = `${timesFedToday} / ${targetFeedingsPerDay}`;
  const isFeedingComplete = timesFedToday >= targetFeedingsPerDay;
  const feedingStatusColor = isFeedingComplete
    ? theme.colors.primary
    : timesFedToday > 0
    ? "#F59E0B"
    : theme.colors.error;

  const getFeedLevelColor = (days: number) => {
    if (days < 3) return theme.colors.error;
    if (days < 7) return "#F59E0B";
    return theme.colors.primary;
  };

  const renderMetricsView = () => {
    if (loadingStockItems || loadingPerItemMetrics) {
      return (
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" />
        </View>
      );
    }
    if (stockFeedItems.length === 0) {
      return (
        <View style={styles.centeredContainer}>
          <Icon
            source="package-variant-closed"
            size={48}
            color={theme.colors.onSurfaceDisabled}
          />
          <Text variant="titleMedium">No Poultry Feed in Stock</Text>
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceDisabled }}
          >
            Mark items as "Feed" in your inventory.
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.metricsViewContainer}>
        <ScrollView style={styles.metricsScrollView}>
          {perFeedItemMetrics.map((metric) => {
            const durationColor = getFeedLevelColor(
              metric.estimatedDurationDays
            );
            const durationDisplay = !isFinite(metric.estimatedDurationDays)
              ? "N/A"
              : `${metric.estimatedDurationDays.toFixed(1)} days`;
            const progress = isFinite(metric.estimatedDurationDays)
              ? Math.min(1, metric.estimatedDurationDays / 7)
              : 0;
            return (
              <Card key={metric.itemName} style={styles.metricItemCard}>
                <Card.Content>
                  <Text
                    variant="titleMedium"
                    style={styles.metricItemTitle}
                    numberOfLines={1}
                  >
                    {metric.itemName}
                  </Text>
                  <View style={styles.metricDetailsGrid}>
                    <View style={styles.metricDetailItem}>
                      <Icon
                        source="cube-outline"
                        size={20}
                        color={theme.colors.primary}
                      />
                      <Text variant="labelLarge">
                        {metric.currentStockDisplay}
                      </Text>
                      <Text variant="bodySmall">In Stock</Text>
                    </View>
                    <View style={styles.metricDetailItem}>
                      <Icon
                        source="chart-line"
                        size={20}
                        color={theme.colors.primary}
                      />
                      <Text variant="labelLarge">
                        {metric.avgDailyConsumptionKg.toFixed(2)} kg/day
                      </Text>
                      <Text variant="bodySmall">Avg. Daily Use</Text>
                    </View>
                    <View style={styles.metricDetailItem}>
                      <Icon
                        source="warehouse"
                        size={20}
                        color={theme.colors.primary}
                      />
                      <Text
                        variant="labelLarge"
                        style={{ color: durationColor }}
                      >
                        {durationDisplay}
                      </Text>
                      <Text variant="bodySmall">Est. Duration</Text>
                      {isFinite(metric.estimatedDurationDays) && (
                        <ProgressBar
                          progress={progress}
                          color={durationColor}
                          style={styles.progressBar}
                        />
                      )}
                    </View>
                  </View>
                </Card.Content>
              </Card>
            );
          })}
        </ScrollView>
        <View style={styles.summaryStatsContainer}>
          <FeedStatItem
            icon="silverware-fork-knife"
            value={
              loadingStockItems ? <ActivityIndicator /> : feedingStatusValue
            }
            label="Times Fed Today"
            valueStyle={{ color: feedingStatusColor }}
          />
          <TouchableRipple
            onPress={!loadingStockItems ? onManageFeedClick : undefined}
            disabled={!userId || !flockId || loadingStockItems}
            style={styles.touchableStatItem}
          >
            <FeedStatItem
              icon="clipboard-list-outline"
              value="Log/View"
              label="Manage Feed Data"
            />
          </TouchableRipple>
        </View>
      </View>
    );
  };

  return (
    <Card>
      <Card.Title title="Feed Status & Consumption" titleVariant="titleLarge" />
      <Card.Content>{renderMetricsView()}</Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  centeredContainer: {
    minHeight: 200,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    padding: 16,
    textAlign: "center",
  },
  metricsViewContainer: { marginTop: 12 },
  metricsScrollView: { maxHeight: 280, marginBottom: 8 },
  metricItemCard: { marginBottom: 12 },
  metricItemTitle: { marginBottom: 12, fontWeight: "bold" },
  metricDetailsGrid: { flexDirection: "row", justifyContent: "space-around" },
  metricDetailItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 4,
  },
  progressBar: { width: "100%", marginTop: 4, height: 6, borderRadius: 3 },
  summaryStatsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingTop: 12,
  },
  touchableStatItem: { flex: 1, borderRadius: 12 },
  statItemCard: { flex: 1, width: "100%" },
  statItemContent: { padding: 16, alignItems: "center", gap: 4 },
  statItemLabel: { textAlign: "center" },
  statItemValue: { fontWeight: "bold" },
});

export default PoultryFeedCard;
