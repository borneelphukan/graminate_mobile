import axiosInstance from "@/lib/axiosInstance";
import {
  addMonths,
  addWeeks,
  eachDayOfInterval,
  format,
  isBefore,
  isSameDay,
  isValid as isValidDate,
  parseISO,
  subDays as subDaysDateFns,
} from "date-fns";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Dimensions, Modal, StyleSheet, View } from "react-native";
import { Calendar, DateData } from "react-native-calendars";
import { BarChart } from "react-native-chart-kit";
import {
  ActivityIndicator,
  Button,
  Card,
  DataTable,
  Divider,
  Menu,
  Portal,
  Searchbar,
  SegmentedButtons,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from "react-native-paper";

const TIME_RANGE_OPTIONS = ["Weekly", "Bi-Weekly", "1 Month"] as const;
type TimeRange = (typeof TIME_RANGE_OPTIONS)[number];

type HoneyProductionRecordFromApi = {
  harvest_id: number;
  hive_id: number;
  user_id: number;
  harvest_date: string;
  hive_name: string | null;
  honey_weight: string;
  logged_at: string;
  frames_harvested: string | null;
  honey_type: string | null;
  harvest_notes: string | null;
};

type ProcessedHoneyRecord = {
  harvest_id: number;
  hive_id: number;
  user_id: number;
  harvest_date: Date;
  hive_name: string | null;
  honey_weight: number;
  logged_at: string;
  frames_harvested: number | null;
  honey_type: string | null;
  harvest_notes: string | null;
};

interface HoneyProductionCardProps {
  userId?: string;
  hiveId?: string;
}

const today = new Date();
today.setHours(0, 0, 0, 0);
const ITEMS_PER_PAGE = 5;

const PaperFormDropdown = ({
  label,
  items,
  selectedValue,
  onSelect,
  disabled = false,
  placeholder,
}: any) => {
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.inputContainer}>
      <Menu
        visible={visible}
        onDismiss={() => setVisible(false)}
        anchor={
          <TouchableRipple
            onPress={() => !disabled && setVisible(true)}
            disabled={disabled}
          >
            <TextInput
              mode="outlined"
              label={label}
              value={selectedValue}
              placeholder={placeholder}
              editable={false}
              pointerEvents="none"
              right={<TextInput.Icon icon="menu-down" />}
              disabled={disabled}
            />
          </TouchableRipple>
        }
      >
        {items.map((item: string) => (
          <Menu.Item
            key={item}
            title={item}
            onPress={() => {
              onSelect(item);
              setVisible(false);
            }}
          />
        ))}
      </Menu>
    </View>
  );
};

