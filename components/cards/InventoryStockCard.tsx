
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import {
  ActivityIndicator,
  Card,
  Chip,
  Icon,
  IconButton,
  Text,
  useTheme,
} from "react-native-paper";
import axiosInstance from "@/lib/axiosInstance";

type ItemRecord = {
  inventory_id: number;
  item_name: string;
  units: string;
  quantity: number;
  minimum_limit?: number;
};

type InventoryStockProps = {
  userId: string | undefined;
  title: string;
  category: string;
};

const ITEMS_PER_PAGE = 5;

const InventoryStockCard = ({
  userId,
  title,
  category,
}: InventoryStockProps) => {
  const theme = useTheme();
  const [inventoryItems, setInventoryItems] = useState<ItemRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (!userId || !category) {
      setLoading(false);
      setError("User ID or category not provided.");
      return;
    }
    const fetchInventoryItems = async () => {
      setLoading(true);
      setError(null);
      setCurrentPage(0);
      try {
        const response = await axiosInstance.get(`/inventory/${userId}`, {
          params: { item_group: category },
        });
        setInventoryItems(response.data.items || []);
      } catch (err) {
        setError(`Failed to load ${category.toLowerCase()} inventory data.`);
      } finally {
        setLoading(false);
      }
    };
    fetchInventoryItems();
  }, [userId, category]);

  const { pages, totalPages } = useMemo(() => {
    if (inventoryItems.length === 0) return { pages: [], totalPages: 0 };
    const chunks: ItemRecord[][] = [];
    for (let i = 0; i < inventoryItems.length; i += ITEMS_PER_PAGE) {
      chunks.push(inventoryItems.slice(i, i + ITEMS_PER_PAGE));
    }
    return { pages: chunks, totalPages: chunks.length };
  }, [inventoryItems]);

  useEffect(() => {
    if (containerWidth > 0) {
      translateX.value = withTiming(-currentPage * containerWidth, {
        duration: 250,
      });
    }
  }, [currentPage, containerWidth, translateX]);

  useEffect(() => {
    setCurrentPage(0);
  }, [inventoryItems.length]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .onUpdate((event) => {
      translateX.value = -currentPage * containerWidth + event.translationX;
    })
    .onEnd((event) => {
      const { translationX, velocityX } = event;
      const threshold = containerWidth / 4;
      let nextPage = currentPage;
      if (translationX < -threshold || velocityX < -500) {
        nextPage = Math.min(currentPage + 1, totalPages - 1);
      } else if (translationX > threshold || velocityX > 500) {
        nextPage = Math.max(currentPage - 1, 0);
      }
      if (nextPage !== currentPage) {
        runOnJS(setCurrentPage)(nextPage);
      } else {
        translateX.value = withTiming(-currentPage * containerWidth, {
          duration: 200,
        });
      }
    });

  const listAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const goToNextPage = useCallback(() => {
    if (currentPage < totalPages - 1) setCurrentPage(currentPage + 1);
  }, [currentPage, totalPages]);
  const goToPreviousPage = useCallback(() => {
    if (currentPage > 0) setCurrentPage(currentPage - 1);
  }, [currentPage]);

  const getItemStatus = (item: ItemRecord) => {
    const { quantity, minimum_limit } = item;
    if (quantity === 0)
      return {
        text: "Unavailable",
        bg: theme.dark ? "#991b1b" : theme.colors.errorContainer,
        text_color: theme.dark ? "#fca5a5" : theme.colors.error,
      };
    const effectiveMinLimit = minimum_limit ?? 0;
    if (effectiveMinLimit > 0 && quantity < effectiveMinLimit)
      return {
        text: "Limited",
        bg: theme.dark ? "#92400e" : "#fed7aa",
        text_color: theme.dark ? "#fcd34d" : "#b45309",
      };
    return {
      text: "Available",
      bg: theme.dark ? "#166534" : "#dcfce7",
      text_color: theme.dark ? "#86efac" : "#16a34a",
    };
  };

  const renderItem = ({ item }: { item: ItemRecord }) => {
    const status = getItemStatus(item);
    return (
      <View style={styles.itemRow}>
        <Text variant="bodyMedium" style={styles.itemName} numberOfLines={1}>
          {item.item_name}
        </Text>
        <View style={styles.itemDetails}>
          <Text variant="bodyMedium" style={styles.itemQuantity}>
            {item.quantity} {item.units}
          </Text>
          <Chip
            textStyle={{ color: status.text_color }}
            style={{ backgroundColor: status.bg }}
          >
            {status.text}
          </Chip>
        </View>
      </View>
    );
  };

  return (
    <Card style={styles.card}>
      <Card.Title title={title} titleVariant="titleLarge" />
      <Card.Content style={styles.content}>
        <View style={styles.listSection}>
          <IconButton
            icon="chevron-left"
            onPress={goToPreviousPage}
            disabled={currentPage <= 0}
          />
          <View
            style={styles.listContainer}
            onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
          >
            {loading ? (
              <ActivityIndicator />
            ) : error ? (
              <Text style={{ color: theme.colors.error }}>{error}</Text>
            ) : inventoryItems.length === 0 ? (
              <View style={styles.centered}>
                <Icon
                  source="package-variant-closed"
                  size={48}
                  color={theme.colors.onSurfaceDisabled}
                />
                <Text style={{ color: theme.colors.onSurfaceDisabled }}>
                  No {category.toLowerCase()} items found.
                </Text>
              </View>
            ) : (
              <GestureDetector gesture={panGesture}>
                <View style={styles.listGestureView}>
                  <Animated.View
                    style={[
                      styles.animatedList,
                      { width: containerWidth * totalPages },
                      listAnimatedStyle,
                    ]}
                  >
                    {pages.map((pageData, index) => (
                      <View key={index} style={{ width: containerWidth }}>
                        <FlatList
                          data={pageData}
                          renderItem={renderItem}
                          keyExtractor={(item) => item.inventory_id.toString()}
                          contentContainerStyle={styles.flatlistContent}
                          scrollEnabled={false}
                        />
                      </View>
                    ))}
                  </Animated.View>
                </View>
              </GestureDetector>
            )}
          </View>
          <IconButton
            icon="chevron-right"
            onPress={goToNextPage}
            disabled={currentPage >= totalPages - 1}
          />
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 0 },
  listSection: { flexDirection: "row", alignItems: "center", flex: 1 },
  listContainer: {
    flex: 1,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 8,
    textAlign: "center",
  },
  listGestureView: { flex: 1, overflow: "hidden" },
  animatedList: { flexDirection: "row", height: "100%" },
  flatlistContent: { paddingVertical: 4, paddingHorizontal: 4, gap: 8 },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemName: { flex: 1, marginRight: 8 },
  itemDetails: { flexDirection: "row", alignItems: "center", gap: 12 },
  itemQuantity: { fontWeight: "bold" },
});

export default InventoryStockCard;
