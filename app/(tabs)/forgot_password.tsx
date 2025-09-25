import axios from "axios";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  Icon,
  IconButton,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const api = axios.create({
  baseURL: API_URL,
});

const ForgotPasswordScreen = () => {
  const router = useRouter();
  const theme = useTheme();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLinkSent, setIsLinkSent] = useState(false);

  const handleContinue = async () => {
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/password/forgot", { email });
      setIsLinkSent(true);
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        "Failed to send reset link. Please try again.";
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderFormView = () => (
    <View style={styles.container}>
      <IconButton
        icon="arrow-left"
        size={28}
        onPress={() => router.back()}
        style={styles.backButton}
      />

      <View style={styles.formContent}>
        <Text variant="headlineLarge" style={styles.title}>
          Find your profile
        </Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          Enter your email address.
        </Text>

        <TextInput
          mode="outlined"
          label="Email address"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          style={styles.input}
        />
      </View>

      <Button
        mode="contained"
        onPress={handleContinue}
        loading={loading}
        disabled={loading}
        style={styles.button}
        labelStyle={styles.buttonLabel}
      >
        Continue
      </Button>
    </View>
  );

  const renderSuccessView = () => (
    <View style={styles.successContainer}>
      <Icon source="check-circle" size={80} color={theme.colors.primary} />
      <Text variant="headlineMedium" style={styles.successTitle}>
        Check Your Email
      </Text>
      <Text variant="bodyLarge" style={styles.successSubtitle}>
        A reset link has been sent to your email. Please check your inbox to
        reset your password on the web.
      </Text>
      <Button
        mode="contained"
        onPress={() => router.back()}
        style={styles.button}
        labelStyle={styles.buttonLabel}
      >
        Back to Login
      </Button>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
    >
      <StatusBar
        barStyle={theme.dark ? "light-content" : "dark-content"}
        backgroundColor={theme.colors.background}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        {isLinkSent ? renderSuccessView() : renderFormView()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 24,
  },
  formContent: {
    marginTop: 32,
    flex: 1,
  },
  backButton: {
    alignSelf: "flex-start",
    marginLeft: -8, // Offset for visual alignment
  },
  title: {
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 32,
  },
  input: {
    width: "100%",
  },
  button: {
    paddingVertical: 8,
    marginTop: 16,
    borderRadius: 50, // Fully rounded
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: "bold",
  },
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 24,
  },
  successTitle: {
    fontWeight: "bold",
    textAlign: "center",
  },
  successSubtitle: {
    textAlign: "center",
    marginBottom: 16,
  },
});

export default ForgotPasswordScreen;