const HoneyProductionCard = ({ userId, hiveId }: HoneyProductionCardProps) => {
  const theme = useTheme();
  const [activeView, setActiveView] = useState<"chart" | "form" | "table">(
    "chart"
  );
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>(
    TIME_RANGE_OPTIONS[0]
  );
  const [dateOffset, setDateOffset] = useState(0);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [allHoneyRecords, setAllHoneyRecords] = useState<
    ProcessedHoneyRecord[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingRecord, setEditingRecord] =
    useState<ProcessedHoneyRecord | null>(null);
  const [formData, setFormData] = useState({
    harvest_date: format(new Date(), "yyyy-MM-dd"),
    honey_weight: "",
    frames_harvested: "",
    honey_type: "",
    harvest_notes: "",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [datePickerTarget, setDatePickerTarget] = useState<
    "start" | "end" | "form" | null
  >(null);

  const fetchHoneyData = useCallback(async () => {
    if (!hiveId) {
      setIsLoading(false);
      setAllHoneyRecords([]);
      return;
    }
    setIsLoading(true);
    try {
      const response = await axiosInstance.get<{
        harvests: HoneyProductionRecordFromApi[];
      }>(`/honey-production/hive/${hiveId}`);
      const processedRecords = response.data.harvests.map(
        (record: HoneyProductionRecordFromApi) => ({
          ...record,
          harvest_date: parseISO(record.harvest_date),
          honey_weight: parseFloat(record.honey_weight) || 0,
          frames_harvested: record.frames_harvested
            ? parseInt(record.frames_harvested, 10)
            : null,
        })
      );
      setAllHoneyRecords(processedRecords);
    } catch (error) {
      setAllHoneyRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, [hiveId]);

  useEffect(() => {
    fetchHoneyData();
  }, [hiveId, fetchHoneyData]);

  useEffect(() => {
    if (editingRecord) {
      setFormData({
        harvest_date: format(editingRecord.harvest_date, "yyyy-MM-dd"),
        honey_weight: editingRecord.honey_weight.toString(),
        frames_harvested: editingRecord.frames_harvested?.toString() || "",
        honey_type: editingRecord.honey_type || "",
        harvest_notes: editingRecord.harvest_notes || "",
      });
    } else {
      setFormData({
        harvest_date: format(new Date(), "yyyy-MM-dd"),
        honey_weight: "",
        frames_harvested: "",
        honey_type: "",
        harvest_notes: "",
      });
    }
  }, [editingRecord]);

  const handleFormChange = (field: string, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));
  const handleFormSubmit = async () => {
    if (!formData.harvest_date || !formData.honey_weight) {
      Alert.alert("Error", "Harvest Date and Honey Weight are required.");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        hive_id: parseInt(hiveId!, 10),
        harvest_date: formData.harvest_date,
        honey_weight: parseFloat(formData.honey_weight),
        frames_harvested: formData.frames_harvested
          ? parseInt(formData.frames_harvested, 10)
          : undefined,
        honey_type: formData.honey_type || undefined,
        harvest_notes: formData.harvest_notes || undefined,
      };
      if (editingRecord) {
        await axiosInstance.put(
          `/honey-production/update/${editingRecord.harvest_id}`,
          payload
        );
        Alert.alert("Success", "Harvest updated successfully!");
      } else {
        await axiosInstance.post("/honey-production/add", payload);
        Alert.alert("Success", "Harvest logged successfully!");
      }
      await fetchHoneyData();
      setEditingRecord(null);
      setActiveView("table");
    } catch (error) {
      Alert.alert("Error", "Failed to save harvest.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDayPress = (day: DateData) => {
    if (datePickerTarget === "form") {
      handleFormChange("harvest_date", day.dateString);
    } else if (datePickerTarget === "start") {
      const selectedDate = parseISO(day.dateString);
      setStartDate(selectedDate);
      if (endDate && isBefore(endDate, selectedDate)) setEndDate(null);
    } else if (datePickerTarget === "end") {
      const selectedDate = parseISO(day.dateString);
      if (!startDate) Alert.alert("Error", "Please select a start date first.");
      else if (isBefore(selectedDate, startDate))
        Alert.alert("Invalid Range", "End date cannot be before start date.");
      else setEndDate(selectedDate);
    }
    setDatePickerVisible(false);
  };
  const openDatePicker = (target: "start" | "end" | "form") => {
    setDatePickerTarget(target);
    setDatePickerVisible(true);
  };
  const markedDates = useMemo(() => {
    const marked: { [key: string]: any } = {};
    if (datePickerTarget === "form")
      marked[formData.harvest_date] = { selected: true };
    if (datePickerTarget === "start" && startDate)
      marked[format(startDate, "yyyy-MM-dd")] = { selected: true };
    if (datePickerTarget === "end" && endDate)
      marked[format(endDate, "yyyy-MM-dd")] = { selected: true };
    return marked;
  }, [datePickerTarget, formData.harvest_date, startDate, endDate]);

  const isCustomDateRangeActive = useMemo(
    () =>
      !!(
        startDate &&
        endDate &&
        isValidDate(startDate) &&
        isValidDate(endDate) &&
        !isBefore(endDate, startDate)
      ),
    [startDate, endDate]
  );
  const currentIntervalDates = useMemo(() => {
    let viewStart: Date | null = null,
      viewEnd: Date | null = null;
    if (isCustomDateRangeActive && startDate && endDate) {
      viewStart = startDate;
      viewEnd = endDate;
    } else {
      const refDate = today;
      if (selectedTimeRange === "Weekly") {
        viewEnd = addWeeks(refDate, dateOffset);
        viewStart = subDaysDateFns(viewEnd, 6);
      } else if (selectedTimeRange === "Bi-Weekly") {
        viewEnd = addWeeks(refDate, dateOffset * 2);
        viewStart = subDaysDateFns(viewEnd, 13);
      } else if (selectedTimeRange === "1 Month") {
        const target = addMonths(refDate, dateOffset);
        viewStart = new Date(target.getFullYear(), target.getMonth(), 1);
        viewEnd = new Date(target.getFullYear(), target.getMonth() + 1, 0);
      }
    }
    if (
      viewStart &&
      viewEnd &&
      isValidDate(viewStart) &&
      isValidDate(viewEnd) &&
      !isBefore(viewEnd, viewStart)
    ) {
      return eachDayOfInterval({ start: viewStart, end: viewEnd });
    }
    return [];
  }, [
    isCustomDateRangeActive,
    startDate,
    endDate,
    selectedTimeRange,
    dateOffset,
  ]);

  const chartData = useMemo(() => {
    if (currentIntervalDates.length === 0) return null;
    const labels =
      selectedTimeRange === "1 Month"
        ? currentIntervalDates.map((date, index) =>
            index % 4 === 0 ? format(date, "d") : ""
          )
        : currentIntervalDates.map((date) =>
            format(date, currentIntervalDates.length > 7 ? "d" : "EEE")
          );
    const dataPoints = currentIntervalDates.map((d) =>
      allHoneyRecords
        .filter((r) => isSameDay(r.harvest_date, d))
        .reduce((sum, r) => sum + r.honey_weight, 0)
    );
    return { labels, datasets: [{ data: dataPoints }] };
  }, [allHoneyRecords, currentIntervalDates, selectedTimeRange]);

  const chartConfig = {
    backgroundColor: theme.colors.surface,
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surface,
    decimalPlaces: 1,
    color: (opacity = 1) =>
      theme.dark
        ? `rgba(251, 191, 36, ${opacity})`
        : `rgba(234, 179, 8, ${opacity})`,
    labelColor: (opacity = 1) => theme.colors.onSurface,
  };

  const handleRowClick = (recordToEdit: ProcessedHoneyRecord) => {
    setEditingRecord(recordToEdit);
    setActiveView("form");
  };
  const filteredHoneyRecordsForTable = useMemo(() => {
    if (!searchQuery) return allHoneyRecords;
    return allHoneyRecords.filter((record) =>
      Object.values(record).some((value) =>
        String(value).toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  }, [allHoneyRecords, searchQuery]);
  const paginatedRecords = useMemo(
    () =>
      filteredHoneyRecordsForTable.slice(
        currentPage * ITEMS_PER_PAGE,
        (currentPage + 1) * ITEMS_PER_PAGE
      ),
    [filteredHoneyRecordsForTable, currentPage]
  );
  const totalPages = Math.ceil(
    filteredHoneyRecordsForTable.length / ITEMS_PER_PAGE
  );

  const renderContent = () => {
    switch (activeView) {
      case "form":
        return (
          <View style={styles.formContainer}>
            <TouchableRipple onPress={() => openDatePicker("form")}>
              <TextInput
                mode="outlined"
                label="Harvest Date"
                value={formData.harvest_date}
                editable={false}
                right={<TextInput.Icon icon="calendar" />}
              />
            </TouchableRipple>
            <View style={styles.row}>
              <TextInput
                style={styles.halfWidth}
                mode="outlined"
                label="Honey Weight (kg)"
                value={formData.honey_weight}
                onChangeText={(val) => handleFormChange("honey_weight", val)}
                placeholder="e.g., 15.5"
                keyboardType="numeric"
              />
              <TextInput
                style={styles.halfWidth}
                mode="outlined"
                label="Frames Harvested"
                value={formData.frames_harvested}
                onChangeText={(val) =>
                  handleFormChange("frames_harvested", val)
                }
                placeholder="e.g., 8"
                keyboardType="numeric"
              />
            </View>
            <TextInput
              mode="outlined"
              label="Honey Type"
              value={formData.honey_type}
              onChangeText={(val) => handleFormChange("honey_type", val)}
              placeholder="e.g., Wildflower"
            />
            <TextInput
              mode="outlined"
              label="Notes (Optional)"
              value={formData.harvest_notes}
              onChangeText={(val) => handleFormChange("harvest_notes", val)}
              placeholder="Add any relevant notes..."
              multiline
              numberOfLines={3}
            />
          </View>
        );
      case "table":
        return (
          <View>
            <Searchbar
              placeholder="Search harvests..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchbar}
            />
            <DataTable>
              <DataTable.Header>
                <DataTable.Title>Weight (kg)</DataTable.Title>
                <DataTable.Title>Type</DataTable.Title>
                <DataTable.Title numeric>Date</DataTable.Title>
              </DataTable.Header>
              {paginatedRecords.map((record) => (
                <DataTable.Row
                  key={record.harvest_id}
                  onPress={() => handleRowClick(record)}
                >
                  <DataTable.Cell>
                    {record.honey_weight.toFixed(2)}
                  </DataTable.Cell>
                  <DataTable.Cell>{record.honey_type || "N/A"}</DataTable.Cell>
                  <DataTable.Cell numeric>
                    {format(record.harvest_date, "PP")}
                  </DataTable.Cell>
                </DataTable.Row>
              ))}
              <DataTable.Pagination
                page={currentPage}
                numberOfPages={totalPages}
                onPageChange={(page) => setCurrentPage(page)}
                label={`${currentPage + 1} of ${totalPages}`}
              />
            </DataTable>
          </View>
        );
      default:
        return (
          <View>
            <View style={styles.row}>
              <TouchableRipple
                onPress={() => openDatePicker("start")}
                style={styles.halfWidth}
              >
                <TextInput
                  mode="outlined"
                  label="Start Date"
                  value={startDate ? format(startDate, "PP") : ""}
                  editable={false}
                  right={<TextInput.Icon icon="calendar" />}
                />
              </TouchableRipple>
              <TouchableRipple
                onPress={() => openDatePicker("end")}
                style={styles.halfWidth}
              >
                <TextInput
                  mode="outlined"
                  label="End Date"
                  value={endDate ? format(endDate, "PP") : ""}
                  editable={false}
                  right={<TextInput.Icon icon="calendar" />}
                />
              </TouchableRipple>
            </View>
            {!isCustomDateRangeActive && (
              <PaperFormDropdown
                label="Time Range"
                items={TIME_RANGE_OPTIONS}
                selectedValue={selectedTimeRange}
                onSelect={(item: string) =>
                  setSelectedTimeRange(item as TimeRange)
                }
              />
            )}
            <View style={styles.chartWrapper}>
              {isLoading ? (
                <ActivityIndicator size="large" />
              ) : chartData ? (
                <BarChart
                  data={chartData}
                  width={Dimensions.get("window").width - 64}
                  height={256}
                  yAxisLabel=""
                  yAxisSuffix=" kg"
                  chartConfig={chartConfig}
                  verticalLabelRotation={30}
                  fromZero
                />
              ) : (
                <Text>No data for this period.</Text>
              )}
            </View>
          </View>
        );
    }
  };

  return (
    <Card>
      <Card.Title title="Honey Production" />
      <Card.Content>
        <SegmentedButtons
          value={activeView}
          onValueChange={(value) => setActiveView(value as any)}
          buttons={[
            { value: "chart", label: "Chart" },
            { value: "table", label: "Logs" },
            { value: "form", label: editingRecord ? "Edit" : "Log" },
          ]}
          style={styles.segmentedButtons}
        />
        {renderContent()}
      </Card.Content>
      {activeView === "form" && (
        <>
          <Divider />
          <Card.Actions>
            <Button onPress={() => setActiveView("table")}>Cancel</Button>
            <Button
              mode="contained"
              onPress={handleFormSubmit}
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              {editingRecord ? "Update Harvest" : "Log Harvest"}
            </Button>
          </Card.Actions>
        </>
      )}
      <Portal>
        <Modal
          visible={isDatePickerVisible}
          onDismiss={() => setDatePickerVisible(false)}
        >
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Calendar
              onDayPress={handleDayPress}
              markedDates={markedDates}
              theme={{
                backgroundColor: theme.colors.surface,
                calendarBackground: theme.colors.surface,
                textSectionTitleColor: theme.colors.onSurfaceVariant,
                selectedDayBackgroundColor: theme.colors.primary,
                selectedDayTextColor: theme.colors.onPrimary,
                todayTextColor: theme.colors.primary,
                dayTextColor: theme.colors.onSurface,
                textDisabledColor: theme.colors.onSurfaceDisabled,
                arrowColor: theme.colors.primary,
                monthTextColor: theme.colors.onSurface,
              }}
            />
          </View>
        </Modal>
      </Portal>
    </Card>
  );
};

const styles = StyleSheet.create({
  formContainer: { gap: 16, paddingTop: 16 },
  row: { flexDirection: "row", gap: 16 },
  halfWidth: { flex: 1 },
  searchbar: { marginVertical: 16 },
  chartWrapper: {
    height: 280,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  segmentedButtons: { marginBottom: 16 },
  modalContent: { margin: 20, borderRadius: 16 },
  inputContainer: { flex: 1 },
});

export default HoneyProductionCard;
