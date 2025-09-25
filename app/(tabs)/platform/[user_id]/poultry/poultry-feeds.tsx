import PlatformLayout from "@/components/layout/PlatformLayout";
import PoultryFeedsModal from "@/components/modals/poultry/PoultryFeedsModal";
import axiosInstance from "@/lib/axiosInstance";
import { format, parseISO } from "date-fns";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, FlatList, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Appbar,
  Button,
  Card,
  Icon,
  Searchbar,
  Text,
  useTheme,
} from "react-native-paper";

type FeedRecord = {
  feed_id: number;
  user_id: number;
  flock_id: number;
  feed_given: string;
  amount_given: number;
  units: string;
  feed_date: string;
  created_at: string;
};

type ItemRecord = {
  inventory_id: number;
  item_name: string;
  units: string;
  quantity: number;
  feed?: boolean;
};

type FlockData = {
  flock_id: number;
  flock_name: string;
};

const PoultryFeedsScreen = () => {
  const router = useRouter();
  const { user_id, flock_id } = useLocalSearchParams<{
    user_id: string;
    flock_id: string;
  }>();
  const theme = useTheme();

  const [feedRecords, setFeedRecords] = useState<FeedRecord[]>([]);
  const [flockData, setFlockData] = useState<FlockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFeedModal, setShowFeedModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FeedRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [availableFeedItems, setAvailableFeedItems] = useState<ItemRecord[]>(
    []
  );
  const [loadingFeedItems, setLoadingFeedItems] = useState(true);

  const fetchFlockDetails = useCallback(async () => {
    if (!flock_id) return;
    try {
      const response = await axiosInstance.get<FlockData>(`/flock/${flock_id}`);
      setFlockData(response.data);
    } catch (error) {
      setFlockData(null);
    }
  }, [flock_id]);

  const fetchFeedRecords = useCallback(async () => {
    if (!user_id || !flock_id) return;
    setLoading(true);
    try {
      const response = await axiosInstance.get<{ records: FeedRecord[] }>(
        `/poultry-feeds/${user_id}?flockId=${flock_id}`
      );
      setFeedRecords(response.data.records || []);
    } catch (error) {
      setFeedRecords([]);
    } finally {
      setLoading(false);
    }
  }, [user_id, flock_id]);

  const fetchAvailableFeedInventory = useCallback(async () => {
    if (!user_id) {
      setLoadingFeedItems(false);
      return;
    }
    setLoadingFeedItems(true);
    try {
      const response = await axiosInstance.get<{ items: ItemRecord[] }>(
        `/inventory/${user_id}`,
        { params: { item_group: "Poultry" } }
      );
      setAvailableFeedItems(
        (response.data.items || []).filter((item) => item.feed === true)
      );
    } catch (error) {
      setAvailableFeedItems([]);
    } finally {
      setLoadingFeedItems(false);
    }
  }, [user_id]);

  useEffect(() => {
    if (flock_id) fetchFlockDetails();
    if (user_id && flock_id) fetchFeedRecords();
    if (user_id) fetchAvailableFeedInventory();
  }, [
    user_id,
    flock_id,
    fetchFlockDetails,
    fetchFeedRecords,
    fetchAvailableFeedInventory,
  ]);

  const filteredRecords = useMemo(() => {
    if (!searchQuery) return feedRecords;
    return feedRecords.filter((record) =>
      Object.values(record).some((value) =>
        String(value).toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  }, [feedRecords, searchQuery]);

  const handleAddRecord = () => {
    if (loadingFeedItems) {
      Alert.alert("Loading...", "Checking available feed items. Please wait.");
      return;
    }
    if (availableFeedItems.length === 0) {
      Alert.alert(
        "No Feed Items Found",
        "Your inventory has no items marked as feed. Please add feed items first."
      );
    } else {
      setEditingRecord(null);
      setShowFeedModal(true);
    }
  };

  const handleEditRecord = (record: FeedRecord) => {
    setEditingRecord(record);
    setShowFeedModal(true);
  };

  const pageTitle = flockData
    ? `Feed Records (${flockData.flock_name})`
    : "Feed Records";

  const renderItem = ({ item }: { item: FeedRecord }) => (
    <Card onPress={() => handleEditRecord(item)} style={styles.card}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <Text variant="titleMedium" style={styles.cardTitle}>
            {item.feed_given}
          </Text>
          <Text
            variant="labelSmall"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            Logged: {format(parseISO(item.created_at), "MMM d, yyyy")}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Icon
            source="weight-kilogram"
            size={16}
            color={theme.colors.onSurfaceVariant}
          />
          <Text variant="bodyMedium" style={styles.infoText}>
            {item.amount_given.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            {item.units}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Icon
            source="calendar-month"
            size={16}
            color={theme.colors.onSurfaceVariant}
          />
          <Text variant="bodyMedium" style={styles.infoText}>
            {format(parseISO(item.feed_date), "PP")}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <PlatformLayout>
      <Appbar.Header>
        <Appbar.BackAction
          onPress={() => {
            if (user_id && flock_id)
              router.push(`/platform/${user_id}/poultry/${flock_id}`);
            else router.back();
          }}
        />
        <Appbar.Content
          title={pageTitle}
          subtitle={
            loading ? "Loading..." : `${filteredRecords.length} Record(s)`
          }
        />
        <Appbar.Action
          icon="plus-circle"
          onPress={handleAddRecord}
          disabled={loadingFeedItems}
        />
      </Appbar.Header>
      <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
        <Searchbar
          placeholder="Search by feed name, date, units..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchbar}
        />
        {loading ? (
          <View style={styles.centeredContainer}>
            <ActivityIndicator size="large" />
          </View>
        ) : (
          <FlatList
            data={filteredRecords}
            renderItem={renderItem}
            keyExtractor={(item) => item.feed_id.toString()}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.centeredContainer}>
                <Text style={{ color: theme.colors.onSurfaceDisabled }}>
                  No feed records found for this flock.
                </Text>
              </View>
            }
          />
        )}
      </View>
      {showFeedModal && user_id && flock_id && (
        <PoultryFeedsModal
          isVisible={showFeedModal}
          onClose={() => {
            setShowFeedModal(false);
            setEditingRecord(null);
          }}
          formTitle={
            editingRecord
              ? `Edit Feed for ${flockData?.flock_name}`
              : `Log Feed for ${flockData?.flock_name}`
          }
          flockId={Number(flock_id)}
          userId={Number(user_id)}
          feedRecordToEdit={editingRecord}
          onRecordSaved={() => {
            fetchFeedRecords();
            fetchAvailableFeedInventory();
            setShowFeedModal(false);
            setEditingRecord(null);
          }}
        />
      )}
    </PlatformLayout>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  searchbar: { margin: 16, marginTop: 8 },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  listContent: { paddingHorizontal: 16, paddingBottom: 16 },
  card: { marginBottom: 12 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  cardTitle: { flex: 1, fontWeight: "bold" },
  infoRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  infoText: { marginLeft: 8 },
});

export default PoultryFeedsScreen;
