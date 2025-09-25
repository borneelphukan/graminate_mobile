import WarehouseForm, {
  WarehouseFormData,
} from "@/components/form/warehouse/WarehouseForm";
import PlatformLayout from "@/components/layout/PlatformLayout";
import {
  faArrowLeft,
  faBox,
  faMapMarkerAlt,
  faPhone,
  faPlus,
  faUser,
  faWarehouse,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, SafeAreaView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Appbar,
  Button,
  Card,
  Chip,
  FAB,
  Searchbar,
  Text,
  useTheme,
} from "react-native-paper";

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const api = axios.create({ baseURL: API_URL });

type WarehouseRecord = {
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

const WarehouseCard = ({
  item,
  onPress,
}: {
  item: WarehouseRecord;
  onPress: () => void;
}) => {
  const theme = useTheme();
  const addressString = [
    item.address_line_1,
    item.address_line_2,
    item.city,
    item.state,
    item.postal_code,
    item.country,
  ]
    .filter(Boolean)
    .join(", ");
  return (
    <Card onPress={onPress} style={styles.warehouseCard}>
      <Card.Title
        title={item.name}
        titleVariant="titleLarge"
        right={() => <Chip style={styles.chip}>{item.type}</Chip>}
      />
      <Card.Content>
        {!!addressString && (
          <View style={styles.infoRow}>
            <FontAwesomeIcon
              icon={faMapMarkerAlt}
              size={16}
              color={theme.colors.onSurfaceVariant}
            />
            <Text variant="bodyMedium" style={styles.infoText}>
              {addressString}
            </Text>
          </View>
        )}
        <View style={styles.contactRow}>
          {item.contact_person && (
            <View style={styles.infoRow}>
              <FontAwesomeIcon
                icon={faUser}
                size={16}
                color={theme.colors.onSurfaceVariant}
              />
              <Text variant="bodyMedium" style={styles.infoText}>
                {item.contact_person}
              </Text>
            </View>
          )}
          {item.phone && (
            <View style={styles.infoRow}>
              <FontAwesomeIcon
                icon={faPhone}
                size={16}
                color={theme.colors.onSurfaceVariant}
              />
              <Text variant="bodyMedium" style={styles.infoText}>
                {item.phone}
              </Text>
            </View>
          )}
          {item.storage_capacity != null && (
            <View style={styles.infoRow}>
              <FontAwesomeIcon
                icon={faBox}
                size={16}
                color={theme.colors.onSurfaceVariant}
              />
              <Text variant="bodyMedium" style={styles.infoText}>
                {String(item.storage_capacity)}
              </Text>
            </View>
          )}
        </View>
      </Card.Content>
    </Card>
  );
};

const StoragePage = () => {
  const { user_id } = useLocalSearchParams<{ user_id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const [warehouses, setWarehouses] = useState<WarehouseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormVisible, setIsFormVisible] = useState(false);

  const fetchWarehouses = useCallback(async () => {
    if (!user_id) return;
    setLoading(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem("accessToken");
      if (!token) throw new Error("Authentication token not found.");
      const response = await api.get(`/warehouse/user/${user_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setWarehouses(
        Array.isArray(response.data?.warehouses) ? response.data.warehouses : []
      );
    } catch (err: any) {
      const errorMessage = axios.isAxiosError(err)
        ? err.response?.data?.message || "Failed to connect"
        : err.message || "An unexpected error occurred.";
      setError(errorMessage);
      setWarehouses([]);
    } finally {
      setLoading(false);
    }
  }, [user_id]);

  useFocusEffect(
    useCallback(() => {
      fetchWarehouses();
    }, [fetchWarehouses])
  );

  const handleCreateWarehouse = async (data: WarehouseFormData) => {
    if (!user_id) {
      Alert.alert("Error", "User ID not found.");
      return;
    }
    try {
      const token = await AsyncStorage.getItem("accessToken");
      if (!token) throw new Error("Authentication token not found.");
      const payload = {
        ...data,
        user_id: Number(user_id),
        storage_capacity: data.storage_capacity
          ? parseFloat(data.storage_capacity)
          : null,
      };
      await api.post("/warehouse/add", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      Alert.alert("Success", "Warehouse created successfully.");
      await fetchWarehouses();
    } catch (err) {
      const errorMessage = axios.isAxiosError(err)
        ? err.response?.data?.message || "An API error occurred"
        : "An unexpected error occurred.";
      Alert.alert("Creation Failed", errorMessage);
      throw err;
    }
  };

  const handleRowClick = (item: WarehouseRecord) => {
    if (!user_id) {
      Alert.alert("Error", "Cannot navigate: User ID is missing.");
      return;
    }
    router.push({
      pathname: "/platform/[user_id]/warehouse/[id]",
      params: { user_id, id: item.warehouse_id, warehouseName: item.name },
    });
  };

  const filteredWarehouses = useMemo(() => {
    if (!searchQuery) return warehouses;
    return warehouses.filter((item) => {
      const searchTerm = searchQuery.toLowerCase();
      const addressString = [
        item.address_line_1,
        item.address_line_2,
        item.city,
        item.state,
        item.postal_code,
        item.country,
      ]
        .filter(Boolean)
        .join(", ")
        .toLowerCase();
      return (
        item.name.toLowerCase().includes(searchTerm) ||
        item.type.toLowerCase().includes(searchTerm) ||
        addressString.includes(searchTerm) ||
        (item.contact_person &&
          item.contact_person.toLowerCase().includes(searchTerm)) ||
        (item.phone && item.phone.toLowerCase().includes(searchTerm)) ||
        (item.storage_capacity &&
          String(item.storage_capacity).toLowerCase().includes(searchTerm))
      );
    });
  }, [warehouses, searchQuery]);

  const renderContent = () => {
    if (!user_id)
      return (
        <View style={styles.centeredContainer}>
          <Text style={{ color: theme.colors.error }}>User ID not found.</Text>
        </View>
      );
    if (loading && warehouses.length === 0)
      return (
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" />
        </View>
      );
    if (error)
      return (
        <View style={styles.centeredContainer}>
          <Text style={{ color: theme.colors.error }}>{error}</Text>
          <Button onPress={fetchWarehouses}>Retry</Button>
        </View>
      );
    if (filteredWarehouses.length === 0) {
      return (
        <View style={styles.centeredContainer}>
          <FontAwesomeIcon
            icon={faWarehouse}
            size={64}
            color={theme.colors.onSurfaceDisabled}
          />
          <Text style={{ color: theme.colors.onSurfaceDisabled }}>
            {searchQuery
              ? `No warehouses found for "${searchQuery}"`
              : "No warehouses found. Tap '+' to add one."}
          </Text>
        </View>
      );
    }
    return (
      <FlatList
        data={filteredWarehouses}
        renderItem={({ item }) => (
          <WarehouseCard item={item} onPress={() => handleRowClick(item)} />
        )}
        keyExtractor={(item) => item.warehouse_id.toString()}
        onRefresh={fetchWarehouses}
        refreshing={loading}
        contentContainerStyle={styles.listContent}
      />
    );
  };

  return (
    <PlatformLayout>
      <SafeAreaView
        style={[styles.flex, { backgroundColor: theme.colors.background }]}
      >
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
            title="Warehouses"
            subtitle={`${
              loading ? "Loading..." : `${filteredWarehouses.length} Record(s)`
            }`}
          />
        </Appbar.Header>
        <Searchbar
          placeholder="Search warehouses..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchbar}
        />
        {renderContent()}
        <FAB
          icon={() => (
            <FontAwesomeIcon
              icon={faPlus}
              size={22}
              color={theme.colors.onPrimaryContainer}
            />
          )}
          style={styles.fab}
          onPress={() => setIsFormVisible(true)}
        />
        <WarehouseForm
          isVisible={isFormVisible}
          onClose={() => setIsFormVisible(false)}
          onSubmit={handleCreateWarehouse}
        />
      </SafeAreaView>
    </PlatformLayout>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  searchbar: { marginHorizontal: 16, marginTop: 8 },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    gap: 16,
    textAlign: "center",
  },
  listContent: { padding: 16, paddingBottom: 80 },
  warehouseCard: { marginBottom: 12 },
  chip: { marginRight: 8 },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginRight: 16,
  },
  infoText: { marginLeft: 8, flexShrink: 1 },
  contactRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  fab: { position: "absolute", margin: 16, right: 0, bottom: 0 },
});

export default StoragePage;
