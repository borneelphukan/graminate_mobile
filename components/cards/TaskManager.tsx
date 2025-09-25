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
  Button,
  Card,
  Checkbox,
  Chip,
  Icon,
  IconButton,
  Menu,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import axiosInstance from "@/lib/axiosInstance";

type Priority = "High" | "Medium" | "Low";
type TaskStatus = "To Do" | "In Progress" | "Checks" | "Completed";

type Task = {
  task_id: number;
  user_id: number;
  project: string;
  task: string;
  status: TaskStatus;
  priority: Priority;
  created_on: string;
};

type Props = {
  userId: number;
  projectType: string;
};

const PRIORITY_OPTIONS: Priority[] = ["High", "Medium", "Low"];
const TASKS_PER_PAGE = 5;

const TaskManager = ({ userId, projectType }: Props) => {
  const theme = useTheme();
  const [taskList, setTaskList] = useState<Task[]>([]);
  const [newTaskText, setNewTaskText] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>("Medium");
  const [prioritySortAsc, setPrioritySortAsc] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [priorityMenuVisible, setPriorityMenuVisible] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const translateX = useSharedValue(0);

  const sortTasks = useCallback((list: Task[], asc: boolean) => {
    const priorityRank: Record<Priority, number> = {
      High: 1,
      Medium: 2,
      Low: 3,
    };
    const sorted = [...list].sort((a, b) => {
      const rankDiff = asc
        ? priorityRank[a.priority] - priorityRank[b.priority]
        : priorityRank[b.priority] - priorityRank[a.priority];
      if (rankDiff !== 0) return rankDiff;
      return (
        new Date(b.created_on).getTime() - new Date(a.created_on).getTime()
      );
    });
    return [
      ...sorted.filter((t) => t.status !== "Completed"),
      ...sorted.filter((t) => t.status === "Completed"),
    ];
  }, []);

  const fetchTasks = useCallback(async () => {
    if (!userId || !projectType) return;
    try {
      setIsLoading(true);
      setError(null);
      const response = await axiosInstance.get(`/tasks/${userId}`, {
        params: { project: projectType },
      });
      const tasks = Array.isArray(response.data)
        ? response.data
        : response.data.tasks || [];
      setTaskList(sortTasks(tasks, prioritySortAsc));
    } catch (err) {
      setError("Failed to load tasks.");
    } finally {
      setIsLoading(false);
    }
  }, [userId, projectType, prioritySortAsc, sortTasks]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);
  useEffect(() => {
    setCurrentPage(0);
  }, [prioritySortAsc, taskList.length > 0]);

  const { pages, totalPages } = useMemo(() => {
    if (taskList.length === 0) return { pages: [], totalPages: 0 };
    const chunks: Task[][] = [];
    for (let i = 0; i < taskList.length; i += TASKS_PER_PAGE) {
      chunks.push(taskList.slice(i, i + TASKS_PER_PAGE));
    }
    return { pages: chunks, totalPages: chunks.length };
  }, [taskList]);

  useEffect(() => {
    if (containerWidth > 0) {
      translateX.value = withTiming(-currentPage * containerWidth, {
        duration: 250,
      });
    }
  }, [currentPage, containerWidth, translateX]);

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

  const toggleTaskCompletion = async (taskId: number) => {
    const task = taskList.find((t) => t.task_id === taskId);
    if (!task) return;
    const newStatus = task.status === "Completed" ? "To Do" : "Completed";
    try {
      const response = await axiosInstance.put(`/tasks/update/${taskId}`, {
        status: newStatus,
      });
      setTaskList((prev) =>
        sortTasks(
          prev.map((t) => (t.task_id === taskId ? response.data : t)),
          prioritySortAsc
        )
      );
    } catch (err) {
      setError("Failed to update task.");
    }
  };

  const addNewTask = async () => {
    if (!newTaskText.trim()) return;
    try {
      const response = await axiosInstance.post("/tasks/add", {
        user_id: userId,
        project: projectType,
        task: newTaskText.trim(),
        status: "To Do",
        priority: newTaskPriority,
      });
      setTaskList((prev) =>
        sortTasks([...prev, response.data], prioritySortAsc)
      );
      setNewTaskText("");
      setNewTaskPriority("Medium");
    } catch (err) {
      setError("Failed to create task.");
    }
  };

  const deleteTask = async (taskId: number) => {
    try {
      await axiosInstance.delete(`/tasks/delete/${taskId}`);
      setTaskList((prev) => prev.filter((task) => task.task_id !== taskId));
    } catch (err) {
      setError("Failed to delete task.");
    }
  };

  const getPriorityColors = (priority: Priority) => {
    switch (priority) {
      case "High":
        return {
          chip: theme.dark ? "#5c1919" : theme.colors.errorContainer,
          text: theme.dark ? "#ffb4ab" : theme.colors.onErrorContainer,
        };
      case "Medium":
        return {
          chip: theme.dark ? "#5e4803" : "#FFDE8A",
          text: theme.dark ? "#ffde8a" : "#5e4803",
        };
      case "Low":
        return {
          chip: theme.dark ? "#003a21" : "#B3E8C1",
          text: theme.dark ? "#89d89d" : "#003a21",
        };
      default:
        return {
          chip: theme.colors.surfaceVariant,
          text: theme.colors.onSurfaceVariant,
        };
    }
  };

  const goToNextPage = useCallback(() => {
    setCurrentPage((prev) =>
      Math.min(prev + 1, totalPages > 0 ? totalPages - 1 : 0)
    );
  }, [totalPages]);
  const goToPreviousPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(prev - 1, 0));
  }, []);

  const renderTask = ({ item }: { item: Task }) => {
    const priorityColors = getPriorityColors(item.priority);
    const isCompleted = item.status === "Completed";

    return (
      <View style={styles.taskRow}>
        <Checkbox
          status={isCompleted ? "checked" : "unchecked"}
          onPress={() => toggleTaskCompletion(item.task_id)}
        />
        <Text
          style={[
            styles.taskText,
            isCompleted && {
              textDecorationLine: "line-through",
              color: theme.colors.onSurfaceDisabled,
            },
          ]}
        >
          {item.task}
        </Text>
        {!isCompleted && (
          <Chip
            style={{ backgroundColor: priorityColors.chip }}
            textStyle={{ color: priorityColors.text }}
          >
            {item.priority}
          </Chip>
        )}
        {isCompleted && (
          <IconButton
            icon="trash-can-outline"
            iconColor={theme.colors.error}
            size={20}
            onPress={() => deleteTask(item.task_id)}
          />
        )}
      </View>
    );
  };

  return (
    <Card style={styles.container}>
      <Card.Content style={styles.content}>
        <View style={styles.header}>
          <Text variant="titleLarge">{projectType} Task List</Text>
          <TouchableRipple onPress={() => setPrioritySortAsc(!prioritySortAsc)}>
            <View style={styles.sortButton}>
              <Text variant="labelMedium">Sort</Text>
              <Icon
                source={prioritySortAsc ? "chevron-up" : "chevron-down"}
                size={20}
              />
            </View>
          </TouchableRipple>
        </View>

        <View style={styles.formContainer}>
          <TextInput
            mode="outlined"
            label={`Add new ${projectType.toLowerCase()} task...`}
            value={newTaskText}
            onChangeText={setNewTaskText}
            onSubmitEditing={addNewTask}
            style={styles.textInput}
          />
          <View style={styles.actionsContainer}>
            <Menu
              visible={priorityMenuVisible}
              onDismiss={() => setPriorityMenuVisible(false)}
              anchor={
                <Button
                  mode="outlined"
                  onPress={() => setPriorityMenuVisible(true)}
                  disabled={!newTaskText.trim()}
                  icon="chevron-down"
                  style={styles.priorityButton}
                  contentStyle={styles.priorityButtonContent}
                >
                  {newTaskPriority}
                </Button>
              }
            >
              {PRIORITY_OPTIONS.map((p) => (
                <Menu.Item
                  key={p}
                  title={p}
                  onPress={() => {
                    setNewTaskPriority(p);
                    setPriorityMenuVisible(false);
                  }}
                />
              ))}
            </Menu>
            <Button
              mode="contained"
              onPress={addNewTask}
              disabled={!newTaskText.trim()}
              style={styles.addButton}
            >
              Add
            </Button>
          </View>
        </View>

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
            {isLoading ? (
              <ActivityIndicator />
            ) : error ? (
              <Text style={{ color: theme.colors.error }}>{error}</Text>
            ) : taskList.length === 0 ? (
              <View style={styles.centered}>
                <Icon
                  source="format-list-checks"
                  size={40}
                  color={theme.colors.onSurfaceDisabled}
                />
                <Text style={{ color: theme.colors.onSurfaceDisabled }}>
                  No tasks for {projectType}.
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
                          renderItem={renderTask}
                          keyExtractor={(item) => item.task_id.toString()}
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
  container: { flex: 1 },
  content: { padding: 8, flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    gap: 4,
  },
  formContainer: { marginBottom: 16 },
  textInput: { marginBottom: 8 },
  actionsContainer: { flexDirection: "row", gap: 8 },
  priorityButton: { flex: 1, justifyContent: "center" },
  priorityButtonContent: { flexDirection: "row-reverse" },
  addButton: { flexShrink: 1 },
  listSection: { flexDirection: "row", alignItems: "center", flex: 1 },
  listContainer: {
    flex: 1,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  centered: { justifyContent: "center", alignItems: "center", gap: 8 },
  listGestureView: { flex: 1, overflow: "hidden" },
  animatedList: { flexDirection: "row", height: "100%" },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    gap: 8,
  },
  taskText: { flex: 1, marginHorizontal: 4, fontSize: 14 },
});

export default TaskManager;
