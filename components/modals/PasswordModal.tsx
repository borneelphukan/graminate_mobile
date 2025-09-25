import React, { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import {
  Button,
  Card,
  Divider,
  IconButton,
  Modal,
  Portal,
  Text,
  useTheme,
} from "react-native-paper";

type PasswordModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  title?: string;
  children: ReactNode;
  footerContent?: ReactNode;
};

const PasswordModal = ({
  isOpen,
  onClose,
  title,
  children,
  footerContent,
}: PasswordModalProps) => {
  const theme = useTheme();

  if (!isOpen) {
    return null;
  }

  return (
    <Portal>
      <Modal
        visible={isOpen}
        onDismiss={onClose}
        contentContainerStyle={styles.modalContent}
      >
        <Card>
          {title && (
            <>
              <View style={styles.header}>
                <Text variant="titleLarge">{title}</Text>
                <IconButton icon="close" size={24} onPress={onClose} />
              </View>
              <Divider />
            </>
          )}
          <Card.Content style={styles.content}>{children}</Card.Content>
          {footerContent && (
            <Card.Actions style={styles.actions}>{footerContent}</Card.Actions>
          )}
        </Card>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContent: {
    margin: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingLeft: 24,
    paddingRight: 12,
    paddingVertical: 8,
  },
  content: {
    paddingTop: 24,
    paddingBottom: 16,
  },
  actions: {
    padding: 16,
    justifyContent: "flex-end",
  },
});

export default PasswordModal;
