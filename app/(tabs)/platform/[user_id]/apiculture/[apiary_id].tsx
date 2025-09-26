import ApicultureForm, {
  ApiaryFormData,
} from "@/components/form/apiculture/ApicultureForm";
import HiveForm, { HiveFormData } from "@/components/form/apiculture/HiveForm";
import PlatformLayout from "@/components/layout/PlatformLayout";
import axiosInstance from "@/lib/axiosInstance";
import {
  faArrowLeft,
  faBeer,
  faCalendarDays,
  faMapMarkerAlt,
  faPlus,
  faVectorSquare,
} from "@fortawesome/free-solid-svg-icons";

import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Appbar,
  Button,
  Card,
  Divider,
  List,
  Searchbar,
  Text,
  useTheme,
} from "react-native-paper";

type ApicultureDetail = {
  apiary_id: number;
  user_id: number;
  apiary_name: string;
  number_of_hives: number;
  area: number | null;
  created_at: string;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
};
type HiveData = {
  hive_id: number;
  apiary_id: number;
  hive_name: string;
  hive_type: string | null;
  bee_species: string | null;
  last_inspection_date: string | null;
  honey_capacity: number | null;
  unit: string | null;
};
type ItemRecord = {
  inventory_id: number;
  item_name: string;
  quantity: number;
  minimum_limit?: number;
};

