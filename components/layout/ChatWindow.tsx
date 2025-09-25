import {
  faPaperPlane,
  faRobot,
  faTimesCircle,
  faTrashAlt,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import React, { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import MarkdownDisplay from "react-native-markdown-display";
import {
  ActivityIndicator,
  Appbar,
  Button,
  IconButton,
  Surface,
  TextInput,
  useTheme,
} from "react-native-paper";

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const axiosInstance = axios.create({ baseURL: API_URL });

axiosInstance.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

type Message = {
  sender: "user" | "bot";
  text: string;
};

type ChatWindowProps = {
  userId: string;
  onClose: () => void;
};

const ChatWindow = ({ userId, onClose }: ChatWindowProps) => {
  const theme = useTheme();
  const [input, setInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    const loadMessages = async () => {
      const stored = await AsyncStorage.getItem(`chatMessages_${userId}`);
      if (stored) {
        setMessages(JSON.parse(stored));
      }
    };
    loadMessages();
  }, [userId]);

  useEffect(() => {
    if (messages.length > 0) {
      AsyncStorage.setItem(`chatMessages_${userId}`, JSON.stringify(messages));
    }
  }, [messages, userId]);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMessage: Message = { sender: "user", text: input };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      const token = await AsyncStorage.getItem("accessToken");
      if (!token) throw new Error("Authentication token not found.");

      const response = await axiosInstance.post(`/llm`, {
        history: updatedMessages,
        userId: userId,
        token: token,
      });

      const botMessage: Message = { sender: "bot", text: response.data.answer };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Error communicating with the chat API:", error);
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "Error: Could not get a response. Please try again later.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = async () => {
    await AsyncStorage.removeItem(`chatMessages_${userId}`);
    setMessages([]);
  };

  const markdownStyle = (sender: "user" | "bot") =>
    StyleSheet.create({
      body: {
        color:
          sender === "user" ? theme.colors.onPrimary : theme.colors.onSurface,
        fontSize: 16,
      },
    });

  const styles = StyleSheet.create({
    flex: { flex: 1 },
    overlay: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0,0,0,0.5)",
    },
    keyboardAvoidingView: { maxHeight: "85%" },
    chatContainer: {
      flex: 1,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      overflow: "hidden",
    },
    header: {
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      backgroundColor: theme.colors.elevation.level3,
    },
    headerTitle: { fontWeight: "bold" },
    scrollView: { flex: 1, paddingHorizontal: 16 },
    scrollContent: { paddingBottom: 16, paddingTop: 8 },
    messageRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginVertical: 8,
      maxWidth: "90%",
    },
    userRow: { alignSelf: "flex-end" },
    botRow: { alignSelf: "flex-start" },
    avatarContainer: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      marginHorizontal: 8,
      backgroundColor: theme.colors.surfaceVariant,
    },
    messageBubble: { padding: 12, borderRadius: 16, flexShrink: 1 },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      padding: 8,
      paddingTop: 12,
    },
    textInput: { flex: 1 },
    textInputOutline: { borderRadius: 24 },
    sendButton: { marginLeft: 8 },
  });

  return (
    <Pressable onPress={onClose} style={styles.overlay}>
      <Pressable style={styles.flex}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidingView}
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
          <Surface
            style={[
              styles.chatContainer,
              { backgroundColor: theme.colors.elevation.level1 },
            ]}
            elevation={4}
          >
            <Appbar.Header elevated style={styles.header}>
              <Appbar.Content
                title="Graminate AI"
                titleStyle={styles.headerTitle}
              />
              <Button
                mode="text"
                onPress={handleClearChat}
                textColor={theme.colors.error}
                icon={() => (
                  <FontAwesomeIcon
                    icon={faTrashAlt}
                    size={18}
                    color={theme.colors.error}
                  />
                )}
              >
                Clear
              </Button>
              <Appbar.Action
                icon={() => (
                  <FontAwesomeIcon
                    icon={faTimesCircle}
                    size={24}
                    color={theme.colors.onSurfaceVariant}
                  />
                )}
                onPress={onClose}
              />
            </Appbar.Header>

            <ScrollView
              ref={scrollViewRef}
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
            >
              {messages.map((msg, index) => (
                <View
                  key={index}
                  style={[
                    styles.messageRow,
                    msg.sender === "user" ? styles.userRow : styles.botRow,
                  ]}
                >
                  {msg.sender === "bot" && (
                    <View style={styles.avatarContainer}>
                      <FontAwesomeIcon
                        icon={faRobot}
                        size={18}
                        color={theme.colors.onSurfaceVariant}
                      />
                    </View>
                  )}
                  <Surface
                    style={[
                      styles.messageBubble,
                      msg.sender === "user"
                        ? { backgroundColor: theme.colors.primary }
                        : { backgroundColor: theme.colors.elevation.level3 },
                    ]}
                    elevation={1}
                  >
                    <MarkdownDisplay style={markdownStyle(msg.sender)}>
                      {msg.text}
                    </MarkdownDisplay>
                  </Surface>
                  {msg.sender === "user" && (
                    <View style={styles.avatarContainer}>
                      <FontAwesomeIcon
                        icon={faUser}
                        size={18}
                        color={theme.colors.onSurfaceVariant}
                      />
                    </View>
                  )}
                </View>
              ))}
              {isLoading && (
                <View style={[styles.messageRow, styles.botRow]}>
                  <View style={styles.avatarContainer}>
                    <FontAwesomeIcon
                      icon={faRobot}
                      size={18}
                      color={theme.colors.onSurfaceVariant}
                    />
                  </View>
                  <Surface
                    style={[
                      styles.messageBubble,
                      { backgroundColor: theme.colors.elevation.level3 },
                    ]}
                    elevation={1}
                  >
                    <ActivityIndicator />
                  </Surface>
                </View>
              )}
            </ScrollView>

            <Surface
              style={[
                styles.inputContainer,
                { backgroundColor: theme.colors.elevation.level2 },
              ]}
              elevation={2}
            >
              <TextInput
                style={styles.textInput}
                mode="outlined"
                placeholder="Ask Graminate AI..."
                value={input}
                onChangeText={setInput}
                onSubmitEditing={handleSend}
                editable={!isLoading}
                multiline
                outlineStyle={styles.textInputOutline}
              />
              <IconButton
                icon={() => (
                  <FontAwesomeIcon
                    icon={faPaperPlane}
                    size={20}
                    color={
                      isLoading || input.trim() === ""
                        ? theme.colors.onSurfaceDisabled
                        : theme.colors.onPrimaryContainer
                    }
                  />
                )}
                mode="contained"
                size={24}
                onPress={handleSend}
                disabled={isLoading || input.trim() === ""}
                style={styles.sendButton}
              />
            </Surface>
          </Surface>
        </KeyboardAvoidingView>
      </Pressable>
    </Pressable>
  );
};

export default ChatWindow;
