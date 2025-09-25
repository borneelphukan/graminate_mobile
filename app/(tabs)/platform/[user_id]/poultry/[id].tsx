import PoultryEggCard from "@/components/cards/poultry/PoultryEggCard";
import PoultryFeedCard from "@/components/cards/poultry/PoultryFeedCard";
import VeterinaryCard from "@/components/cards/poultry/VeterinaryCard";
import FlockForm, { FlockFormData } from "@/components/form/poultry/FlockForm";
import PlatformLayout from "@/components/layout/PlatformLayout";
import axiosInstance from "@/lib/axiosInstance";
import {
  compareDesc,
  differenceInDays,
  eachDayOfInterval,
  endOfWeek,
  format as formatDateFns,
  isBefore,
  parseISO,
  startOfDay,
  startOfWeek,
} from "date-fns";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import {
  Appbar,
  Button,
  Card,
  Divider,
  List,
  useTheme,
} from "react-native-paper";

type FlockData = {
  flock_id?: number;
  user_id: number;
  flock_name: string;
  flock_type: string;
  quantity: number;
  created_at?: string;
  breed?: string;
  source?: string;
  housing_type?: string;
  notes?: string;
};
type PoultryHealthRecord = {
  poultry_health_id: number;
  birds_vaccinated: number;
  total_birds: number;
  next_appointment?: string;
  created_at: string;
};
type PoultryEggRecordFromApi = {
  egg_id: number;
  date_collected: string;
  small_eggs: number;
  medium_eggs: number;
  large_eggs: number;
  extra_large_eggs: number;
  total_eggs: number;
  broken_eggs: number;
  date_logged: string;
};
interface LatestPoultryHealthData {
  birds_vaccinated: number | null;
  total_birds_at_event: number | null;
  latest_future_appointment: string | null;
  loading: boolean;
  error: string | null;
}
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
interface LatestEggMetrics {
  totalEggs: number;
  brokenEggs: number;
  smallEggs: number;
  mediumEggs: number;
  largeEggs: number;
  extraLargeEggs: number;
}
interface PoultryFeedRecord {
  feed_id: number;
  feed_given: string;
  amount_given: number;
  units: string;
  feed_date: string;
}
type ChartData = {
  labels: string[];
  datasets: Array<{
    data: number[];
    color?: (opacity: number) => string;
    strokeWidth?: number;
  }>;
  legend?: string[];
};
interface PoultryEggCardStats {
  latestMetrics: LatestEggMetrics | null;
  eggCollectionLineData: ChartData;
  loading: boolean;
  error: string | null;
}

