import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import {
  Appbar,
  Button,
  Divider,
  Modal,
  Portal,
  Surface,
  useTheme,
} from "react-native-paper";

type FormModalProps = {
  isVisible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onSubmit: () => void;
  isSubmitting: boolean;
  submitButtonText: string;
  onBackgroundPress?: () => void;
  onScrollBeginDrag?: () => void;
};

export const FormModal = ({
  isVisible,
  onClose,
  title,
  children,
  onSubmit,
  isSubmitting,
  submitButtonText,
  onBackgroundPress,
  onScrollBeginDrag,
}: FormModalProps) => {
  const theme = useTheme();

  return (
    <Portal>
      <Modal
        visible={isVisible}
        onDismiss={onClose}
        contentContainerStyle={styles.modalContainer}
      >
        <Pressable
          style={styles.backdrop}
          onPress={onBackgroundPress || onClose}
        />
        <Surface
          style={[
            styles.contentSurface,
            { backgroundColor: theme.colors.elevation.level2 },
          ]}
          elevation={4}
        >
          <Appbar.Header elevated style={styles.header}>
            <Appbar.Content title={title} titleStyle={styles.title} />
            <Appbar.Action icon="close" onPress={onClose} />
          </Appbar.Header>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={onScrollBeginDrag}
          >
            {children}
          </ScrollView>

          <View style={styles.footer}>
            <Button
              mode="contained"
              onPress={onSubmit}
              loading={isSubmitting}
              disabled={isSubmitting}
              style={styles.submitButton}
              labelStyle={styles.submitButtonLabel}
            >
              {submitButtonText}
            </Button>
          </View>
        </Surface>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  contentSurface: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "90%",
  },
  header: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  title: {
    fontWeight: "bold",
  },
  scrollView: {
    padding: 20,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  submitButton: {
    paddingVertical: 8,
    borderRadius: 50,
  },
  submitButtonLabel: {
    fontSize: 16,
    fontWeight: "bold",
  },
});
