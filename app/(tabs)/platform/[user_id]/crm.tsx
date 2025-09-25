import CompanyForm, {
  CompanyFormData,
} from "@/components/form/crm/CompanyForm";
import ContactForm, {
  ContactFormData,
} from "@/components/form/crm/ContactForm";
import ContractForm, {
  ContractFormData,
} from "@/components/form/crm/ContractForm";
import ReceiptForm, {
  ReceiptFormData,
} from "@/components/form/crm/ReceiptForm";
import TaskForm, { TaskFormData } from "@/components/form/crm/TaskForm";
import PlatformLayout from "@/components/layout/PlatformLayout";
import {
  faArrowDown,
  faArrowUp,
  faBuilding,
  faCalendar,
  faChevronDown,
  faClipboardList,
  faEnvelope,
  faFileContract,
  faPhone,
  faPlus,
  faReceipt,
  faUserTie,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, FlatList, SafeAreaView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  Divider,
  FAB,
  Menu,
  Searchbar,
  Text,
  TouchableRipple,
  useTheme,
} from "react-native-paper";

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const api = axios.create({ baseURL: API_URL });

// --- Type Definitions (No Changes) ---
type Contact = {
  contact_id: number;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone_number: string;
  type: string;
  created_at: string;
};
type Company = {
  company_id: number;
  company_name: string;
  contact_person: string;
  email: string | null;
  phone_number: string | null;
  type: string;
  created_at: string;
};
type Contract = {
  deal_id: number;
  deal_name: string;
  partner: string;
  amount: number;
  stage: string;
  created_at: string;
  start_date: string;
  end_date: string | null;
};
type Receipt = {
  invoice_id: number;
  title: string;
  bill_to: string;
  due_date: string;
  created_at: string;
  receipt_date: string;
};
type Task = { task_id: number; project: string; created_at: string };
type DataItem = Contact | Company | Contract | Receipt | Task;
type ViewType = "contacts" | "companies" | "contracts" | "receipts" | "tasks";
type ProjectGroup = { title: string; count: number; data: Task[] };

// --- Helper Functions (No Changes) ---
const formatDate = (dateString: string) => {
  if (!dateString) return "No date";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch (e) {
    return "Invalid Date";
  }
};
const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);

// --- Card Components (Updated with FontAwesome) ---

const ContactCard = ({
  item,
  onPress,
}: {
  item: Contact;
  onPress: () => void;
}) => {
  const theme = useTheme();
  return (
    <Card onPress={onPress} style={styles.card}>
      <Card.Title
        title={`${item.first_name} ${item.last_name || ""}`}
        subtitle={item.type}
      />
      <Card.Content>
        <View style={styles.cardRow}>
          {item.email && (
            <View style={styles.infoItem}>
              <FontAwesomeIcon icon={faEnvelope} size={16} />
              <Text style={styles.infoText}>{item.email}</Text>
            </View>
          )}
          <Text
            variant="labelSmall"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            {formatDate(item.created_at)}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );
};

const CompanyCard = ({
  item,
  onPress,
}: {
  item: Company;
  onPress: () => void;
}) => {
  const theme = useTheme();
  return (
    <Card onPress={onPress} style={styles.card}>
      <Card.Title
        title={item.company_name}
        subtitle={`Contact: ${item.contact_person}`}
      />
      <Card.Content>
        <View style={styles.cardRow}>
          {item.phone_number && (
            <View style={styles.infoItem}>
              <FontAwesomeIcon icon={faPhone} size={16} />
              <Text style={styles.infoText}>{item.phone_number}</Text>
            </View>
          )}
          <Text
            variant="labelSmall"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            {formatDate(item.created_at)}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );
};

const ContractCard = ({
  item,
  onPress,
}: {
  item: Contract;
  onPress: () => void;
}) => {
  const theme = useTheme();
  return (
    <Card onPress={onPress} style={styles.card}>
      <Card.Title
        title={item.deal_name}
        titleNumberOfLines={2}
        right={() => (
          <Text
            variant="titleMedium"
            style={{ color: theme.colors.primary, marginRight: 16 }}
          >
            {formatCurrency(item.amount)}
          </Text>
        )}
      />
      <Card.Content>
        <Text
          variant="bodyMedium"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          Partner: {item.partner}
        </Text>
        <View style={styles.cardRow}>
          <Chip>{item.stage}</Chip>
          <Text
            variant="labelSmall"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            End Date: {item.end_date ? formatDate(item.end_date) : "N/A"}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );
};

