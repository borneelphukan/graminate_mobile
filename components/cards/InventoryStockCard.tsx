import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Chip,
  Text,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import axiosInstance from "@/lib/axiosInstance";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faBoxArchive,
  faChevronDown,
  faChevronUp,
} from "@fortawesome/free-solid-svg-icons";

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

const InventoryStockCard = ({
  userId,
  title,
  category,
}: InventoryStockProps) => {
  const theme = useTheme();
  const [inventoryItems, setInventoryItems] = useState<ItemRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantitySortAsc, setQuantitySortAsc] = useState(false);

  const sortItems = useCallback((list: ItemRecord[], asc: boolean) => {
    return [...list].sort((a, b) => {
      return asc ? a.quantity - b.quantity : b.quantity - a.quantity;
    });
  }, []);

  useEffect(() => {
    if (!userId || !category) {
      setLoading(false);
      setError("User ID or category not provided.");
      return;
    }
    const fetchInventoryItems = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axiosInstance.get(`/inventory/${userId}`, {
          params: { item_group: category },
        });
        const items = response.data.items || [];
        setInventoryItems(sortItems(items, quantitySortAsc));
      } catch (err) {
        setError(`Failed to load ${category.toLowerCase()} inventory data.`);
      } finally {
        setLoading(false);
      }
    };
    fetchInventoryItems();
  }, [userId, category, quantitySortAsc, sortItems]);

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

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centeredContainer}>
          <ActivityIndicator animating={true} />
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centeredContainer}>
          <Text style={{ color: theme.colors.error }}>{error}</Text>
        </View>
      );
    }

    if (inventoryItems.length === 0) {
      return (
        <View style={styles.centeredContainer}>
          <FontAwesomeIcon
            icon={faBoxArchive}
            size={48}
            color={theme.colors.onSurfaceDisabled}
          />
          <Text
            style={[
              styles.emptyText,
              { color: theme.colors.onSurfaceDisabled },
            ]}
          >
            No items for {category}.
          </Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.itemList} showsVerticalScrollIndicator={false}>
        {inventoryItems.map((item) => {
          const status = getItemStatus(item);
          return (
            <View key={item.inventory_id} style={styles.itemRow}>
              <Text
                style={[styles.itemText, { color: theme.colors.onSurface }]}
                numberOfLines={1}
              >
                {item.item_name}
              </Text>
              <Text style={styles.itemQuantity}>
                {item.quantity} {item.units}
              </Text>
              <Chip
                textStyle={{ color: status.text_color }}
                style={{ backgroundColor: status.bg }}
              >
                {status.text}
              </Chip>
            </View>
          );
        })}
      </ScrollView>
    );
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 5,
        },
      ]}
    >
      <View style={styles.header}>
        <Text variant="headlineSmall" style={{ color: theme.colors.onSurface }}>
          {title}
        </Text>
        <TouchableRipple
          onPress={() => {
            const newAsc = !quantitySortAsc;
            setQuantitySortAsc(newAsc);
            setInventoryItems((prev) => sortItems(prev, newAsc));
          }}
          style={styles.sortButton}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text
              style={[styles.sortButtonText, { color: theme.colors.onSurface }]}
            >
              Quantity
            </Text>
            <FontAwesomeIcon
              icon={quantitySortAsc ? faChevronUp : faChevronDown}
              size={12}
              color={theme.colors.onSurface}
            />
          </View>
        </TouchableRipple>
      </View>

      <View style={styles.listContainer}>{renderContent()}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 320,
    borderRadius: 8,
    padding: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sortButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: "rgba(128, 128, 128, 0.2)",
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: "500",
    marginRight: 8,
  },
  listContainer: {
    flex: 1,
    overflow: "hidden",
  },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    marginTop: 12,
    textAlign: "center",
  },
  itemList: {
    flex: 1,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128, 128, 128, 0.1)",
  },
  itemText: {
    flex: 1,
    fontSize: 14,
  },
  itemQuantity: {
    fontWeight: "bold",
    marginHorizontal: 16,
  },
});

export default InventoryStockCard;
