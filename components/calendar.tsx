import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import {
  View,
  StyleSheet,
  Pressable,
  FlatList,
  ScrollView,
} from "react-native";
import {
  Appbar,
  Text,
  IconButton,
  Button,
  TextInput,
  useTheme,
  ActivityIndicator,
  Checkbox,
  Chip,
  SegmentedButtons,
  Divider,
} from "react-native-paper";
import axiosInstance from "@/lib/axiosInstance";

export type RawBackendTask = {
  task_id: number;
  user_id: number;
  project: string;
  task: string;
  status: string;
  description?: string;
  priority: "Low" | "Medium" | "High";
  deadline?: string;
  created_on: string;
};

export type DisplayTask = RawBackendTask & {
  name: string;
  time: string;
};

export type TasksPresence = {
  [key: string]: boolean;
};

type CalendarHeaderProps = {
  calendarMonth: number;
  calendarYear: number;
  previousMonth: () => void;
  nextMonth: () => void;
};

const CalendarHeader = ({
  calendarMonth,
  calendarYear,
  previousMonth,
  nextMonth,
}: CalendarHeaderProps) => {
  const theme = useTheme();
  return (
    <View style={styles.headerContainer}>
      <IconButton icon="chevron-left" onPress={previousMonth} />
      <Text variant="titleLarge" style={{ color: theme.colors.onSurface }}>
        {`${new Date(calendarYear, calendarMonth).toLocaleString("default", {
          month: "long",
        })} ${calendarYear}`}
      </Text>
      <IconButton icon="chevron-right" onPress={nextMonth} />
    </View>
  );
};

type CalendarGridProps = {
  calendarDays: (number | null)[];
  dayAbbreviations: string[];
  getDayStyles: (day: number | null) => any;
  calendarMonth: number;
  calendarYear: number;
  handleDateChange: (date: Date) => void;
  tasksPresence: TasksPresence;
  getDateKey: (date: Date) => string;
};