const ApicultureDetailPage = () => {
  const router = useRouter();
  const { user_id, apiary_id } = useLocalSearchParams<{
    user_id: string;
    apiary_id: string;
  }>();
  const theme = useTheme();

  const [apiaryData, setApiaryData] = useState<ApicultureDetail | null>(null);
  const [hives, setHives] = useState<HiveData[]>([]);
  const [loadingApiary, setLoadingApiary] = useState(true);
  const [loadingHives, setLoadingHives] = useState(true);
  const [showApiaryForm, setShowApiaryForm] = useState(false);
  const [showHiveForm, setShowHiveForm] = useState(false);
  const [hiveSearchQuery, setHiveSearchQuery] = useState("");
  const numericApiaryId = apiary_id ? parseInt(apiary_id, 10) : 0;

  const fetchApiaryDetails = useCallback(async () => {
    if (!numericApiaryId) return;
    setLoadingApiary(true);
    try {
      const response = await axiosInstance.get(
        `/apiculture/${numericApiaryId}`
      );
      setApiaryData(response.data);
    } catch (error) {
      setApiaryData(null);
    } finally {
      setLoadingApiary(false);
    }
  }, [numericApiaryId]);

  const fetchHives = useCallback(async () => {
    if (!numericApiaryId) return;
    setLoadingHives(true);
    try {
      const response = await axiosInstance.get(
        `/bee-hives/apiary/${numericApiaryId}`
      );
      setHives(response.data.hives || []);
    } catch (error) {
      setHives([]);
    } finally {
      setLoadingHives(false);
    }
  }, [numericApiaryId]);

  useFocusEffect(
    useCallback(() => {
      fetchApiaryDetails();
      fetchHives();
    }, [fetchApiaryDetails, fetchHives])
  );

  const handleApiaryFormSuccess = async (data: ApiaryFormData) => {
    if (!numericApiaryId) return;
    const payload = {
      ...data,
      user_id: parseInt(user_id, 10),
      number_of_hives: parseInt(data.number_of_hives, 10),
      area: data.area ? parseFloat(data.area) : null,
    };
    await axiosInstance.put(`/apiculture/update/${numericApiaryId}`, payload);
    setShowApiaryForm(false);
    await fetchApiaryDetails();
  };

  const handleHiveFormSuccess = async (data: HiveFormData) => {
    const payload = {
      ...data,
      apiary_id: numericApiaryId,
      honey_capacity: data.honey_capacity
        ? parseFloat(data.honey_capacity)
        : null,
      last_inspection_date: data.last_inspection_date || null,
    };
    await axiosInstance.post(`/bee-hives/add`, payload);
    setShowHiveForm(false);
    await fetchHives();
    await fetchApiaryDetails();
  };

  const handleHiveClick = (hive: HiveData) => {
    if (!apiaryData) return;
    router.push(
      `/platform/${user_id}/apiculture/${numericApiaryId}/${
        hive.hive_id
      }?apiaryName=${encodeURIComponent(apiaryData.apiary_name)}`
    );
  };

  const detailItems = useMemo(() => {
    if (!apiaryData) return [];
    const fullAddress = [
      apiaryData.address_line_1,
      apiaryData.city,
      apiaryData.state,
      apiaryData.postal_code,
    ]
      .filter(Boolean)
      .join(", ");
    return [
      {
        label: "Address",
        value: fullAddress || "N/A",
        icon: faMapMarkerAlt,
      },
      {
        label: "Total Hives",
        value: String(apiaryData.number_of_hives),
        icon: faBeer,
      },
      {
        label: "Area",
        value: apiaryData.area != null ? `${apiaryData.area} sq. m` : "N/A",
        icon: faVectorSquare,
      },
      {
        label: "Created On",
        value: new Date(apiaryData.created_at).toLocaleDateString(),
        icon: faCalendarDays,
      },
    ];
  }, [apiaryData]);

  const filteredHives = useMemo(
    () =>
      hives.filter(
        (hive) =>
          hive.hive_name
            .toLowerCase()
            .includes(hiveSearchQuery.toLowerCase()) ||
          hive.hive_type?.toLowerCase().includes(hiveSearchQuery.toLowerCase())
      ),
    [hives, hiveSearchQuery]
  );

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
          onPress={() => router.push(`/platform/${user_id}/apiculture`)}
        />
        <Appbar.Content title={apiaryData?.apiary_name || "Bee Yard Details"} />
        <Button
          onPress={() => setShowHiveForm(true)}
          textColor={theme.colors.primary}
          icon={() => (
            <FontAwesomeIcon
              icon={faPlus}
              size={18}
              color={theme.colors.primary}
            />
          )}
        >
          New Hive
        </Button>
      </Appbar.Header>
      <ScrollView style={{ backgroundColor: theme.colors.background }}>
        <View style={styles.container}>
          <Card style={styles.card}>
            {loadingApiary ? (
              <ActivityIndicator style={styles.loader} />
            ) : apiaryData ? (
              <>
                <Card.Actions>
                  <Button onPress={() => setShowApiaryForm(true)}>
                    Edit Bee Yard
                  </Button>
                </Card.Actions>
                <Divider />
                <Card.Content style={styles.detailsGrid}>
                  {detailItems.map((item) => (
                    <List.Item
                      key={item.label}
                      title={item.value}
                      description={item.label}
                      left={(props) => (
                        <View {...props} style={styles.iconContainer}>
                          <FontAwesomeIcon
                            icon={item.icon}
                            size={24}
                            color={theme.colors.onSurfaceVariant}
                          />
                        </View>
                      )}
                      style={styles.detailItem}
                    />
                  ))}
                </Card.Content>
              </>
            ) : (
              <Card.Content>
                <Text style={{ color: theme.colors.error }}>
                  Bee Yard data could not be loaded.
                </Text>
              </Card.Content>
            )}
          </Card>

          <View style={styles.hivesSection}>
            <Text variant="headlineSmall">Hives in this Bee Yard</Text>
            <Searchbar
              placeholder="Search Hives..."
              value={hiveSearchQuery}
              onChangeText={setHiveSearchQuery}
              style={styles.searchbar}
            />
            {loadingHives ? (
              <ActivityIndicator style={styles.loader} />
            ) : filteredHives.length > 0 ? (
              filteredHives.map((item) => (
                <Card
                  key={item.hive_id}
                  onPress={() => handleHiveClick(item)}
                  style={styles.hiveCard}
                >
                  <Card.Title title={item.hive_name} />
                  <Card.Content style={styles.hiveCardContent}>
                    <Text>Type: {item.hive_type || "N/A"}</Text>
                    <Text>
                      Last Inspected:{" "}
                      {item.last_inspection_date
                        ? new Date(
                            item.last_inspection_date
                          ).toLocaleDateString()
                        : "N/A"}
                    </Text>
                  </Card.Content>
                </Card>
              ))
            ) : (
              <Text style={styles.emptyText}>No hives found.</Text>
            )}
          </View>
        </View>
      </ScrollView>

      {showApiaryForm && apiaryData && (
        <ApicultureForm
          isVisible={showApiaryForm}
          onClose={() => setShowApiaryForm(false)}
          onSubmit={handleApiaryFormSuccess}
          apiaryToEdit={apiaryData}
          formTitle="Edit Bee Yard"
        />
      )}
      {showHiveForm && (
        <HiveForm
          isVisible={showHiveForm}
          onClose={() => setShowHiveForm(false)}
          onSubmit={handleHiveFormSuccess}
          apiaryId={numericApiaryId}
          formTitle="Add New Hive"
        />
      )}
    </PlatformLayout>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, gap: 24 },
  card: {},
  loader: { marginVertical: 24 },
  detailsGrid: { flexDirection: "row", flexWrap: "wrap" },
  detailItem: { width: "50%" },
  iconContainer: {
    justifyContent: "center",
    alignItems: "center",
    width: 24,
    marginLeft: 14,
    marginRight: 18,
  },
  hivesSection: { gap: 16 },
  searchbar: {},
  hiveCard: { marginBottom: 12 },
  hiveCardContent: { flexDirection: "row", justifyContent: "space-between" },
  emptyText: { textAlign: "center", padding: 32 },
});

export default ApicultureDetailPage;