const ReceiptCard = ({
  item,
  onPress,
}: {
  item: Receipt;
  onPress: () => void;
}) => {
  const theme = useTheme();
  return (
    <Card onPress={onPress} style={styles.card}>
      <Card.Title title={item.title} subtitle={`Billed to: ${item.bill_to}`} />
      <Card.Content>
        <View style={styles.cardRow}>
          <View style={styles.infoItem}>
            <FontAwesomeIcon
              icon={faCalendar}
              size={16}
              color={theme.colors.error}
            />
            <Text style={[styles.infoText, { color: theme.colors.error }]}>
              Due: {formatDate(item.due_date)}
            </Text>
          </View>
          <Text
            variant="labelSmall"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            Issued: {formatDate(item.receipt_date || item.created_at)}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );
};

const ProjectGroupCard = ({ group }: { group: ProjectGroup }) => (
  <Card style={styles.card}>
    <Card.Title
      title={group.title}
      right={() => (
        <Text style={styles.countText}>
          {group.count} task{group.count !== 1 ? "s" : ""}
        </Text>
      )}
    />
  </Card>
);

// --- Main CRM Component ---

const CRM = () => {
  // --- Hooks and State (No Changes) ---
  const {
    user_id,
    refresh,
    view: viewFromParams,
  } = useLocalSearchParams<{
    user_id: string;
    refresh?: string;
    view?: ViewType;
  }>();
  const theme = useTheme();
  const [view, setView] = useState<ViewType>(viewFromParams || "contacts");
  const [data, setData] = useState<DataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isViewMenuVisible, setViewMenuVisible] = useState(false);
  const [isContactFormVisible, setContactFormVisible] = useState(false);
  const [isCompanyFormVisible, setCompanyFormVisible] = useState(false);
  const [isContractFormVisible, setContractFormVisible] = useState(false);
  const [isReceiptFormVisible, setReceiptFormVisible] = useState(false);
  const [isTaskFormVisible, setTaskFormVisible] = useState(false);
  const [sortCriterion, setSortCriterion] = useState<string>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isSortMenuVisible, setSortMenuVisible] = useState(false);

  // --- VIEW_CONFIG (Updated with FontAwesome icon objects) ---
  const VIEW_CONFIG = useMemo(
    () => ({
      contacts: {
        title: "Contacts",
        endpoint: `/contacts/${user_id}`,
        dataKey: "contacts",
        icon: faUserTie,
        addText: "Contact",
      },
      companies: {
        title: "Companies",
        endpoint: `/companies/${user_id}`,
        dataKey: "companies",
        icon: faBuilding,
        addText: "Company",
      },
      contracts: {
        title: "Contracts",
        endpoint: `/contracts/${user_id}`,
        dataKey: "contracts",
        icon: faFileContract,
        addText: "Contract",
      },
      receipts: {
        title: "Receipts",
        endpoint: `/receipts/${user_id}`,
        dataKey: "receipts",
        icon: faReceipt,
        addText: "Receipt",
      },
      tasks: {
        title: "Projects",
        endpoint: `/tasks/${user_id}`,
        dataKey: "tasks",
        icon: faClipboardList,
        addText: "Project",
      },
    }),
    [user_id]
  );

  // --- Logic and Functions (No Changes) ---
  const SORT_OPTIONS: {
    [key in ViewType]: { value: string; label: string }[];
  } = useMemo(
    () => ({
      contacts: [
        { value: "created_at", label: "Date Created" },
        { value: "first_name", label: "Name" },
        { value: "type", label: "Type" },
      ],
      companies: [
        { value: "created_at", label: "Date Created" },
        { value: "company_name", label: "Name" },
        { value: "type", label: "Type" },
      ],
      contracts: [
        { value: "created_at", label: "Date Created" },
        { value: "deal_name", label: "Name" },
        { value: "stage", label: "Stage" },
        { value: "amount", label: "Amount" },
      ],
      receipts: [
        { value: "created_at", label: "Date Created" },
        { value: "title", label: "Title" },
        { value: "due_date", label: "Due Date" },
      ],
      tasks: [
        { value: "title", label: "Project Name" },
        { value: "count", label: "Task Count" },
      ],
    }),
    []
  );

  const handleSelectView = (newView: ViewType) => {
    if (view !== newView) {
      setView(newView);
      setData([]);
      setSearchQuery("");
      setSortCriterion(SORT_OPTIONS[newView][0].value);
      setSortOrder("desc");
    }
    setViewMenuVisible(false);
  };

  useEffect(() => {
    if (viewFromParams && viewFromParams !== view)
      handleSelectView(viewFromParams);
  }, [viewFromParams]);

  const fetchData = useCallback(
    async (currentView: ViewType) => {
      if (!user_id) return;
      setLoading(true);
      setError(null);
      const config = VIEW_CONFIG[currentView];
      try {
        const token = await AsyncStorage.getItem("accessToken");
        if (!token) throw new Error("Authentication token not found.");
        const response = await api.get(config.endpoint, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setData(
          Array.isArray(response.data?.[config.dataKey])
            ? response.data[config.dataKey]
            : []
        );
      } catch (err: any) {
        setError(
          axios.isAxiosError(err)
            ? err.response?.data?.message || `Failed to connect`
            : err.message || "An error occurred."
        );
        setData([]);
      } finally {
        setLoading(false);
      }
    },
    [user_id, VIEW_CONFIG]
  );

  useEffect(() => {
    fetchData(view);
  }, [view, fetchData, refresh]);

  const handleCreateContact = async (formData: ContactFormData) => {
    try {
      const token = await AsyncStorage.getItem("accessToken");
      if (!token || !user_id) throw new Error("Authentication error.");
      const payload = {
        ...formData,
        user_id: Number(user_id),
        email: formData.email || null,
        phone_number: formData.phone_number || null,
        address_line_2: formData.address_line_2 || null,
      };
      await api.post("/contacts/add", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      Alert.alert("Success", "Contact created successfully.");
      await fetchData("contacts");
    } catch (err) {
      const errorMessage = axios.isAxiosError(err)
        ? err.response?.data?.message || "An API error occurred."
        : "An unexpected error occurred.";
      Alert.alert("Creation Failed", errorMessage);
      throw err;
    }
  };

  const handleCreateCompany = async (formData: CompanyFormData) => {
    try {
      const token = await AsyncStorage.getItem("accessToken");
      if (!token || !user_id) throw new Error("Authentication error.");
      const payload = {
        user_id: Number(user_id),
        company_name: formData.company_name,
        contact_person: formData.contact_person,
        type: formData.type,
        address_line_1: formData.address_line_1,
        city: formData.city,
        state: formData.state,
        postal_code: formData.postal_code,
        email: formData.email || null,
        phone_number: formData.phone_number || null,
        address_line_2: formData.address_line_2 || null,
        website: formData.website || null,
        industry: formData.industry || null,
      };
      await api.post("/companies/add", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      Alert.alert("Success", "Company created successfully.");
      await fetchData("companies");
    } catch (err) {
      const errorMessage = axios.isAxiosError(err)
        ? err.response?.data?.message || "An API error occurred."
        : "An unexpected error occurred.";
      Alert.alert("Creation Failed", errorMessage);
      throw err;
    }
  };

  const handleCreateContract = async (formData: ContractFormData) => {
    try {
      const token = await AsyncStorage.getItem("accessToken");
      if (!token || !user_id) throw new Error("Authentication error.");
      const payload = {
        user_id: Number(user_id),
        deal_name: formData.deal_name,
        stage: formData.stage,
        amount: parseFloat(formData.amount),
        start_date: formData.start_date,
        priority: formData.priority,
        partner: formData.partner || null,
        end_date: formData.end_date || null,
        category: formData.category || null,
      };
      await api.post("/contracts/add", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      Alert.alert("Success", "Contract created successfully.");
      await fetchData("contracts");
    } catch (err) {
      const errorMessage = axios.isAxiosError(err)
        ? err.response?.data?.message || "An API error occurred."
        : "An unexpected error occurred.";
      Alert.alert("Creation Failed", errorMessage);
      throw err;
    }
  };

  const handleCreateReceipt = async (formData: ReceiptFormData) => {
    try {
      const token = await AsyncStorage.getItem("accessToken");
      if (!token || !user_id) throw new Error("Authentication error.");
      const payload = {
        user_id: Number(user_id),
        title: formData.title,
        bill_to: formData.billTo,
        due_date: formData.dueDate,
        receipt_number: formData.receiptNumber || null,
        payment_terms: formData.paymentTerms || null,
        notes: formData.notes || null,
        tax: parseFloat(formData.tax) || 0,
        discount: parseFloat(formData.discount) || 0,
        shipping: parseFloat(formData.shipping) || 0,
        items: formData.items
          .map(({ description, quantity, rate }) => ({
            description,
            quantity: Number(quantity) || 0,
            rate: Number(rate) || 0,
          }))
          .filter(
            (item) => item.description.trim() !== "" && item.quantity > 0
          ),
        linked_sale_id: formData.linked_sale_id,
      };
      await api.post("/receipts/add", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      Alert.alert("Success", "Receipt created successfully.");
      await fetchData("receipts");
    } catch (err) {
      const errorMessage = axios.isAxiosError(err)
        ? err.response?.data?.message || "An API error occurred."
        : "An unexpected error occurred.";
      Alert.alert("Creation Failed", errorMessage);
      throw err;
    }
  };

  const handleCreateTask = async (formData: TaskFormData) => {
    try {
      const token = await AsyncStorage.getItem("accessToken");
      if (!token || !user_id) throw new Error("Authentication error.");
      const payload = { user_id: Number(user_id), project: formData.project };
      await api.post("/tasks/add", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      Alert.alert("Success", "Project created successfully.");
      await fetchData("tasks");
    } catch (err) {
      const errorMessage = axios.isAxiosError(err)
        ? err.response?.data?.message || "An API error occurred."
        : "An unexpected error occurred.";
      Alert.alert("Creation Failed", errorMessage);
      throw err;
    }
  };

  const filteredData = useMemo(() => {
    if (!searchQuery) return data;
    return data.filter((item) =>
      Object.values(item).some((value) =>
        String(value).toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  }, [data, searchQuery]);

  const sortedData = useMemo(() => {
    if (view === "tasks") return [];
    return [...filteredData].sort((a, b) => {
      const itemA = a as any,
        itemB = b as any;
      const valA = itemA[sortCriterion],
        valB = itemB[sortCriterion];
      if (valA === undefined || valA === null)
        return sortOrder === "asc" ? -1 : 1;
      if (valB === undefined || valB === null)
        return sortOrder === "asc" ? 1 : -1;
      let comparison = 0;
      if (
        [
          "created_at",
          "start_date",
          "end_date",
          "due_date",
          "receipt_date",
        ].includes(sortCriterion)
      ) {
        comparison = new Date(valA).getTime() - new Date(valB).getTime();
      } else if (typeof valA === "number" && typeof valB === "number") {
        comparison = valA - valB;
      } else {
        comparison = String(valA)
          .toLowerCase()
          .localeCompare(String(valB).toLowerCase());
      }
      return sortOrder === "desc" ? -comparison : comparison;
    });
  }, [filteredData, sortCriterion, sortOrder, view]);

  const groupedTasksData = useMemo(() => {
    if (view !== "tasks") return [];
    const groups = (filteredData as Task[]).reduce((acc, task) => {
      if (!acc[task.project]) acc[task.project] = [];
      acc[task.project].push(task);
      return acc;
    }, {} as { [key: string]: Task[] });
    const mappedGroups = Object.keys(groups).map((key) => ({
      title: key,
      count: groups[key].length,
      data: groups[key],
    }));
    return mappedGroups.sort((a, b) => {
      const valA = a[sortCriterion as keyof ProjectGroup],
        valB = b[sortCriterion as keyof ProjectGroup];
      let comparison = 0;
      if (typeof valA === "number" && typeof valB === "number")
        comparison = valA - valB;
      else comparison = String(valA).localeCompare(String(valB));
      return sortOrder === "desc" ? -comparison : comparison;
    });
  }, [filteredData, view, sortCriterion, sortOrder]);

  const resultCount =
    view === "tasks" ? groupedTasksData.length : sortedData.length;

  const handleAddButtonPress = () => {
    if (view === "contacts") setContactFormVisible(true);
    else if (view === "companies") setCompanyFormVisible(true);
    else if (view === "contracts") setContractFormVisible(true);
    else if (view === "receipts") setReceiptFormVisible(true);
    else if (view === "tasks") setTaskFormVisible(true);
  };

  const renderItem = ({ item }: { item: DataItem }) => {
    switch (view) {
      case "contacts":
        const contact = item as Contact;
        return (
          <ContactCard
            item={contact}
            onPress={() =>
              router.push(
                `/platform/${user_id}/contacts/${
                  contact.contact_id
                }?data=${encodeURIComponent(JSON.stringify(contact))}`
              )
            }
          />
        );
      case "companies":
        const company = item as Company;
        return (
          <CompanyCard
            item={company}
            onPress={() =>
              router.push(
                `/platform/${user_id}/companies/${
                  company.company_id
                }?data=${encodeURIComponent(JSON.stringify(company))}`
              )
            }
          />
        );
      case "contracts":
        const contract = item as Contract;
        return (
          <ContractCard
            item={contract}
            onPress={() =>
              router.push(
                `/platform/${user_id}/contracts/${
                  contract.deal_id
                }?data=${encodeURIComponent(JSON.stringify(contract))}`
              )
            }
          />
        );
      case "receipts":
        const receipt = item as Receipt;
        return (
          <ReceiptCard
            item={receipt}
            onPress={() =>
              router.push(
                `/platform/${user_id}/receipts/${
                  receipt.invoice_id
                }?data=${encodeURIComponent(JSON.stringify(receipt))}`
              )
            }
          />
        );
      default:
        return null;
    }
  };

  const keyExtractor = (item: DataItem): string => {
    if ((item as Contact).contact_id)
      return `contact-${(item as Contact).contact_id}`;
    if ((item as Company).company_id)
      return `company-${(item as Company).company_id}`;
    if ((item as Contract).deal_id)
      return `contract-${(item as Contract).deal_id}`;
    if ((item as Receipt).invoice_id)
      return `receipt-${(item as Receipt).invoice_id}`;
    if ((item as Task).task_id) return `task-${(item as Task).task_id}`;
    return `item-${Math.random()}`;
  };

  // --- renderContent (Updated with FontAwesome) ---
  const renderContent = () => {
    if (loading)
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      );
    if (error)
      return (
        <View style={styles.centered}>
          <Text style={{ color: theme.colors.error }}>{error}</Text>
          <Button onPress={() => fetchData(view)}>Try Again</Button>
        </View>
      );

    if (view === "tasks") {
      if (groupedTasksData.length === 0) {
        return (
          <View style={styles.centered}>
            <FontAwesomeIcon
              icon={VIEW_CONFIG[view].icon}
              size={64}
              color={theme.colors.onSurfaceDisabled}
            />
            <Text style={{ color: theme.colors.onSurfaceDisabled }}>
              {searchQuery
                ? `No projects found for "${searchQuery}"`
                : `No projects found.`}
            </Text>
          </View>
        );
      }
      return (
        <FlatList<ProjectGroup>
          data={groupedTasksData}
          renderItem={({ item }) => <ProjectGroupCard group={item} />}
          keyExtractor={(item) => item.title}
          onRefresh={() => fetchData(view)}
          refreshing={loading}
          contentContainerStyle={styles.listContent}
        />
      );
    }

    if (sortedData.length === 0) {
      return (
        <View style={styles.centered}>
          <FontAwesomeIcon
            icon={VIEW_CONFIG[view].icon}
            size={64}
            color={theme.colors.onSurfaceDisabled}
          />
          <Text style={{ color: theme.colors.onSurfaceDisabled }}>
            {searchQuery
              ? `No ${view} found for "${searchQuery}"`
              : `No ${view} found. Add one to get started.`}
          </Text>
        </View>
      );
    }
    return (
      <FlatList<DataItem>
        data={sortedData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        onRefresh={() => fetchData(view)}
        refreshing={loading}
        contentContainerStyle={styles.listContent}
      />
    );
  };

  // --- Main Return JSX (Updated with FontAwesome) ---
  return (
    <PlatformLayout>
      <SafeAreaView
        style={[styles.flex, { backgroundColor: theme.colors.background }]}
      >
        <View
          style={[
            styles.header,
            { borderBottomColor: theme.colors.outlineVariant },
          ]}
        >
          <Menu
            visible={isViewMenuVisible}
            onDismiss={() => setViewMenuVisible(false)}
            anchor={
              <TouchableRipple
                onPress={() => setViewMenuVisible(true)}
                style={styles.titleContainer}
              >
                <>
                  <Text variant="headlineMedium">
                    {VIEW_CONFIG[view].title}
                  </Text>
                  <FontAwesomeIcon icon={faChevronDown} size={28} />
                </>
              </TouchableRipple>
            }
          >
            {Object.keys(VIEW_CONFIG).map((key) => (
              <Menu.Item
                key={key}
                title={VIEW_CONFIG[key as ViewType].title}
                onPress={() => handleSelectView(key as ViewType)}
              />
            ))}
          </Menu>

          <View style={styles.controlsRow}>
            <Text variant="labelMedium">
              {resultCount} Result{resultCount !== 1 ? "s" : ""}
            </Text>
            <Menu
              visible={isSortMenuVisible}
              onDismiss={() => setSortMenuVisible(false)}
              anchor={
                <Button
                  onPress={() => setSortMenuVisible(true)}
                  icon={({ size, color }) => (
                    <FontAwesomeIcon
                      icon={sortOrder === "desc" ? faArrowDown : faArrowUp}
                      size={size}
                      color={color}
                    />
                  )}
                >
                  Sort
                </Button>
              }
            >
              {SORT_OPTIONS[view].map((option) => (
                <Menu.Item
                  key={option.value}
                  title={option.label}
                  onPress={() => {
                    setSortCriterion(option.value);
                    setSortMenuVisible(false);
                  }}
                />
              ))}
              <Divider />
              <Menu.Item
                title="Ascending"
                onPress={() => {
                  setSortOrder("asc");
                  setSortMenuVisible(false);
                }}
              />
              <Menu.Item
                title="Descending"
                onPress={() => {
                  setSortOrder("desc");
                  setSortMenuVisible(false);
                }}
              />
            </Menu>
          </View>
          <Searchbar
            placeholder={`Search in ${VIEW_CONFIG[view].title}...`}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        {renderContent()}
        <FAB
          icon={({ size, color }) => (
            <FontAwesomeIcon icon={faPlus} size={size} color={color} />
          )}
          label={VIEW_CONFIG[view].addText}
          style={styles.fab}
          onPress={handleAddButtonPress}
        />
        <ContactForm
          isVisible={isContactFormVisible}
          onClose={() => setContactFormVisible(false)}
          onSubmit={handleCreateContact}
        />
        <CompanyForm
          isVisible={isCompanyFormVisible}
          onClose={() => setCompanyFormVisible(false)}
          onSubmit={handleCreateCompany}
        />
        <ContractForm
          isVisible={isContractFormVisible}
          onClose={() => setContractFormVisible(false)}
          onSubmit={handleCreateContract}
          user_id={user_id}
        />
        <ReceiptForm
          isVisible={isReceiptFormVisible}
          onClose={() => setReceiptFormVisible(false)}
          onSubmit={handleCreateReceipt}
          user_id={user_id}
        />
        <TaskForm
          isVisible={isTaskFormVisible}
          onClose={() => setTaskFormVisible(false)}
          onSubmit={handleCreateTask}
          user_id={user_id}
        />
      </SafeAreaView>
    </PlatformLayout>
  );
};

// --- Styles (No Changes) ---
const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    gap: 16,
  },
  header: { padding: 16, gap: 16, borderBottomWidth: 1 },
  titleContainer: { flexDirection: "row", alignItems: "center", gap: 8 },
  controlsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  listContent: { padding: 16, paddingBottom: 96 },
  card: { marginBottom: 12 },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  infoItem: { flexDirection: "row", alignItems: "center" },
  infoText: { marginLeft: 8 },
  countText: { marginRight: 16, fontSize: 14 },
  fab: { position: "absolute", margin: 16, right: 0, bottom: 0 },
});

export default CRM;
