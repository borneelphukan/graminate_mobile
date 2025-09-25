export const GENDER = ["Male", "Female", "Other"];
export const YESNO = ["Yes", "No"];
export const LANGUAGES = ["English", "Hindi", "Assamese"];
export const POULTRY_TYPES = ["Layers", "Broilers", "Dual-Purpose", "Breeder"];
export const FISHERY_TYPES = ["Freshwater Aquaculture"];

export const FEED_TYPES = [
  "Pelleted Feed (Commercial)",
  "Live Feed (e.g., Artemia, Rotifers)",
  "Formulated Feed (On-farm)",
  "Natural Plankton/Organisms",
  "Agricultural By-products",
  "Moist Feed",
  "Dry Feed",
  "Other",
];
export const HOUSING_TYPES = [
  { id: "free_range", name: "Free Range System" },
  { id: "barn", name: "Barn System" },
  { id: "cage_system", name: "Cage (Battery Cage) System" },
  { id: "deep_litter", name: "Deep Litter System" },
  { id: "pastured", name: "Pastured Poultry" },
  { id: "semi_intensive", name: "Semi-Intensive System" },
  { id: "slatted_floor", name: "Slatted Floor System" },
  {
    id: "environment_controlled",
    name: "Environment-Controlled (Closed) Housing",
  },
  { id: "broiler_colony", name: "Broiler Colony" },
  { id: "other", name: "Other" },
];

export const INDUSTRY_OPTIONS = [
  "Crop Farming",
  "Livestock & Poultry Farming",
  "Aquaculture & Fisheries",
  "Agricultural Inputs (Seeds, Fertilizers, Pesticides)",
  "Farm Machinery & Equipment",
  "Food Processing (Meat, Dairy, Grains, Beverages)",
  "Commodity Trading & Food Distribution",
  "AgTech & Precision Farming",
  "Organic & Sustainable Agriculture",
  "Agricultural Finance & Insurance",
];
import { TimeFormatOption } from "@/contexts/UserPreferencesContext";
import { ExpenseCategoryConfig } from "../hooks/finance";
export const TIME_FORMAT: TimeFormatOption[] = ["12-hour", "24-hour"];

export const UNITS = [
  // Crops & Produce
  "kg",
  "grams (g)",
  "quintal",
  "ton",
  "lbs",
  "bushel",
  "bag",
  "crate",
  "box",
  "sack",
  "bale",
  "bundle",
  // Fertilizers, Pesticides, Chemicals
  "liter",
  "ml",
  "bottle",
  "can",
  "drum",
  "packet",
  // Seeds
  "tin",
  "sachet",
  // Tools & Equipment
  "unit",
  "set",
  "piece",
  "kit",
  "pair",
  // Water/Irrigation/Storage
  "gallon",
  "barrel",
  "tank",
  "roll",
  // Packaging Materials
  "carton",
  "strip",
  // General / Measurement
  "sheet",
  "dozen",
  "meter",
  "feet",
  "sq. m",
  "hectare",
];

export const COMPANY_TYPES = ["Supplier", "Distributor", "Factories", "Buyer"];
export const CONTACT_TYPES = [
  { value: "Regular Customer", label: "Regular Customer" },
  { value: "Wholesaler", label: "Wholesaler" },
  { value: "Industrial Unit", label: "Industrial Unit" },
  { value: "Others", label: "Others" },
];

export const CONTRACT_STATUS = [
  "Drafting",
  "Review & Discussion",
  "Approved",
  "Signed",
  "Amendments",
  "Terminated",
];

export const PAYMENT_STATUS = ["Pending", "Paid", "Overdue", "Cancelled"];

export const PAGINATION_ITEMS = ["25 per page", "50 per page", "100 per page"];

export const PRIORITY_OPTIONS = ["High", "Medium", "Low"];

// Occupation Specific constants
export const POULTRY_EXPENSE_CONFIG: ExpenseCategoryConfig = {
  detailedCategories: {
    "Goods & Services": ["Farm Utilities", "Agricultural Feeds", "Consulting"],
    "Utility Expenses": [
      "Electricity",
      "Labour Salary",
      "Water Supply",
      "Taxes",
      "Others",
    ],
  },
  expenseTypeMap: {
    COGS: "Goods & Services",
    OPERATING_EXPENSES: "Utility Expenses",
  },
};

export const FISHERY_EXPENSE_CONFIG: ExpenseCategoryConfig = {
  detailedCategories: {
    "Goods & Services": [
      "Farm Utilities",
      "Agricultural Feeds",
      "Consulting",
      "Fish Seed",
      "Pond Preparation",
    ],
    "Utility Expenses": [
      "Electricity",
      "Labour Salary",
      "Water Supply",
      "Taxes",
      "Others",
      "Equipment Maintenance",
    ],
  },
  expenseTypeMap: {
    COGS: "Goods & Services",
    OPERATING_EXPENSES: "Utility Expenses",
  },
};
