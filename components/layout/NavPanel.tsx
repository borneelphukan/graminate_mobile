import React, { useState } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import { Button, IconButton, Menu, Surface } from "react-native-paper";

type NavButton = {
  name: string;
  view: string;
};

type NavPanelProps = {
  buttons: NavButton[];
  activeView: string;
  onNavigate: (view: string) => void;
};

const MOBILE_BREAKPOINT = 768;

const NavPanel = ({ buttons, activeView, onNavigate }: NavPanelProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { width } = Dimensions.get("window");
  const isMobileLayout = width < MOBILE_BREAKPOINT;

  const renderTabBar = () => (
    <Surface style={styles.tabBarContainer} elevation={2}>
      {buttons.map(({ name, view }) => {
        const isActive = activeView === view;
        return (
          <Button
            key={view}
            onPress={() => onNavigate(view)}
            mode={isActive ? "contained-tonal" : "text"}
            style={styles.tabButton}
            labelStyle={styles.tabLabel}
          >
            {name}
          </Button>
        );
      })}
    </Surface>
  );

  const renderMobileMenu = () => (
    <View style={styles.mobileMenuContainer}>
      <Menu
        visible={isMenuOpen}
        onDismiss={() => setIsMenuOpen(false)}
        anchor={
          <IconButton
            icon="menu"
            size={24}
            onPress={() => setIsMenuOpen(true)}
          />
        }
      >
        {buttons.map(({ name, view }) => (
          <Menu.Item
            key={view}
            title={name}
            onPress={() => {
              onNavigate(view);
              setIsMenuOpen(false);
            }}
          />
        ))}
      </Menu>
    </View>
  );

  return isMobileLayout ? renderMobileMenu() : renderTabBar();
};

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: "row",
  },
  tabButton: {
    flex: 1,
    borderRadius: 0,
    paddingVertical: 8,
  },
  tabLabel: {
    textAlign: "center",
  },
  mobileMenuContainer: {
    width: "100%",
    alignItems: "center",
    padding: 8,
  },
});

export default NavPanel;
