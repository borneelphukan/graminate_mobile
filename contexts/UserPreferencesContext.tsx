import axiosInstance from "@/lib/axiosInstance";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useColorScheme } from "react-native";

export type TimeFormatOption = "12-hour" | "24-hour";
export type TemperatureScaleOption = "Celsius" | "Fahrenheit";
export type SupportedLanguage = "English" | "Hindi" | "Assamese";

type UserPreferencesContextType = {
  timeFormat: TimeFormatOption;
  setTimeFormat: (format: TimeFormatOption) => void;
  temperatureScale: TemperatureScaleOption;
  setTemperatureScale: (scale: TemperatureScaleOption) => void;
  language: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => void;
  darkMode: boolean;
  setDarkMode: (enabled: boolean) => void;
  isFirstLogin: boolean;
  setIsFirstLogin: (isFirst: boolean) => void;
  userType: string | null;
  subTypes: string[];
  isSubTypesLoading: boolean;
  fetchUserSubTypes: (userId: string | number) => Promise<void>;
  setUserSubTypes: (subTypes: string[]) => void;
  widgets: string[];
  setWidgets: (widgets: string[]) => void;
  updateUserWidgets: (
    userId: string | number,
    widgets: string[]
  ) => Promise<void>;
};

const UserPreferencesContext = createContext<
  UserPreferencesContextType | undefined
>(undefined);

export const UserPreferencesProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const systemTheme = useColorScheme();
  const [timeFormat, setTimeFormatState] =
    useState<TimeFormatOption>("24-hour");
  const [temperatureScale, setTemperatureScaleState] =
    useState<TemperatureScaleOption>("Celsius");
  const [language, setLanguageState] = useState<SupportedLanguage>("English");
  const [darkMode, setDarkModeState] = useState<boolean>(
    systemTheme === "dark"
  );
  const [isFirstLogin, setIsFirstLoginState] = useState(true);
  const [userType, setUserType] = useState<string | null>(null);
  const [subTypes, setSubTypesState] = useState<string[]>([]);
  const [widgets, setWidgetsState] = useState<string[]>([]);
  const [isSubTypesLoading, setIsSubTypesLoading] = useState(true);

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const storedTimeFormat = (await AsyncStorage.getItem(
          "timeFormat"
        )) as TimeFormatOption;
        const storedTempScale = (await AsyncStorage.getItem(
          "temperatureScale"
        )) as TemperatureScaleOption;
        const storedLanguage = (await AsyncStorage.getItem(
          "language"
        )) as SupportedLanguage;
        const storedDarkMode = await AsyncStorage.getItem("darkMode");

        if (storedTimeFormat) setTimeFormatState(storedTimeFormat);
        if (storedTempScale) setTemperatureScaleState(storedTempScale);
        if (storedLanguage) setLanguageState(storedLanguage);
        if (storedDarkMode !== null)
          setDarkModeState(storedDarkMode === "true");
      } catch (e) {
        console.error("Failed to load preferences from storage", e);
      }
    };
    loadPreferences();
  }, []);

  const setTimeFormat = useCallback((format: TimeFormatOption) => {
    setTimeFormatState(format);
    AsyncStorage.setItem("timeFormat", format);
  }, []);

  const setTemperatureScale = useCallback((scale: TemperatureScaleOption) => {
    setTemperatureScaleState(scale);
    AsyncStorage.setItem("temperatureScale", scale);
  }, []);

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    setLanguageState(lang);
    AsyncStorage.setItem("language", lang);
  }, []);

  const setDarkMode = useCallback((enabled: boolean) => {
    setDarkModeState(enabled);
    AsyncStorage.setItem("darkMode", String(enabled));
  }, []);

  const setIsFirstLogin = useCallback((isFirst: boolean) => {
    setIsFirstLoginState(isFirst);
  }, []);

  const setUserSubTypes = useCallback((newSubTypes: string[]) => {
    setSubTypesState(newSubTypes);
  }, []);

  const setWidgets = useCallback((newWidgets: string[]) => {
    setWidgetsState(newWidgets);
  }, []);

  const updateUserWidgets = useCallback(
    async (userId: string | number, newWidgets: string[]) => {
      try {
        await axiosInstance.put(`/user/${userId}`, { widgets: newWidgets });
        setWidgets(newWidgets);
      } catch (error) {
        console.error("Failed to update user widgets:", error);
        throw error;
      }
    },
    [setWidgets]
  );

  const fetchUserSubTypes = useCallback(async (userId: string | number) => {
    setIsSubTypesLoading(true);
    try {
      const response = await axiosInstance.get(`/user/${userId}`);
      const user = response.data?.data?.user ?? response.data?.user;
      if (!user) throw new Error("User payload missing");

      setIsFirstLoginState(!user.business_name);
      setUserType(user.type || "Producer");
      setSubTypesState(Array.isArray(user.sub_type) ? user.sub_type : []);
      setWidgetsState(Array.isArray(user.widgets) ? user.widgets : []);
    } catch (err) {
      console.error("Error fetching user sub_types:", err);
      setIsFirstLoginState(true);
      setUserType("Producer");
      setSubTypesState([]);
      setWidgetsState([]);
    } finally {
      setIsSubTypesLoading(false);
    }
  }, []);

  return (
    <UserPreferencesContext.Provider
      value={{
        timeFormat,
        setTimeFormat,
        temperatureScale,
        setTemperatureScale,
        language,
        setLanguage,
        darkMode,
        setDarkMode,
        isFirstLogin,
        setIsFirstLogin,
        userType,
        subTypes,
        isSubTypesLoading,
        fetchUserSubTypes,
        setUserSubTypes,
        widgets,
        setWidgets,
        updateUserWidgets,
      }}
    >
      {children}
    </UserPreferencesContext.Provider>
  );
};

export const useUserPreferences = () => {
  const context = useContext(UserPreferencesContext);
  if (context === undefined) {
    throw new Error(
      "useUserPreferences must be used within a UserPreferencesProvider"
    );
  }
  return context;
};
