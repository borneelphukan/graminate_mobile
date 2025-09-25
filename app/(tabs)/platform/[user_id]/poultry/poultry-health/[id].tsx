import PlatformLayout from "@/components/layout/PlatformLayout";
import axiosInstance from "@/lib/axiosInstance";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";
import {
  ActivityIndicator,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from "react-native";
import {
  Appbar,
  Button,
  Card,
  Chip,
  Divider,
  List,
  Text,
  useTheme,
} from "react-native-paper";

type PoultryHealthRecord = {
  poultry_health_id: number;
  user_id: number;
  flock_id: number;
  veterinary_name?: string;
  total_birds: number;
  birds_vaccinated: number;
  vaccines_given?: string[];
  symptoms?: string[];
  medicine_approved?: string[];
  remarks?: string;
  next_appointment?: string;
  created_at: string;
};

type FlockData = {
  flock_id: number;
  flock_name: string;
  flock_type: string;
};

const PoultryHealthDetailsScreen = () => {
  const router = useRouter();
  const navigation = useNavigation();
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [record, setRecord] = useState<PoultryHealthRecord | null>(null);
  const [flockData, setFlockData] = useState<FlockData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRecordDetails = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const recordResponse = await axiosInstance.get<PoultryHealthRecord>(
        `/poultry-health/record/${id}`
      );
      const fetchedRecord = recordResponse.data;
      setRecord(fetchedRecord);

      if (fetchedRecord?.flock_id) {
        const flockResponse = await axiosInstance.get<FlockData>(
          `/flock/${fetchedRecord.flock_id}`
        );
        setFlockData(flockResponse.data);
      }
    } catch (error) {
      setRecord(null);
      setFlockData(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRecordDetails();
  }, [fetchRecordDetails]);

  useLayoutEffect(() => {
    if (record) {
      navigation.setOptions({ title: `Record #${record.poultry_health_id}` });
    }
  }, [navigation, record]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatArray = (arr?: string[]) => {
    if (!arr || arr.length === 0) return "N/A";
    return arr.join(", ");
  };

  const onShare = async () => {
    if (!record || !flockData) return;
    try {
      await Share.share({
        message: `Poultry Health Record for ${
          flockData.flock_name
        }\n\nRecord ID: ${record.poultry_health_id}\nDate: ${formatDate(
          record.created_at
        )}\nVeterinarian: ${
          record.veterinary_name || "N/A"
        }\nSymptoms: ${formatArray(
          record.symptoms
        )}\n\nView more details on the app.`,
      });
    } catch (error: any) {
      alert(error.message);
    }
  };

  if (loading) {
    return (
      <PlatformLayout>
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" />
        </View>
      </PlatformLayout>
    );
  }

  if (!record) {
    return (
      <PlatformLayout>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => router.back()} />
          <Appbar.Content title="Error" />
        </Appbar.Header>
        <View style={styles.centeredContainer}>
          <Text variant="titleLarge" style={{ color: theme.colors.error }}>
            Record Not Found
          </Text>
          <Button onPress={() => router.back()} style={styles.button}>
            Go Back
          </Button>
        </View>
      </PlatformLayout>
    );
  }

  return (
    <PlatformLayout>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title={`Record #${record.poultry_health_id}`} />
        <Appbar.Action icon="share-variant" onPress={onShare} />
      </Appbar.Header>
      <ScrollView contentContainerStyle={styles.container}>
        <Card>
          <Card.Title
            title={flockData?.flock_name || "Health Record"}
            titleVariant="headlineSmall"
            subtitle={`Report ID: #${record.poultry_health_id} • ${formatDate(
              record.created_at
            )}`}
            subtitleStyle={styles.subtitle}
          />
          <Card.Content>
            <List.Section>
              <List.Subheader>Veterinary Details</List.Subheader>
              <List.Item
                title={record.veterinary_name || "N/A"}
                description="Veterinarian"
                left={() => <List.Icon icon="doctor" />}
              />
              <List.Item
                title={record.total_birds}
                description="Total Birds (in record)"
                left={() => <List.Icon icon="clipboard-text-outline" />}
              />
              <List.Item
                title={record.birds_vaccinated}
                description="Birds Vaccinated"
                left={() => <List.Icon icon="syringe" />}
              />
              {record.vaccines_given && record.vaccines_given.length > 0 && (
                <List.Item
                  title={formatArray(record.vaccines_given)}
                  description="Vaccines Given"
                  left={() => <List.Icon icon="beaker-outline" />}
                  titleNumberOfLines={5}
                />
              )}
            </List.Section>
            <Divider />
            <List.Section>
              <List.Subheader>Health Assessment</List.Subheader>
              {record.symptoms && record.symptoms.length > 0 && (
                <List.Item
                  title={formatArray(record.symptoms)}
                  description="Symptoms Observed"
                  left={() => <List.Icon icon="stethoscope" />}
                  titleNumberOfLines={5}
                />
              )}
              {record.medicine_approved &&
                record.medicine_approved.length > 0 && (
                  <List.Item
                    title={formatArray(record.medicine_approved)}
                    description="Medicine Approved"
                    left={() => <List.Icon icon="pill" />}
                    titleNumberOfLines={5}
                  />
                )}
            </List.Section>
            {record.remarks && (
              <>
                <Divider />
                <List.Section>
                  <List.Subheader>Remarks</List.Subheader>
                  <Text style={styles.remarksText}>{record.remarks}</Text>
                </List.Section>
              </>
            )}
            {record.next_appointment && (
              <>
                <Divider />
                <List.Section>
                  <List.Subheader>Next Appointment</List.Subheader>
                  <Chip icon="calendar-check" style={styles.chip}>
                    {formatDate(record.next_appointment)}
                  </Chip>
                </List.Section>
              </>
            )}
          </Card.Content>
        </Card>
      </ScrollView>
    </PlatformLayout>
  );
};

const styles = StyleSheet.create({
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  container: { padding: 16 },
  button: { marginTop: 16 },
  subtitle: { marginTop: -4 },
  remarksText: { paddingHorizontal: 16, lineHeight: 22 },
  chip: { alignSelf: "flex-start", marginLeft: 16 },
});

export default PoultryHealthDetailsScreen;