const PoultryDetailScreen = () => {
  const router = useRouter();
  const { user_id, id } = useLocalSearchParams<{
    user_id: string;
    id: string;
  }>();
  const theme = useTheme();

  const [selectedFlockData, setSelectedFlockData] = useState<FlockData | null>(
    null
  );
  const [loadingFlockData, setLoadingFlockData] = useState(true);
  const [showFlockForm, setShowFlockForm] = useState(false);
  const [flockAge, setFlockAge] = useState<string>("Calculating...");
  const [latestPoultryHealthData, setLatestPoultryHealthData] =
    useState<LatestPoultryHealthData>({
      birds_vaccinated: null,
      total_birds_at_event: null,
      latest_future_appointment: null,
      loading: true,
      error: null,
    });
  const [poultryInventoryItems, setPoultryInventoryItems] = useState<
    ItemRecord[]
  >([]);
  const [loadingPoultryInventory, setLoadingPoultryInventory] = useState(true);
  const [allEggRecords, setAllEggRecords] = useState<PoultryEggRecordFromApi[]>(
    []
  );
  const [poultryEggCardStats, setPoultryEggCardStats] =
    useState<PoultryEggCardStats>({
      latestMetrics: null,
      eggCollectionLineData: { labels: [], datasets: [] },
      loading: true,
      error: null,
    });
  const [allFeedRecords, setAllFeedRecords] = useState<PoultryFeedRecord[]>([]);
  const [loadingAllFeedRecords, setLoadingAllFeedRecords] = useState(true);
  const [timesFedToday, setTimesFedToday] = useState<number>(0);
  const [targetFeedingsPerDay] = useState<number>(7);
  const [loadingCalculatedFeedData, setLoadingCalculatedFeedData] =
    useState(true);

  const getFeedLevelColor = useCallback(
    (days: number): string => {
      if (!isFinite(days) || days < 0) return theme.colors.onSurfaceDisabled;
      if (days < 3) return theme.colors.error;
      if (days < 7) return "#F59E0B"; // Amber
      return theme.colors.primary;
    },
    [theme]
  );

  const fetchFlockData = useCallback(async () => {
    if (!id) return;
    setLoadingFlockData(true);
    try {
      const response = await axiosInstance.get<FlockData>(`/flock/${id}`);
      setSelectedFlockData(response.data);
    } catch (error) {
      setSelectedFlockData(null);
    } finally {
      setLoadingFlockData(false);
    }
  }, [id]);

  const handleUpdateFlock = async (formData: FlockFormData) => {
    if (!id) return;
    try {
      const payload = { ...formData, quantity: Number(formData.quantity) };
      await axiosInstance.put(`/flock/${id}`, payload);
      await fetchFlockData();
    } catch (error) {
      throw error;
    }
  };

  const fetchHealthDataForFlock = useCallback(async () => {
    if (!user_id || !id) return;
    setLatestPoultryHealthData((prev) => ({ ...prev, loading: true }));
    try {
      const response = await axiosInstance.get<{
        records: PoultryHealthRecord[];
      }>(`/poultry-health/${user_id}?flockId=${id}`);
      const records = response.data.records || [];
      let latestVaccinatedBirds: number | null = null,
        totalBirdsAtLatest: number | null = null,
        latestFutureAppointment: string | null = null;
      if (records.length > 0) {
        const sorted = [...records].sort((a, b) =>
          compareDesc(new Date(a.created_at), new Date(b.created_at))
        );
        latestVaccinatedBirds = sorted[0].birds_vaccinated;
        totalBirdsAtLatest = sorted[0].total_birds;
        const futureAppointments = records
          .filter(
            (r) =>
              r.next_appointment &&
              isBefore(new Date(), new Date(r.next_appointment))
          )
          .sort(
            (a, b) =>
              new Date(a.next_appointment!).getTime() -
              new Date(b.next_appointment!).getTime()
          );
        if (futureAppointments.length > 0)
          latestFutureAppointment = futureAppointments[0].next_appointment!;
      }
      setLatestPoultryHealthData({
        birds_vaccinated: latestVaccinatedBirds,
        total_birds_at_event: totalBirdsAtLatest,
        latest_future_appointment: latestFutureAppointment,
        loading: false,
        error: null,
      });
    } catch (error) {
      setLatestPoultryHealthData({
        birds_vaccinated: null,
        total_birds_at_event: null,
        latest_future_appointment: null,
        loading: false,
        error: "Failed to fetch health data",
      });
    }
  }, [user_id, id]);

  const fetchPoultryInventory = useCallback(async () => {
    if (!user_id) return;
    setLoadingPoultryInventory(true);
    try {
      const response = await axiosInstance.get(`/inventory/${user_id}`, {
        params: { item_group: "Poultry" },
      });
      setPoultryInventoryItems(response.data.items || []);
    } catch (err) {
      setPoultryInventoryItems([]);
    } finally {
      setLoadingPoultryInventory(false);
    }
  }, [user_id]);

  const processEggDataForGraph = useCallback(
    (
      recordsToProcess: PoultryEggRecordFromApi[],
      startDate: Date,
      endDate: Date
    ) => {
      let latestMetricsData: LatestEggMetrics | null = null;
      if (recordsToProcess.length > 0) {
        const latestRecord = [...recordsToProcess].sort((a, b) =>
          compareDesc(parseISO(a.date_logged), parseISO(b.date_logged))
        )[0];
        latestMetricsData = {
          totalEggs: latestRecord.total_eggs || 0,
          brokenEggs: latestRecord.broken_eggs || 0,
          smallEggs: latestRecord.small_eggs || 0,
          mediumEggs: latestRecord.medium_eggs || 0,
          largeEggs: latestRecord.large_eggs || 0,
          extraLargeEggs: latestRecord.extra_large_eggs || 0,
        };
      }
      const dailyAggregatedData: { [date: string]: { total_eggs: number } } =
        {};
      recordsToProcess.forEach((record) => {
        const dateKey = formatDateFns(
          startOfDay(parseISO(record.date_collected)),
          "yyyy-MM-dd"
        );
        if (!dailyAggregatedData[dateKey])
          dailyAggregatedData[dateKey] = { total_eggs: 0 };
        dailyAggregatedData[dateKey].total_eggs += record.total_eggs || 0;
      });
      const dateRangeForLabels = eachDayOfInterval({
        start: startDate,
        end: endDate,
      });
      const lineLabels = dateRangeForLabels.map((date) =>
        formatDateFns(date, "MMM d")
      );
      const dataPoints = dateRangeForLabels.map((date) => {
        const dateKey = formatDateFns(date, "yyyy-MM-dd");
        return dailyAggregatedData[dateKey]?.total_eggs || 0;
      });
      setPoultryEggCardStats({
        latestMetrics: latestMetricsData,
        eggCollectionLineData: {
          labels: lineLabels,
          datasets: [{ data: dataPoints }],
        },
        loading: false,
        error: null,
      });
    },
    []
  );

  const fetchAllPoultryEggData = useCallback(async () => {
    if (!user_id || !id) return;
    setPoultryEggCardStats((prev) => ({ ...prev, loading: true }));
    try {
      const response = await axiosInstance.get<{
        records: PoultryEggRecordFromApi[];
      }>(`/poultry-eggs/${user_id}?flockId=${id}&limit=10000`);
      const records = response.data.records || [];
      setAllEggRecords(records);
      const today = new Date();
      processEggDataForGraph(
        records,
        startOfWeek(today, { weekStartsOn: 1 }),
        endOfWeek(today, { weekStartsOn: 1 })
      );
    } catch (error) {
      setPoultryEggCardStats((prev) => ({
        ...prev,
        loading: false,
        error: "Failed to fetch egg data",
      }));
    }
  }, [user_id, id, processEggDataForGraph]);

  const fetchAllPoultryFeedData = useCallback(async () => {
    if (!user_id || !id) return;
    setLoadingAllFeedRecords(true);
    try {
      const response = await axiosInstance.get<{
        records: PoultryFeedRecord[];
      }>(`/poultry-feeds/${user_id}?flockId=${id}&limit=10000`);
      setAllFeedRecords(response.data.records || []);
    } catch (error) {
      setAllFeedRecords([]);
    } finally {
      setLoadingAllFeedRecords(false);
    }
  }, [user_id, id]);

  useEffect(() => {
    if (id) {
      fetchFlockData();
      fetchHealthDataForFlock();
      fetchPoultryInventory();
      fetchAllPoultryEggData();
      fetchAllPoultryFeedData();
    }
  }, [
    id,
    fetchFlockData,
    fetchHealthDataForFlock,
    fetchPoultryInventory,
    fetchAllPoultryEggData,
    fetchAllPoultryFeedData,
  ]);

  useEffect(() => {
    if (selectedFlockData?.created_at) {
      setFlockAge(
        `${differenceInDays(
          new Date(),
          parseISO(selectedFlockData.created_at)
        )} day(s)`
      );
    }
  }, [selectedFlockData]);

  useEffect(() => {
    if (loadingAllFeedRecords) {
      setLoadingCalculatedFeedData(true);
      return;
    }
    const today = startOfDay(new Date());
    const fedTodayCount = allFeedRecords.filter(
      (record) =>
        startOfDay(parseISO(record.feed_date)).getTime() === today.getTime()
    ).length;
    setTimesFedToday(fedTodayCount);
    setLoadingCalculatedFeedData(false);
  }, [allFeedRecords, loadingAllFeedRecords]);

  const handleManageHealthRecordsClick = () =>
    router.push(`/platform/${user_id}/poultry/poultry-health?flock_id=${id}`);
  const handleManageFeedRecordsClick = () =>
    router.push(`/platform/${user_id}/poultry/poultry-feeds?flock_id=${id}`);
  const handleManageEggRecordsClick = () =>
    router.push(`/platform/${user_id}/poultry/poultry-eggs?flock_id=${id}`);

  if (loadingFlockData) {
    return (
      <PlatformLayout>
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      </PlatformLayout>
    );
  }

  return (
    <PlatformLayout>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content
          title={selectedFlockData?.flock_name || "Flock Details"}
        />
      </Appbar.Header>
      <ScrollView style={{ backgroundColor: theme.colors.background }}>
        <View style={styles.container}>
          <Card>
            <Card.Actions>
              <Button
                icon="arrow-left"
                onPress={() => router.push(`/platform/${user_id}/poultry`)}
              >
                All Flocks
              </Button>
              <Button onPress={() => setShowFlockForm(true)}>Edit Flock</Button>
            </Card.Actions>
            <Divider />
            <Card.Content style={styles.detailsGrid}>
              <List.Item
                title={selectedFlockData?.quantity}
                description="Total Birds"
                left={() => <List.Icon icon="food-drumstick" />}
              />
              <List.Item
                title={selectedFlockData?.flock_type}
                description="Flock Type"
                left={() => <List.Icon icon="food-drumstick" />}
              />
              <List.Item
                title={flockAge}
                description="Flock Age"
                left={() => <List.Icon icon="calendar" />}
              />
              <List.Item
                title={selectedFlockData?.breed}
                description="Breed"
                left={() => <List.Icon icon="bird" />}
              />
              <List.Item
                title={selectedFlockData?.housing_type}
                description="Housing"
                left={() => <List.Icon icon="warehouse" />}
              />
              <List.Item
                title={selectedFlockData?.source}
                description="Source"
                left={() => <List.Icon icon="office-building" />}
              />
              {selectedFlockData?.notes && (
                <List.Item
                  title={selectedFlockData.notes}
                  description="Notes"
                  left={() => <List.Icon icon="note-text-outline" />}
                  titleNumberOfLines={4}
                />
              )}
            </Card.Content>
          </Card>

          <VeterinaryCard
            birdsVaccinated={latestPoultryHealthData.birds_vaccinated}
            totalBirdsInvolvedInRecord={
              latestPoultryHealthData.total_birds_at_event
            }
            nextAppointmentDate={
              latestPoultryHealthData.latest_future_appointment
            }
            onManageClick={handleManageHealthRecordsClick}
            loading={latestPoultryHealthData.loading}
          />
          <PoultryEggCard
            latestMetrics={poultryEggCardStats.latestMetrics}
            eggCollectionLineData={poultryEggCardStats.eggCollectionLineData}
            loading={poultryEggCardStats.loading}
            error={poultryEggCardStats.error}
            onManageClick={handleManageEggRecordsClick}
            onPeriodChange={(start, end) =>
              processEggDataForGraph(allEggRecords, start, end)
            }
            earliestDataDate={
              allEggRecords.length > 0
                ? parseISO(
                    allEggRecords[allEggRecords.length - 1].date_collected
                  )
                : null
            }
          />
          {user_id && id && (
            <PoultryFeedCard
              feedItems={poultryInventoryItems.filter((item) => item.feed)}
              getFeedLevelColor={getFeedLevelColor}
              loadingFeedItems={
                loadingPoultryInventory || loadingCalculatedFeedData
              }
              timesFedToday={timesFedToday}
              targetFeedingsPerDay={targetFeedingsPerDay}
              userId={user_id}
              flockId={id}
              onManageFeedClick={handleManageFeedRecordsClick}
            />
          )}
        </View>
      </ScrollView>
      {selectedFlockData && (
        <FlockForm
          isVisible={showFlockForm}
          onClose={() => setShowFlockForm(false)}
          onSubmit={handleUpdateFlock}
          flockToEdit={selectedFlockData}
        />
      )}
    </PlatformLayout>
  );
};

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { padding: 16, gap: 24 },
  detailsGrid: { flexDirection: "row", flexWrap: "wrap" },
});

export default PoultryDetailScreen;
