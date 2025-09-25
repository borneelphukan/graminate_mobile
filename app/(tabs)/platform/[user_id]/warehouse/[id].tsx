import InventoryForm, {
  InventoryFormData,
} from "@/components/form/warehouse/InventoryForm";
import WarehouseForm, {
  WarehouseFormData,
} from "@/components/form/warehouse/WarehouseForm";
import PlatformLayout from "@/components/layout/PlatformLayout";
import {
  faArrowLeft,
  faBox,
  faExclamationTriangle,
  faMapMarkerAlt,
  faPencilAlt,
  faPhone,
  faPlus,
  faUserTie,
  faWarehouse,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import axiosInstance from "@/lib/axiosInstance";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Dimensions, ScrollView, StyleSheet, View } from "react-native";
import { BarChart } from "react-native-chart-kit";
import {
  ActivityIndicator,
  Appbar,
  Button,
  Card,
  Chip,
  List,
  Text,
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
};

type WarehouseDetails = {
  warehouse_id: number;
  user_id?: number;
  name: string;
  type: string;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  contact_person: string | null;
  phone: string | null;
  storage_capacity: number | string | null;
};

const screenWidth = Dimensions.get("window").width;

const getBarColor = (quantity: number, max: number): string => {
  if (max === 0) return "#9ca3af";
  const ratio = quantity / max;
  if (ratio < 0.25) return "#ef4444";
  if (ratio < 0.5) return "#f97316";
  if (ratio < 0.75) return "#eab308";
  return "#22c55e";
};

