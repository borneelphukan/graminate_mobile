import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { Calendar, DateData } from "react-native-calendars";
import {
  Button,
  Divider,
  HelperText,
  Icon,
  IconButton,
  Modal,
  Portal,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from "react-native-paper";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const api = axios.create({
  baseURL: API_URL,
});

const AuthScreen = () => {
  const router = useRouter();
  const theme = useTheme();

  const [isLoginView, setIsLoginView] = useState(true);
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);

  const clearErrors = () => {
    setEmailError("");
    setPasswordError("");
    setGeneralError("");
  };

  const toggleView = () => {
    clearErrors();
    const currentEmail = email;
    setEmail(isLoginView ? "" : currentEmail);
    setPassword("");
    setFirstName("");
    setLastName("");
    setPhoneNumber("");
    setDateOfBirth("");
    setIsLoginView(!isLoginView);
  };

  const handleDayPress = (day: DateData) => {
    setDateOfBirth(day.dateString);
    setDatePickerVisible(false);
  };

  const handleLogin = async () => {
    Keyboard.dismiss();
    clearErrors();
    let isValid = true;

    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setEmailError("Please enter a valid email address.");
      isValid = false;
    }
    if (!password.trim()) {
      setPasswordError("Password is required.");
      isValid = false;
    }
    if (!isValid) return;

    setLoading(true);
    try {
      const response = await api.post("/user/login", { email, password });
      const { access_token, user } = response.data;
      await AsyncStorage.setItem("accessToken", access_token);
      await AsyncStorage.setItem("user", JSON.stringify(user));
      Alert.alert("Success", "Logged in successfully!");
      router.replace(`/(tabs)/platform/${user.user_id}`);
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || "Invalid credentials or server error.";
      setGeneralError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!firstName || !lastName || !email || !phoneNumber || !password) {
      Alert.alert("Error", "Please fill in all required fields.");
      return;
    }
    setLoading(true);
    const payload = {
      first_name: firstName,
      last_name: lastName,
      email,
      phone_number: phoneNumber,
      date_of_birth: dateOfBirth,
      password,
    };
    try {
      const response = await api.post("/user/register", payload);
      if (response.status === 201) {
        Alert.alert("Success", "Registration successful! Please log in.");
        toggleView();
      } else {
        Alert.alert(
          "Registration Failed",
          response.data.data.error || "An unknown error occurred."
        );
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.data?.error ||
        error.response?.data?.message ||
        "An unexpected error occurred.";
      Alert.alert("Registration Failed", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const SocialButton = ({
    title,
    iconUri,
  }: {
    title: string;
    iconUri: string;
  }) => (
    <Button
      mode="outlined"
      icon={() => (
        <Image
          source={{ uri: iconUri }}
          style={styles.socialIcon}
          resizeMode="contain"
        />
      )}
      style={styles.socialButton}
      labelStyle={styles.socialButtonLabel}
      onPress={() =>
        Alert.alert("Social Login", "This feature is coming soon!")
      }
    >
      {title}
    </Button>
  );

  const OrSeparator = () => (
    <View style={styles.separatorContainer}>
      <Divider style={styles.divider} />
      <Text variant="labelMedium" style={styles.separatorText}>
        OR
      </Text>
      <Divider style={styles.divider} />
    </View>
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {!isLoginView && (
        <IconButton
          icon="arrow-left"
          onPress={toggleView}
          style={styles.backButton}
          iconColor={theme.colors.onPrimary}
          size={28}
        />
      )}
      <Image
        source={require("../../assets/images/logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text
        variant="headlineLarge"
        style={[styles.headerTitle, { color: theme.colors.onPrimary }]}
      >
        {isLoginView ? "Welcome" : "Create Account"}
      </Text>
      <Text
        variant="bodyLarge"
        style={[
          styles.headerSubtitle,
          { color: theme.colors.onPrimaryContainer },
        ]}
      >
        {isLoginView ? "Sign in to continue" : "Let's get you started!"}
      </Text>
    </View>
  );

  const renderLoginForm = () => (
    <>
      <SocialButton
        title="Continue with Google"
        iconUri="https://img.icons8.com/color/48/000000/google-logo.png"
      />
      <OrSeparator />
      <TextInput
        mode="outlined"
        label="Email"
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          clearErrors();
        }}
        keyboardType="email-address"
        error={!!emailError}
      />
      <HelperText type="error" visible={!!emailError}>
        {emailError}
      </HelperText>
      <TextInput
        mode="outlined"
        label="Password"
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          clearErrors();
        }}
        secureTextEntry
        error={!!passwordError}
      />
      <HelperText type="error" visible={!!passwordError}>
        {passwordError}
      </HelperText>
      <Button
        mode="text"
        onPress={() => router.push("/forgot_password")}
        style={styles.forgotPasswordButton}
      >
        Forgot Password?
      </Button>
      <HelperText
        type="error"
        visible={!!generalError}
        style={styles.generalError}
      >
        {generalError}
      </HelperText>
      <Button
        mode="contained"
        onPress={handleLogin}
        loading={loading}
        disabled={loading}
        style={styles.mainButton}
        labelStyle={styles.mainButtonLabel}
      >
        Sign In
      </Button>
      <View style={styles.toggleViewContainer}>
        <Text variant="bodyMedium">Don't have an account?</Text>
        <Button mode="text" onPress={toggleView}>
          Sign Up
        </Button>
      </View>
    </>
  );

  const renderRegisterForm = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.formScrollView}
    >
      <View style={styles.inputGroup}>
        <TextInput
          mode="outlined"
          label="First Name"
          value={firstName}
          onChangeText={setFirstName}
        />
        <TextInput
          mode="outlined"
          label="Last Name"
          value={lastName}
          onChangeText={setLastName}
        />
        <TextInput
          mode="outlined"
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />
        <TextInput
          mode="outlined"
          label="Phone Number"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="numeric"
        />
        <TouchableRipple onPress={() => setDatePickerVisible(true)}>
          <TextInput
            mode="outlined"
            label="Date of Birth (Optional)"
            value={dateOfBirth}
            placeholder="YYYY-MM-DD"
            editable={false}
            right={<TextInput.Icon icon="calendar" />}
          />
        </TouchableRipple>
        <TextInput
          mode="outlined"
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </View>
      <Button
        mode="contained"
        onPress={handleRegister}
        loading={loading}
        disabled={loading}
        style={styles.mainButton}
        labelStyle={styles.mainButtonLabel}
      >
        Create Account
      </Button>
      <OrSeparator />
      <SocialButton
        title="Sign up with Google"
        iconUri="https://img.icons8.com/color/48/000000/google-logo.png"
      />
      <View style={styles.toggleViewContainer}>
        <Text variant="bodyMedium">Already have an account?</Text>
        <Button mode="text" onPress={toggleView}>
          Log In
        </Button>
      </View>
    </ScrollView>
  );

  return (
    <>
      <SafeAreaView
        style={[styles.flex, { backgroundColor: theme.colors.primary }]}
      >
        <StatusBar
          barStyle="light-content"
          backgroundColor={theme.colors.primary}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.flex}
        >
          {renderHeader()}
          <View
            style={[
              styles.formContainer,
              { backgroundColor: theme.colors.background },
            ]}
          >
            {isLoginView ? renderLoginForm() : renderRegisterForm()}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <Portal>
        <Modal
          visible={isDatePickerVisible}
          onDismiss={() => setDatePickerVisible(false)}
          contentContainerStyle={[
            styles.modalContent,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Calendar
            onDayPress={handleDayPress}
            markedDates={
              dateOfBirth
                ? { [dateOfBirth]: { selected: true, disableTouchEvent: true } }
                : {}
            }
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
              indicatorColor: theme.colors.primary,
            }}
          />
        </Modal>
      </Portal>
    </>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  backButton: { position: "absolute", top: 16, left: 16, zIndex: 10 },
  logo: { width: 64, height: 64, marginBottom: 16 },
  headerTitle: { fontWeight: "bold" },
  headerSubtitle: { marginTop: 8 },
  formContainer: {
    flex: 1,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    padding: 32,
  },
  socialButton: { borderWidth: 1 },
  socialIcon: { width: 24, height: 24, marginRight: 16 },
  socialButtonLabel: { fontSize: 16 },
  separatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  divider: { flex: 1 },
  separatorText: { marginHorizontal: 16 },
  forgotPasswordButton: { alignSelf: "flex-end", marginTop: -8 },
  generalError: { textAlign: "center", marginBottom: 8 },
  mainButton: { paddingVertical: 8, marginTop: 8, borderRadius: 50 },
  mainButtonLabel: { fontSize: 16, fontWeight: "bold" },
  toggleViewContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: "auto",
    paddingBottom: 8,
  },
  formScrollView: { paddingBottom: 32 },
  inputGroup: { gap: 16, marginBottom: 24 },
  modalContent: { padding: 20, margin: 20, borderRadius: 16 },
});

export default AuthScreen;
