import PlatformLayout from "@/components/layout/PlatformLayout";
import { useUserPreferences } from "@/contexts/UserPreferencesContext";
import {
  faArrowLeft,
  faBell,
  faBug,
  faChevronRight,
  faCloudSun,
  faCog,
  faCow,
  faEgg,
  faFish,
  faUserCog,
  IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Appbar,
  Card,
  List,
  useTheme,
} from "react-native-paper";

type SettingsItem = {
  label: string;
  type: "navigate";
  routeName?: string;
  icon: IconDefinition;
};
type SettingsSection = { label: string; items: SettingsItem[] };

const SettingsScreen = () => {
  const router = useRouter();
  const { user_id } = useLocalSearchParams<{ user_id: string }>();
  const {
    userType,
    subTypes,
    isSubTypesLoading: isLoading,
    fetchUserSubTypes,
  } = useUserPreferences();
  const theme = useTheme();

  useEffect(() => {
    if (user_id) {
      fetchUserSubTypes(user_id);
    }
  }, [user_id, fetchUserSubTypes]);

  const settingsMenu = useMemo((): SettingsSection[] => {
    const preferenceItems: SettingsItem[] = [
      {
        label: "General",
        type: "navigate",
        routeName: `/platform/${user_id}/settings/general`,
        icon: faCog,
      },
    ];
    if (!isLoading) {
      if (userType === "Producer") {
        preferenceItems.push({
          label: "Weather",
          type: "navigate",
          routeName: `/platform/${user_id}/settings/weather`,
          icon: faCloudSun,
        });
        if (subTypes.includes("Poultry"))
          preferenceItems.push({
            label: "Poultry",
            type: "navigate",
            routeName: `/platform/${user_id}/settings/poultry`,
            icon: faEgg,
          });
        if (subTypes.includes("Fishery"))
          preferenceItems.push({
            label: "Fishery",
            type: "navigate",
            routeName: `/platform/${user_id}/settings/fishery`,
            icon: faFish,
          });
        if (subTypes.includes("Cattle Rearing"))
          preferenceItems.push({
            label: "Cattle Rearing",
            type: "navigate",
            routeName: `/platform/${user_id}/settings/cattle-rearing`,
            icon: faCow,
          });
        if (subTypes.includes("Apiculture"))
          preferenceItems.push({
            label: "Apiculture",
            type: "navigate",
            routeName: `/platform/${user_id}/settings/apiculture`,
            icon: faBug,
          });
      }
    }
    preferenceItems.push({
      label: "Notifications",
      type: "navigate",
      routeName: `/platform/${user_id}/settings/notifications`,
      icon: faBell,
    });
    return [
      { label: "Your Preferences", items: preferenceItems },
      {
        label: "Account",
        items: [
          {
            label: "Account Settings",
            type: "navigate",
            routeName: `/platform/${user_id}/settings/account`,
            icon: faUserCog,
          },
        ],
      },
    ];
  }, [user_id, userType, subTypes, isLoading]);

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
          onPress={() => router.back()}
        />
        <Appbar.Content title="Settings" />
      </Appbar.Header>
      <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
        {isLoading ? (
          <View style={styles.centeredContainer}>
            <ActivityIndicator size="large" />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.container}>
            {settingsMenu.map((section) => (
              <Card key={section.label} style={styles.card}>
                <List.Subheader>{section.label}</List.Subheader>
                {section.items.map((item) => (
                  <List.Item
                    key={item.label}
                    title={item.label}
                    onPress={() =>
                      item.routeName && router.push(item.routeName as any)
                    }
                    left={(props) => (
                      <List.Icon
                        {...props}
                        icon={() => (
                          <FontAwesomeIcon
                            icon={item.icon}
                            size={22}
                            color={props.color}
                          />
                        )}
                      />
                    )}
                    right={(props) => (
                      <List.Icon
                        {...props}
                        icon={() => (
                          <FontAwesomeIcon
                            icon={faChevronRight}
                            size={16}
                            color={props.color}
                          />
                        )}
                      />
                    )}
                  />
                ))}
              </Card>
            ))}
          </ScrollView>
        )}
      </View>
    </PlatformLayout>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: { padding: 16, gap: 24 },
  card: {},
});

export default SettingsScreen;