const CalendarGrid = ({
  calendarDays,
  dayAbbreviations,
  getDayStyles,
  calendarMonth,
  calendarYear,
  handleDateChange,
  tasksPresence,
  getDateKey,
}: CalendarGridProps) => {
  const theme = useTheme();
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  return (
    <View>
      <View style={styles.dayAbbrContainer}>
        {dayAbbreviations.map((dayAbbr) => (
          <Text
            key={dayAbbr}
            style={[styles.dayAbbrText, { color: theme.colors.onSurface }]}
          >
            {dayAbbr}
          </Text>
        ))}
      </View>
      <View style={styles.daysGridContainer}>
        {calendarDays.map((day, index) => {
          const date = day ? new Date(calendarYear, calendarMonth, day) : null;
          const dateKey = date ? getDateKey(date) : null;
          const hasTasks = day && dateKey && tasksPresence[dateKey];
          const { containerStyle, textStyle } = getDayStyles(day);

          let isPast = false;
          if (date) {
            const checkDate = new Date(date);
            checkDate.setHours(0, 0, 0, 0);
            isPast = checkDate < today;
          }

          return (
            <Pressable
              key={index}
              style={styles.dayCell}
              onPress={() => day && handleDateChange(date!)}
              disabled={!day || isPast}
            >
              <View style={[styles.dayContainer, containerStyle]}>
                <Text style={textStyle}>{day}</Text>
              </View>
              {hasTasks && (
                <View
                  style={[
                    styles.taskIndicator,
                    { backgroundColor: theme.colors.primary },
                  ]}
                />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

type TaskListViewProps = {
  selectedDate: Date;
  tasks: DisplayTask[];
  removeTask: (taskId: number) => void;
  updateTaskStatus: (taskId: number, newStatus: string) => void;
  setShowTasks: (value: boolean) => void;
  setShowAddTask: (value: boolean) => void;
  getDayStatus: (date: Date) => string;
  isLoading: boolean;
};

const TaskListView = ({
  selectedDate,
  tasks,
  removeTask,
  updateTaskStatus,
  setShowTasks,
  setShowAddTask,
  getDayStatus,
  isLoading,
}: TaskListViewProps) => {
  const theme = useTheme();
  const getPriorityChipStyle = (priority: "Low" | "Medium" | "High") => {
    switch (priority) {
      case "High":
        return { backgroundColor: theme.colors.errorContainer };
      case "Medium":
        return { backgroundColor: "#FFDDAA" };
      case "Low":
        return { backgroundColor: theme.colors.primaryContainer };
      default:
        return {};
    }
  };

  const renderTask = ({ item }: { item: DisplayTask }) => (
    <View style={styles.taskItemContainer}>
      <Checkbox
        status={item.status === "Completed" ? "checked" : "unchecked"}
        onPress={() =>
          updateTaskStatus(
            item.task_id,
            item.status === "Completed" ? "To Do" : "Completed"
          )
        }
      />
      <View style={styles.taskTextContainer}>
        <Text
          variant="bodyMedium"
          style={{
            textDecorationLine:
              item.status === "Completed" ? "line-through" : "none",
            color:
              item.status === "Completed"
                ? theme.colors.onSurfaceDisabled
                : theme.colors.onSurface,
          }}
          numberOfLines={1}
        >
          {item.name}
        </Text>
      </View>
      {item.status === "Completed" ? (
        <Button
          mode="contained-tonal"
          onPress={() => removeTask(item.task_id)}
          textColor={theme.colors.error}
          compact
        >
          Delete
        </Button>
      ) : (
        <Chip style={getPriorityChipStyle(item.priority)}>{item.priority}</Chip>
      )}
    </View>
  );

  return (
    <View style={styles.flexContainer}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.Action icon="arrow-left" onPress={() => setShowTasks(false)} />
        <Appbar.Content title={getDayStatus(selectedDate)} />
        <Appbar.Action icon="plus" onPress={() => setShowAddTask(true)} />
      </Appbar.Header>
      {isLoading ? (
        <ActivityIndicator animating={true} style={styles.centeredLoader} />
      ) : tasks.length === 0 ? (
        <View style={styles.centeredMessage}>
          <Text>No tasks scheduled for this day.</Text>
        </View>
      ) : (
        <FlatList
          data={tasks}
          renderItem={renderTask}
          keyExtractor={(item) => item.task_id.toString()}
          contentContainerStyle={styles.taskList}
        />
      )}
    </View>
  );
};

type AddTaskViewProps = {
  selectedDate: Date;
  setShowAddTask: (value: boolean) => void;
  projectInput: string;
  handleProjectInputChange: (value: string) => void;
  suggestions: string[];
  showSuggestions: boolean;
  isLoadingSuggestions: boolean;
  selectSuggestion: (suggestion: string) => void;
  setShowSuggestions: (value: boolean) => void;
  userId: number;
  projectName: string;
  refreshTasks: () => void;
};

const AddTaskView = ({
  selectedDate,
  setShowAddTask,
  projectInput,
  handleProjectInputChange,
  suggestions,
  showSuggestions,
  isLoadingSuggestions,
  selectSuggestion,
  setShowSuggestions,
  userId,
  projectName,
  refreshTasks,
}: AddTaskViewProps) => {
  const theme = useTheme();
  const [newTask, setNewTask] = useState("");
  const [isTaskNameValid, setIsTaskNameValid] = useState(true);
  const [priority, setPriority] = useState<"Low" | "Medium" | "High">("Medium");
  const [isLoading, setIsLoading] = useState(false);

  const handleAddTask = async () => {
    if (!newTask.trim()) {
      setIsTaskNameValid(false);
      return;
    }
    setIsTaskNameValid(true);

    try {
      setIsLoading(true);
      const year = selectedDate.getFullYear();
      const month = (selectedDate.getMonth() + 1).toString().padStart(2, "0");
      const day = selectedDate.getDate().toString().padStart(2, "0");
      const deadlineDateString = `${year}-${month}-${day}`;

      const taskData = {
        user_id: userId,
        project: projectName || projectInput,
        task: newTask.trim(),
        status: "To Do",
        priority,
        deadline: deadlineDateString,
      };

      await axiosInstance.post("/tasks/add", taskData);
      refreshTasks();
    } catch (error: unknown) {
      console.error("Error creating task:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.flexContainer}
      contentContainerStyle={styles.addTaskContainer}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.addTaskHeader}>
        <Text variant="headlineSmall">Add Task</Text>
        <Text variant="bodyMedium">
          {selectedDate.toLocaleDateString(undefined, {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <View>
          <TextInput
            label="Category"
            placeholder="Enter or select task category"
            value={projectInput}
            onChangeText={handleProjectInputChange}
            onFocus={() => setShowSuggestions(true)}
            mode="outlined"
          />
          {showSuggestions && (
            <View
              style={[
                styles.suggestionsContainer,
                { backgroundColor: theme.colors.surfaceVariant },
              ]}
            >
              {isLoadingSuggestions ? (
                <ActivityIndicator />
              ) : (
                <FlatList
                  data={suggestions}
                  keyExtractor={(item, index) => `${item}-${index}`}
                  renderItem={({ item }) => (
                    <Pressable onPress={() => selectSuggestion(item)}>
                      <Text style={styles.suggestionItem}>{item}</Text>
                    </Pressable>
                  )}
                  ListEmptyComponent={
                    <Text style={styles.suggestionItem}>No suggestions</Text>
                  }
                />
              )}
            </View>
          )}
        </View>

        <TextInput
          label="Task Name"
          placeholder="Enter task name..."
          value={newTask}
          onChangeText={(val) => {
            setNewTask(val);
            if (val.trim()) setIsTaskNameValid(true);
          }}
          error={!isTaskNameValid && !newTask.trim()}
          mode="outlined"
        />
        {!isTaskNameValid && !newTask.trim() && (
          <Text style={{ color: theme.colors.error }}>
            Task name cannot be empty
          </Text>
        )}

        <View style={styles.priorityContainer}>
          <Text variant="labelLarge" style={styles.priorityLabel}>
            Priority
          </Text>
          <SegmentedButtons
            value={priority}
            onValueChange={(val) =>
              setPriority(val as "Low" | "Medium" | "High")
            }
            buttons={[
              { value: "Low", label: "Low" },
              { value: "Medium", label: "Medium" },
              { value: "High", label: "High" },
            ]}
          />
        </View>
      </View>
      <Divider style={styles.divider} />
      <View style={styles.buttonGroup}>
        <Button
          mode="outlined"
          onPress={() => setShowAddTask(false)}
          style={styles.flexButton}
        >
          Cancel
        </Button>
        <Button
          mode="contained"
          onPress={handleAddTask}
          disabled={!newTask.trim() || !projectInput.trim() || isLoading}
          loading={isLoading}
          style={styles.flexButton}
        >
          Add Task
        </Button>
      </View>
    </ScrollView>
  );
};

const Calendar = ({ route }: any) => {
  const { user_id } = route.params;
  const theme = useTheme();
  const [displayedTasks, setDisplayedTasks] = useState<DisplayTask[]>([]);
  const [tasksForGrid, setTasksForGrid] = useState<TasksPresence>({});
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showTasks, setShowTasks] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [projectInput, setProjectInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [subTypes, setSubTypes] = useState<string[]>([]);
  const [isLoadingSubTypes, setIsLoadingSubTypes] = useState(true);

  const getDateKey = (date: Date): string => date.toISOString().split("T")[0];

  const formatTaskTime = useCallback((deadline?: string): string => {
    if (!deadline) return "No time set";
    const d = new Date(deadline);
    const hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    let displayHours = hours % 12;
    if (displayHours === 0) displayHours = 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  }, []);

  const processRawTasksToDisplayTasks = useCallback(
    (rawTasks: RawBackendTask[]): DisplayTask[] => {
      return rawTasks.map((task) => ({
        ...task,
        name: task.task,
        time: formatTaskTime(task.deadline),
      }));
    },
    [formatTaskTime]
  );

  const fetchTasksForSelectedDate = useCallback(
    async (date: Date, currentUserId: string | string[] | undefined) => {
      if (!currentUserId || Array.isArray(currentUserId)) return;
      setIsLoadingTasks(true);
      const currentSelectedDateKey = getDateKey(date);
      try {
        const response = await axiosInstance.get(
          `/tasks/${currentUserId}?deadlineDate=${currentSelectedDateKey}`
        );
        const fetchedBackendTasks: RawBackendTask[] =
          response.data?.tasks || [];
        const correctlyFilteredTasks = fetchedBackendTasks.filter((task) => {
          if (!task.deadline) return false;
          const taskDeadlineDateKey = task.deadline.split("T")[0];
          return taskDeadlineDateKey === currentSelectedDateKey;
        });
        setDisplayedTasks(
          processRawTasksToDisplayTasks(correctlyFilteredTasks)
        );
      } catch (error) {
        console.error(
          `Error fetching tasks for ${currentSelectedDateKey}:`,
          error
        );
        setDisplayedTasks([]);
      } finally {
        setIsLoadingTasks(false);
      }
    },
    [processRawTasksToDisplayTasks]
  );

  useEffect(() => {
    if (user_id && selectedDate) {
      fetchTasksForSelectedDate(selectedDate, user_id);
    }
  }, [selectedDate, user_id, fetchTasksForSelectedDate]);

  const fetchTasksForGridIndicators = useCallback(
    async (currentUserId: string | string[] | undefined) => {
      if (!currentUserId || Array.isArray(currentUserId)) return;
      try {
        const response = await axiosInstance.get(`/tasks/${currentUserId}`);
        const allFetchedTasks: RawBackendTask[] = response.data?.tasks || [];
        const newTasksForGrid: TasksPresence = {};
        allFetchedTasks.forEach((task) => {
          if (task.deadline) {
            const taskDateKey = task.deadline.split("T")[0];
            newTasksForGrid[taskDateKey] = true;
          }
        });
        setTasksForGrid(newTasksForGrid);
      } catch (error) {
        console.error("Error fetching tasks for grid indicators:", error);
        setTasksForGrid({});
      }
    },
    []
  );

  useEffect(() => {
    const fetchUserSubTypes = async () => {
      setIsLoadingSubTypes(true);
      try {
        if (!user_id || Array.isArray(user_id)) return;
        const response = await axiosInstance.get(`/user/${user_id}`);
        const user = response.data?.data?.user ?? response.data?.user;
        if (!user) throw new Error("User payload missing");
        setSubTypes(Array.isArray(user.sub_type) ? user.sub_type : []);
      } catch (err) {
        console.error("Error fetching user sub_types:", err);
        setSubTypes([]);
      } finally {
        setIsLoadingSubTypes(false);
      }
    };
    if (user_id) {
      fetchUserSubTypes();
      fetchTasksForGridIndicators(user_id);
    }
  }, [user_id, fetchTasksForGridIndicators]);

  const handleProjectInputChange = (value: string) => {
    setProjectInput(value);
    const effectiveSubTypes = isLoadingSubTypes ? [] : subTypes;
    if (value.length > 0) {
      const filtered = effectiveSubTypes.filter((subType) =>
        subType.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions(effectiveSubTypes);
      setShowSuggestions(true);
    }
  };

  const selectSuggestion = (suggestion: string) => {
    setProjectInput(suggestion);
    setShowSuggestions(false);
  };

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    setShowTasks(true);
    setShowAddTask(false);
  };

  const refreshTasksForCurrentView = useCallback(async () => {
    if (user_id) {
      await fetchTasksForSelectedDate(selectedDate, user_id);
      await fetchTasksForGridIndicators(user_id);
    }
  }, [
    user_id,
    selectedDate,
    fetchTasksForSelectedDate,
    fetchTasksForGridIndicators,
  ]);

  const refreshAllTasksAndViews = useCallback(() => {
    refreshTasksForCurrentView();
    setShowAddTask(false);
    setShowTasks(true);
  }, [refreshTasksForCurrentView]);

  const removeTask = async (taskId: number): Promise<void> => {
    try {
      setIsLoadingTasks(true);
      await axiosInstance.delete(`/tasks/delete/${taskId}`);
      await refreshTasksForCurrentView();
    } catch (error: unknown) {
      console.error("Error deleting task:", error);
      await refreshTasksForCurrentView();
    }
  };

  const updateTaskStatus = async (
    taskId: number,
    newStatus: string
  ): Promise<void> => {
    try {
      setIsLoadingTasks(true);
      await axiosInstance.put(`/tasks/update/${taskId}`, { status: newStatus });
      setDisplayedTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.task_id === taskId ? { ...task, status: newStatus } : task
        )
      );
    } catch (error: unknown) {
      console.error("Error updating task status:", error);
    } finally {
      setIsLoadingTasks(false);
    }
  };

  const generateCalendar = (month: number, year: number): (number | null)[] => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return Array(firstDay)
      .fill(null)
      .concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));
  };

  const calendarDays = generateCalendar(calendarMonth, calendarYear);

  const previousMonth = () => {
    setCalendarMonth((prev) => {
      if (prev === 0) {
        setCalendarYear(calendarYear - 1);
        return 11;
      }
      return prev - 1;
    });
    setShowTasks(false);
    setShowAddTask(false);
  };

  const nextMonth = () => {
    setCalendarMonth((prev) => {
      if (prev === 11) {
        setCalendarYear(calendarYear + 1);
        return 0;
      }
      return prev + 1;
    });
    setShowTasks(false);
    setShowAddTask(false);
  };

  const getDayStatus = (date: Date): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    if (checkDate.getTime() === today.getTime()) return "Today";
    if (checkDate.getTime() === tomorrow.getTime()) return "Tomorrow";
    return date.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const dayAbbreviations = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getDayStyles = (day: number | null): any => {
    if (day === null) return { containerStyle: {}, textStyle: {} };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentDay = new Date(calendarYear, calendarMonth, day);
    currentDay.setHours(0, 0, 0, 0);

    const isSelected =
      day === selectedDate.getDate() &&
      calendarMonth === selectedDate.getMonth() &&
      calendarYear === selectedDate.getFullYear();

    const isToday = currentDay.getTime() === today.getTime();
    const isPast = currentDay < today;

    let containerStyle: object = {};
    let textStyle: object = { color: theme.colors.onSurface };

    if (isSelected) {
      containerStyle = { backgroundColor: theme.colors.primary };
      textStyle = { color: theme.colors.onPrimary };
    } else if (isToday) {
      containerStyle = {
        borderColor: theme.colors.primary,
        borderWidth: 1,
      };
    } else if (isPast) {
      textStyle = { color: theme.colors.onSurfaceDisabled };
    }

    return { containerStyle, textStyle };
  };

  return (
    <View
      style={[
        styles.mainContainer,
        { backgroundColor: theme.colors.background },
      ]}
    >
      {showAddTask ? (
        <AddTaskView
          selectedDate={selectedDate}
          setShowAddTask={setShowAddTask}
          projectInput={projectInput}
          handleProjectInputChange={handleProjectInputChange}
          suggestions={suggestions}
          showSuggestions={showSuggestions}
          isLoadingSuggestions={isLoadingSubTypes}
          selectSuggestion={selectSuggestion}
          setShowSuggestions={setShowSuggestions}
          userId={Number(user_id)}
          projectName={projectInput}
          refreshTasks={refreshAllTasksAndViews}
        />
      ) : showTasks ? (
        <TaskListView
          selectedDate={selectedDate}
          tasks={displayedTasks}
          removeTask={removeTask}
          updateTaskStatus={updateTaskStatus}
          setShowTasks={setShowTasks}
          setShowAddTask={setShowAddTask}
          getDayStatus={getDayStatus}
          isLoading={isLoadingTasks}
        />
      ) : (
        <>
          <CalendarHeader
            calendarMonth={calendarMonth}
            calendarYear={calendarYear}
            previousMonth={previousMonth}
            nextMonth={nextMonth}
          />
          <CalendarGrid
            calendarDays={calendarDays}
            dayAbbreviations={dayAbbreviations}
            getDayStyles={getDayStyles}
            calendarMonth={calendarMonth}
            calendarYear={calendarYear}
            handleDateChange={handleDateChange}
            tasksPresence={tasksForGrid}
            getDateKey={getDateKey}
          />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    padding: 10,
  },
  flexContainer: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 8,
    marginBottom: 10,
  },
  dayAbbrContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 5,
  },
  dayAbbrText: {
    width: 40,
    textAlign: "center",
  },
  daysGridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  dayContainer: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 18,
  },
  taskIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    position: "absolute",
    bottom: 4,
  },
  centeredLoader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  centeredMessage: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  taskList: {
    paddingHorizontal: 8,
  },
  taskItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  taskTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  addTaskContainer: {
    padding: 16,
  },
  addTaskHeader: {
    marginBottom: 24,
    alignItems: "center",
  },
  inputGroup: {
    gap: 16,
    marginBottom: 24,
  },
  suggestionsContainer: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    maxHeight: 150,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    zIndex: 10,
  },
  suggestionItem: {
    padding: 12,
  },
  priorityContainer: {
    marginTop: 8,
  },
  priorityLabel: {
    marginBottom: 8,
    textAlign: "center",
  },
  buttonGroup: {
    flexDirection: "row",
    justifyContent: "space-around",
    gap: 10,
  },
  flexButton: {
    flex: 1,
  },
  divider: {
    marginVertical: 16,
  },
});

export default Calendar;
