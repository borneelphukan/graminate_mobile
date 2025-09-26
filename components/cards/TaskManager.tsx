import axiosInstance from "@/lib/axiosInstance";
import {
  faChevronDown,
  faChevronUp,
  faListCheck,
  faPlus,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import React, { useCallback, useEffect, useState } from "react";
import { Keyboard, ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Checkbox,
  Menu,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from "react-native-paper";

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

const TaskManager = ({ userId, projectType }: Props) => {
  const theme = useTheme();
  const [taskList, setTaskList] = useState<Task[]>([]);
  const [newTaskText, setNewTaskText] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>("Medium");
  const [prioritySortAsc, setPrioritySortAsc] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPriority, setEditingPriority] = useState<number | null>(null);
  const [priorityMenuVisible, setPriorityMenuVisible] = useState(false);

  const capitalizedProjectType =
    projectType.charAt(0).toUpperCase() + projectType.slice(1);

  const sortTasks = useCallback((list: Task[], asc: boolean) => {
    const priorityRankLocal: Record<Priority, number> = {
      High: 1,
      Medium: 2,
      Low: 3,
    };

    const sorted = [...list].sort((a, b) => {
      const aRank = priorityRankLocal[a.priority];
      const bRank = priorityRankLocal[b.priority];
      return asc ? aRank - bRank : bRank - aRank;
    });

    return [
      ...sorted.filter((t) => t.status !== "Completed"),
      ...sorted.filter((t) => t.status === "Completed"),
    ];
  }, []);

  useEffect(() => {
    const fetchTasks = async () => {
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
        setError("Failed to load tasks. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTasks();
  }, [userId, projectType, prioritySortAsc, sortTasks]);

  const handlePriorityChange = async (
    taskId: number,
    newPriority: Priority
  ) => {
    try {
      const response = await axiosInstance.put(`/tasks/update/${taskId}`, {
        priority: newPriority,
      });
      setTaskList((prev) =>
        sortTasks(
          prev.map((t) => (t.task_id === taskId ? response.data : t)),
          prioritySortAsc
        )
      );
      setEditingPriority(null);
    } catch (err) {
      setError("Failed to update task priority. Please try again.");
    }
  };

  const toggleTaskCompletion = async (taskId: number) => {
    const task = taskList.find((t) => t.task_id === taskId);
    if (!task) return;
    try {
      const newStatus = task.status === "Completed" ? "To Do" : "Completed";
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
      setError("Failed to update task status. Please try again.");
    }
  };

  const addNewTask = async () => {
    if (!newTaskText.trim() || !userId || !projectType) return;
    Keyboard.dismiss();
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
      setError(null);
    } catch (err) {
      setError("Failed to create new task. Please try again.");
    }
  };

  const deleteTask = async (taskId: number) => {
    try {
      await axiosInstance.delete(`/tasks/delete/${taskId}`);
      setTaskList((prev) => prev.filter((task) => task.task_id !== taskId));
      setError(null);
    } catch (err) {
      setError("Failed to delete task. Please try again.");
    }
  };

  const getPriorityButtonStyles = (priority: Priority) => {
    switch (priority) {
      case "High":
        return {
          backgroundColor: theme.dark ? "#5c1919" : "#fecaca",
          textColor: theme.dark ? "#ffb4ab" : "#991b1b",
        };
      case "Medium":
        return {
          backgroundColor: theme.dark ? "#5e4803" : "#fef08a",
          textColor: theme.dark ? "#ffde8a" : "#854d0e",
        };
      case "Low":
        return {
          backgroundColor: theme.dark ? "#003a21" : "#bbf7d0",
          textColor: theme.dark ? "#89d89d" : "#166534",
        };
    }
  };

  const renderContent = () => {
    if (isLoading) {
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

    if (taskList.length === 0) {
      return (
        <View style={styles.centeredContainer}>
          <FontAwesomeIcon
            icon={faListCheck}
            size={48}
            color={theme.colors.onSurfaceDisabled}
          />
          <Text
            style={[
              styles.emptyText,
              { color: theme.colors.onSurfaceDisabled },
            ]}
          >
            No tasks for {capitalizedProjectType}.
          </Text>
          <Text
            style={[
              styles.emptySubText,
              { color: theme.colors.onSurfaceDisabled },
            ]}
          >
            Add a task above to get started.
          </Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.taskList} showsVerticalScrollIndicator={false}>
        {taskList.map((task) => {
          const isCompleted = task.status === "Completed";
          const priorityStyles = getPriorityButtonStyles(task.priority);
          return (
            <View key={task.task_id} style={styles.taskItem}>
              <Checkbox.Android
                status={isCompleted ? "checked" : "unchecked"}
                onPress={() => toggleTaskCompletion(task.task_id)}
                color={theme.colors.primary}
              />
              <Text
                style={[
                  styles.taskText,
                  { color: theme.colors.onSurface },
                  isCompleted && {
                    textDecorationLine: "line-through",
                    color: theme.colors.onSurfaceDisabled,
                  },
                ]}
                numberOfLines={1}
              >
                {task.task}
              </Text>

              {isCompleted ? (
                <Button
                  mode="contained"
                  onPress={() => deleteTask(task.task_id)}
                  style={[
                    styles.taskButton,
                    {
                      backgroundColor:
                        getPriorityButtonStyles("High").backgroundColor,
                    },
                  ]}
                  labelStyle={[
                    styles.taskButtonLabel,
                    { color: getPriorityButtonStyles("High").textColor },
                  ]}
                  compact
                >
                  Delete
                </Button>
              ) : editingPriority === task.task_id ? (
                <View style={styles.editingContainer}>
                  {PRIORITY_OPTIONS.map((p) => {
                    // FIX IS HERE: Renamed 'styles' to 'priorityBtnStyles' to avoid conflict
                    const priorityBtnStyles = getPriorityButtonStyles(p);
                    return (
                      <Button
                        key={p}
                        onPress={() => handlePriorityChange(task.task_id, p)}
                        style={[
                          styles.taskButton,
                          {
                            backgroundColor: priorityBtnStyles.backgroundColor,
                          },
                        ]}
                        labelStyle={[
                          styles.taskButtonLabel,
                          { color: priorityBtnStyles.textColor },
                        ]}
                        compact
                      >
                        {p}
                      </Button>
                    );
                  })}
                  <TouchableRipple
                    onPress={() => setEditingPriority(null)}
                    style={styles.cancelButton}
                  >
                    <FontAwesomeIcon
                      icon={faXmark}
                      size={12}
                      color={theme.colors.onSurface}
                    />
                  </TouchableRipple>
                </View>
              ) : (
                <Button
                  mode="contained"
                  onPress={() => setEditingPriority(task.task_id)}
                  style={[
                    styles.taskButton,
                    { backgroundColor: priorityStyles.backgroundColor },
                  ]}
                  labelStyle={[
                    styles.taskButtonLabel,
                    { color: priorityStyles.textColor },
                  ]}
                  compact
                >
                  {task.priority}
                </Button>
              )}
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
          {capitalizedProjectType} Task List
        </Text>
        <TouchableRipple
          onPress={() => {
            const newAsc = !prioritySortAsc;
            setPrioritySortAsc(newAsc);
            setTaskList((prev) => sortTasks(prev, newAsc));
          }}
          style={styles.sortButton}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text
              style={[styles.sortButtonText, { color: theme.colors.onSurface }]}
            >
              Priority
            </Text>
            <FontAwesomeIcon
              icon={prioritySortAsc ? faChevronUp : faChevronDown}
              size={12}
              color={theme.colors.onSurface}
            />
          </View>
        </TouchableRipple>
      </View>

      <View style={styles.formContainer}>
        <TextInput
          mode="outlined"
          placeholder={`Add new ${projectType.toLowerCase()} task`}
          value={newTaskText}
          onChangeText={setNewTaskText}
          onSubmitEditing={addNewTask}
          style={styles.textInput}
        />
      </View>

      <View style={styles.formContainer}>
        <Menu
          visible={priorityMenuVisible}
          onDismiss={() => setPriorityMenuVisible(false)}
          anchor={
            <Button
              mode="outlined"
              onPress={() => setPriorityMenuVisible(true)}
              disabled={!newTaskText.trim()}
              style={styles.priorityButton}
            >
              {newTaskPriority}
            </Button>
          }
        >
          {PRIORITY_OPTIONS.map((p) => (
            <Menu.Item
              key={p}
              onPress={() => {
                setNewTaskPriority(p);
                setPriorityMenuVisible(false);
              }}
              title={p}
            />
          ))}
        </Menu>
        <Button
          mode="contained"
          onPress={addNewTask}
          disabled={!newTaskText.trim()}
          style={styles.addButton}
          icon={() => (
            <FontAwesomeIcon
              icon={faPlus}
              size={16}
              color={
                !newTaskText.trim()
                  ? theme.colors.onSurfaceDisabled
                  : theme.colors.onPrimary
              }
            />
          )}
        >
          <Text
            style={{
              color: !newTaskText.trim()
                ? theme.colors.onSurfaceDisabled
                : theme.colors.onPrimary,
            }}
          >
            Task
          </Text>
        </Button>
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
  formContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  textInput: {
    flex: 1,
    height: 40,
  },
  priorityButton: {
    justifyContent: "center",
    height: 40,
  },
  addButton: {
    justifyContent: "center",
    height: 40,
  },
  listContainer: {
    flex: 1,
    overflow: "hidden",
  },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    marginTop: 12,
  },
  emptySubText: {
    marginTop: 4,
    fontSize: 12,
  },
  taskList: {
    flex: 1,
  },
  taskItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 2,
    borderRadius: 4,
  },
  taskText: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
    fontSize: 14,
  },
  taskButton: {
    marginLeft: 8,
    minWidth: 70,
    height: 24,
    justifyContent: "center",
  },
  taskButtonLabel: {
    fontSize: 12,
    marginVertical: 0,
    marginHorizontal: 8,
  },
  editingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cancelButton: {
    width: 24,
    height: 24,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(128, 128, 128, 0.3)",
    marginLeft: 4,
  },
});

export default TaskManager;