const WarehouseDetailScreen = () => {
  const router = useRouter();
  const {
    user_id,
    id,
    warehouseName: queryWarehouseName,
  } = useLocalSearchParams<{
    user_id: string;
    id: string;
    warehouseName?: string;
  }>();
  const theme = useTheme();

  const [inventory, setInventory] = useState<ItemRecord[]>([]);
  const [warehouseDetails, setWarehouseDetails] =
    useState<WarehouseDetails | null>(null);
  const [isInventoryFormOpen, setIsInventoryFormOpen] = useState(false);
  const [isWarehouseFormOpen, setIsWarehouseFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchWarehouseData = useCallback(async () => {
    if (!user_id || !id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [inventoryResponse, warehouseDetailsResponse] = await Promise.all([
        axiosInstance.get(`/inventory/${user_id}`, {
          params: { warehouse_id: id },
        }),
        axiosInstance.get(`/warehouse/user/${user_id}`),
      ]);
      setInventory(inventoryResponse.data.items || []);
      const warehouses = warehouseDetailsResponse.data.warehouses || [];
      const foundWarehouse = warehouses.find(
        (wh: WarehouseDetails) => wh.warehouse_id === parseInt(id, 10)
      );
      setWarehouseDetails(foundWarehouse || null);
    } catch (error) {
      console.error("Error fetching warehouse-specific data:", error);
    } finally {
      setLoading(false);
    }
  }, [user_id, id]);

  useEffect(() => {
    fetchWarehouseData();
  }, [fetchWarehouseData]);

  const handleUpdateWarehouse = async (data: WarehouseFormData) => {
    if (!id) {
      Alert.alert("Error", "Warehouse ID is missing.");
      return;
    }
    const payload = {
      ...data,
      storage_capacity: data.storage_capacity
        ? parseFloat(data.storage_capacity)
        : null,
    };
    try {
      await axiosInstance.put(`/warehouse/update/${id}`, payload);
      Alert.alert("Success", "Warehouse updated successfully!");
      await fetchWarehouseData();
    } catch (error) {
      Alert.alert("Error", "Failed to update warehouse.");
      throw error;
    }
  };

  const handleAddItem = async (data: InventoryFormData) => {
    if (!user_id || !id) {
      Alert.alert("Error", "User or Warehouse ID is missing.");
      return;
    }
    const payload = {
      user_id: Number(user_id),
      warehouse_id: Number(id),
      item_name: data.itemName,
      item_group: data.itemGroup,
      units: data.units,
      quantity: Number(data.quantity),
      price_per_unit: Number(data.pricePerUnit),
      minimum_limit: data.minimumLimit ? Number(data.minimumLimit) : undefined,
      feed: data.feed,
    };
    try {
      await axiosInstance.post(`/inventory/add`, payload);
      Alert.alert("Success", "Item added to warehouse successfully!");
      await fetchWarehouseData();
    } catch (error) {
      Alert.alert("Error", "Failed to add item.");
      throw error;
    }
  };

  const warehouseName =
    warehouseDetails?.name || queryWarehouseName || "Warehouse";
  const totalAssetValue = useMemo(
    () =>
      inventory.reduce(
        (acc, item) =>
          acc + (Number(item.price_per_unit) || 0) * (item.quantity || 0),
        0
      ),
    [inventory]
  );
  const lowStockItems = useMemo(
    () =>
      inventory.filter(
        (item) =>
          item.minimum_limit != null &&
          item.minimum_limit > 0 &&
          item.quantity < item.minimum_limit
      ),
    [inventory]
  );

  const chartConfig = {
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surface,
    color: (opacity = 1) =>
      `rgba(${theme.dark ? "255, 255, 255" : "0, 0, 0"}, ${opacity})`,
    labelColor: (opacity = 1) =>
      `rgba(${theme.dark ? "255, 255, 255" : "0, 0, 0"}, ${opacity})`,
    barPercentage: 0.8,
  };

  const barChartData = useMemo(() => {
    const labels = inventory.map((item) => item.item_name.substring(0, 10));
    const quantities = inventory.map((item) => item.quantity);
    const maxQuantity = Math.max(0, ...quantities);
    const barColors = quantities.map((q) => () => getBarColor(q, maxQuantity));
    return {
      labels: labels.length > 0 ? labels : ["No Items"],
      datasets: [
        {
          data: quantities.length > 0 ? quantities : [0],
          colors: barColors.length > 0 ? barColors : [() => "#9ca3af"],
        },
      ],
    };
  }, [inventory]);

  const chartWidth = useMemo(
    () => Math.max(screenWidth - 64, inventory.length * 60),
    [inventory.length]
  );

  if (loading) {
    return (
      <PlatformLayout>
        <Appbar.Header>
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
          <Appbar.Content title="Loading..." />
        </Appbar.Header>
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" />
        </View>
      </PlatformLayout>
    );
  }

  return (
    <PlatformLayout>
      <Appbar.Header>
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
        <Appbar.Content
          title={warehouseName}
          titleStyle={styles.appbarTitle}
          subtitle={`${inventory.length} Item(s)`}
        />
      </Appbar.Header>
      <ScrollView
        style={{ backgroundColor: theme.colors.background }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerActions}>
          <Button
            mode="outlined"
            onPress={() => setIsWarehouseFormOpen(true)}
            icon={() => (
              <FontAwesomeIcon
                icon={faPencilAlt}
                size={16}
                color={theme.colors.primary}
              />
            )}
          >
            Edit
          </Button>
          <Button
            mode="contained"
            icon={() => (
              <FontAwesomeIcon
                icon={faPlus}
                size={16}
                color={theme.colors.onPrimary}
              />
            )}
            onPress={() => setIsInventoryFormOpen(true)}
          >
            Add Item
          </Button>
        </View>

        {warehouseDetails && (
          <Card style={styles.card}>
            <Card.Content>
              <List.Item
                title={warehouseDetails.type}
                description="Type"
                left={(props) => (
                  <List.Icon
                    {...props}
                    icon={() => (
                      <FontAwesomeIcon
                        icon={faWarehouse}
                        size={22}
                        color={props.color}
                      />
                    )}
                  />
                )}
              />
              {warehouseDetails.storage_capacity && (
                <List.Item
                  title={`${warehouseDetails.storage_capacity} sq. ft.`}
                  description="Area"
                  left={(props) => (
                    <List.Icon
                      {...props}
                      icon={() => (
                        <FontAwesomeIcon
                          icon={faBox}
                          size={22}
                          color={props.color}
                        />
                      )}
                    />
                  )}
                />
              )}
              {warehouseDetails.contact_person && (
                <List.Item
                  title={warehouseDetails.contact_person}
                  description="Contact Person"
                  left={(props) => (
                    <List.Icon
                      {...props}
                      icon={() => (
                        <FontAwesomeIcon
                          icon={faUserTie}
                          size={22}
                          color={props.color}
                        />
                      )}
                    />
                  )}
                />
              )}
              {warehouseDetails.phone && (
                <List.Item
                  title={warehouseDetails.phone}
                  description="Phone"
                  left={(props) => (
                    <List.Icon
                      {...props}
                      icon={() => (
                        <FontAwesomeIcon
                          icon={faPhone}
                          size={22}
                          color={props.color}
                        />
                      )}
                    />
                  )}
                />
              )}
              {warehouseDetails.address_line_1 && (
                <List.Item
                  title={[
                    warehouseDetails.address_line_1,
                    warehouseDetails.city,
                    warehouseDetails.state,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                  description="Address"
                  left={(props) => (
                    <List.Icon
                      {...props}
                      icon={() => (
                        <FontAwesomeIcon
                          icon={faMapMarkerAlt}
                          size={22}
                          color={props.color}
                        />
                      )}
                    />
                  )}
                />
              )}
            </Card.Content>
          </Card>
        )}

        <Card style={styles.card}>
          <Card.Content style={styles.centeredCard}>
            <Text variant="bodyMedium">Total Asset Value</Text>
            <Text variant="headlineMedium">
              ₹
              {totalAssetValue.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
          </Card.Content>
        </Card>

        {inventory.length > 0 && (
          <Card style={styles.card}>
            <Card.Title title="Item Quantities" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <BarChart
                data={barChartData}
                width={chartWidth}
                height={220}
                chartConfig={chartConfig}
                yAxisLabel=""
                yAxisSuffix=""
                fromZero
                withCustomBarColorFromData
                flatColor
                showBarTops={false}
              />
            </ScrollView>
            <Card.Actions style={styles.legend}>
              <View style={styles.legendItem}>
                <View
                  style={[styles.legendColor, { backgroundColor: "#ef4444" }]}
                />
                <Text>{"<"} 25%</Text>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[styles.legendColor, { backgroundColor: "#f97316" }]}
                />
                <Text>{"<"} 50%</Text>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[styles.legendColor, { backgroundColor: "#eab308" }]}
                />
                <Text>{"<"} 75%</Text>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[styles.legendColor, { backgroundColor: "#22c55e" }]}
                />
                <Text>≥ 75%</Text>
              </View>
            </Card.Actions>
          </Card>
        )}

        {lowStockItems.length > 0 && (
          <Card style={[styles.card, { borderColor: theme.colors.error }]}>
            <Card.Title
              title="Low Stock Alerts"
              titleStyle={{ color: theme.colors.error }}
            />
            <Card.Content>
              {lowStockItems.map((item) => (
                <List.Item
                  key={item.inventory_id}
                  title={item.item_name}
                  description={`Qty: ${item.quantity} (Min: ${item.minimum_limit})`}
                  left={(props) => (
                    <List.Icon
                      {...props}
                      icon={() => (
                        <FontAwesomeIcon
                          icon={faExclamationTriangle}
                          size={22}
                          color={theme.colors.error}
                        />
                      )}
                    />
                  )}
                />
              ))}
            </Card.Content>
          </Card>
        )}

        <View style={styles.inventorySection}>
          <Text variant="titleLarge" style={styles.inventoryTitle}>
            Inventory Items
          </Text>
          {inventory.length > 0 ? (
            inventory.map((item) => {
              const isLowStock =
                item.minimum_limit != null &&
                item.quantity < item.minimum_limit;
              return (
                <Card key={item.inventory_id} style={styles.itemCard}>
                  <Card.Title
                    title={item.item_name}
                    subtitle={item.item_group}
                    right={() => (
                      <Text style={styles.priceText}>
                        ₹{(Number(item.price_per_unit) || 0).toFixed(2)}
                      </Text>
                    )}
                    rightStyle={styles.priceContainer}
                  />
                  <Card.Content style={styles.itemContent}>
                    <Text>
                      Quantity: {item.quantity} {item.units}
                    </Text>
                    {isLowStock && (
                      <Chip
                        icon={() => (
                          <FontAwesomeIcon
                            icon={faExclamationTriangle}
                            size={16}
                            color={theme.colors.error}
                          />
                        )}
                        selectedColor={theme.colors.error}
                      >
                        Low Stock
                      </Chip>
                    )}
                  </Card.Content>
                </Card>
              );
            })
          ) : (
            <Text style={styles.emptyText}>No items in this warehouse.</Text>
          )}
        </View>
      </ScrollView>

      <InventoryForm
        isVisible={isInventoryFormOpen}
        onClose={() => setIsInventoryFormOpen(false)}
        onSubmit={handleAddItem}
        formTitle={`Add Item to ${warehouseName}`}
        userId={user_id}
      />
      <WarehouseForm
        isVisible={isWarehouseFormOpen}
        onClose={() => setIsWarehouseFormOpen(false)}
        onSubmit={handleUpdateWarehouse}
        initialData={warehouseDetails}
        formTitle={`Edit ${warehouseName}`}
      />
    </PlatformLayout>
  );
};

const styles = StyleSheet.create({
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  appbarTitle: { flexShrink: 1 },
  headerActions: {
    flexDirection: "row",
    gap: 8,
    padding: 16,
    justifyContent: "flex-end",
  },
  card: { margin: 16, marginTop: 0 },
  centeredCard: { alignItems: "center", gap: 4 },
  legend: { justifyContent: "center", flexWrap: "wrap", gap: 16 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendColor: { width: 12, height: 12, borderRadius: 2 },
  inventorySection: { padding: 16 },
  inventoryTitle: { marginBottom: 16 },
  itemCard: { marginBottom: 12 },
  itemContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    marginTop: 16,
    borderTopWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  priceContainer: { paddingRight: 16 },
  priceText: { fontSize: 16, fontWeight: "bold" },
  emptyText: { textAlign: "center", paddingVertical: 32 },
});

export default WarehouseDetailScreen;
