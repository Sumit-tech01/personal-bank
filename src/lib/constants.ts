import type {
  AddRecordType,
  ExpenseGroup,
  InventoryCategory,
  LabourActivity,
  PaymentMethod,
  ReminderCategory,
  RepeatOption,
  StockAdjustmentType,
  VehicleType,
} from "./types";

export const APP_NAME = "Personal Bank";
export const APP_TAGLINE = "Your Family. Your Farm. Your Finances.";

export const HOME_CATEGORIES = [
  "Groceries",
  "Vegetables and Fruits",
  "Milk",
  "Electricity",
  "Water",
  "Gas Cylinder",
  "Mobile Recharge",
  "Internet",
  "Medical",
  "Education",
  "Clothing",
  "House Maintenance",
  "Travel",
  "Family Events",
  "Other",
  "Vegetables",
  "Milk and Dairy",
  "Electricity Bill",
  "Water Bill",
  "Gas",
  "Medical Expenses",
  "Furniture and Appliances",
  "Other Expenses",
] as const;

export const FARM_CATEGORIES = [
  "Seeds",
  "Fertilizers",
  "Pesticides",
  "Irrigation",
  "Diesel",
  "Machinery",
  "Tractor rental",
  "Transportation",
  "Land preparation",
  "Harvesting",
  "Other",
  "Fuel",
  "Labour",
  "Water and Irrigation",
  "Other Farm Expenses",
] as const;

export const VEHICLE_CATEGORIES = [
  "Petrol",
  "Diesel",
  "CNG",
  "Engine Oil",
  "Servicing",
  "Repairs",
  "Tyres",
  "Battery",
  "Insurance",
  "PUC",
  "Registration",
  "EMI",
  "Parking",
  "Other",
  "Tractor",
  "Car",
  "Bike",
  "Fuel",
  "Loan EMI",
  "Other Vehicle Expenses",
] as const;

export const OTHER_CATEGORIES = [
  "Gift",
  "Donation",
  "Bank Charges",
  "Other",
] as const;

export const FARM_INCOME_CATEGORY_LIST = [
  "Crop Sales",
  "Milk Sales",
  "Agricultural Products",
  "Tractor Rental",
  "Machinery Rental",
  "Other Farming Income",
] as const;

export const HOUSEHOLD_INCOME_CATEGORY_LIST = [
  "Salary",
  "Business Income",
  "Other Income",
] as const;

export const INCOME_CATEGORIES = [
  ...FARM_INCOME_CATEGORY_LIST,
  ...HOUSEHOLD_INCOME_CATEGORY_LIST,
  // Legacy aliases
  "Agricultural Rental Income",
  "Tractor Rental Income",
  "Other Household Income",
] as const;

export const FARM_INCOME_CATEGORIES = new Set<string>([
  "Crop Sales",
  "Milk Sales",
  "Agricultural Products",
  "Tractor Rental",
  "Machinery Rental",
  "Other Farming Income",
  "Agricultural Rental Income",
  "Tractor Rental Income",
]);

export const HOUSEHOLD_INCOME_CATEGORIES = new Set<string>([
  "Salary",
  "Business Income",
  "Other Income",
  "Other Household Income",
]);

export const CATEGORY_GROUPS: Record<ExpenseGroup | "INCOME", readonly string[]> = {
  HOME: HOME_CATEGORIES,
  FARM: FARM_CATEGORIES,
  VEHICLE: VEHICLE_CATEGORIES,
  OTHER: OTHER_CATEGORIES,
  INCOME: INCOME_CATEGORIES,
};

export const LABOUR_ACTIVITIES: LabourActivity[] = [
  "Land preparation",
  "Sowing",
  "Planting",
  "Weeding",
  "Irrigation",
  "Fertilizer application",
  "Pesticide spraying",
  "Harvesting",
  "Loading",
  "Transportation",
  "Other",
];

export const CROP_STATUS_OPTIONS = [
  { value: "PLANNED", label: "Planned" },
  { value: "ACTIVE", label: "Active" },
  { value: "HARVESTING", label: "Harvesting" },
  { value: "COMPLETED", label: "Completed" },
] as const;

export const AREA_UNITS = ["Acre", "Hectare", "Guntha"] as const;

export const SALE_UNITS = [
  "Quintal",
  "Kg",
  "Ton",
  "Bags",
  "Crates",
  "Boxes",
] as const;

export const MILK_UNITS = ["Litre", "Liter"] as const;

export const AGRI_PRODUCT_UNITS = [
  "Kg",
  "Quintal",
  "Ton",
  "Bags",
  "Crates",
  "Boxes",
  "Bundles",
  "Trailers",
  "Dozen",
] as const;

export const RENTAL_UNITS = [
  "Hours",
  "Acres",
  "Days",
  "Trips",
] as const;

export const TRACTOR_OPERATIONS = [
  "Ploughing",
  "Rotavator",
  "Sowing",
  "Trolley Transport",
  "Cultivator",
  "Thresher",
  "Sprayer",
  "Harrow",
  "Other",
] as const;

export const VEHICLE_SERVICE_TYPES = [
  "Routine Servicing",
  "Engine Oil Change",
  "Tyres Replacement",
  "Battery Replacement",
  "Brake Overhaul",
  "General Repairs",
  "Insurance Renewal",
  "PUC Test",
  "Other",
] as const;

export const VEHICLE_FUEL_TYPES = [
  "Diesel",
  "Petrol",
  "CNG",
  "Electric",
  "None",
] as const;

export const POPULAR_CROPS = [
  "Soybean",
  "Cotton",
  "Sugarcane",
  "Wheat",
  "Onion",
  "Gram / Chana",
  "Maize",
  "Tur / Arhar",
  "Tomato",
  "Pomegranate",
  "Grapes",
  "Groundnut",
  "Bajra",
  "Jowar",
] as const;

export const SOIL_TYPES = [
  "Black cotton soil",
  "Medium black soil",
  "Red loam soil",
  "Alluvial soil",
  "Sandy loam",
  "Clay loam",
  "Laterite soil",
] as const;

export const IRRIGATION_TYPES = [
  "Drip irrigation",
  "Sprinkler",
  "Canal / Flow",
  "Borewell / Tube well",
  "Open well",
  "Rainfed / Dryland",
] as const;

export const REMINDER_CATEGORIES: ReminderCategory[] = [
  "Crop",
  "Labour",
  "Loan",
  "Vehicle",
  "Bill",
  "Family",
  "Inventory",
  "Custom",
];

export const REPEAT_OPTIONS: { value: RepeatOption; label: string }[] = [
  { value: "NONE", label: "Does not repeat" },
  { value: "WEEKLY", label: "Every week" },
  { value: "MONTHLY", label: "Every month" },
  { value: "YEARLY", label: "Every year" },
];

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "UPI", label: "UPI" },
  { value: "BANK", label: "Bank" },
  { value: "CARD", label: "Card" },
  { value: "OTHER", label: "Other" },
];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Cash",
  UPI: "UPI",
  BANK: "Bank",
  CARD: "Card",
  OTHER: "Other",
};

export const VEHICLE_TYPES: VehicleType[] = ["Tractor", "Car", "Bike", "Other"];

export const INVENTORY_CATEGORIES: InventoryCategory[] = [
  "Seeds",
  "Fertilizers",
  "Pesticides",
  "Farm Supplies",
  "Feed",
  "Other",
];

export const INVENTORY_SUBCATEGORIES: Record<string, string[]> = {
  Seeds: ["Crop seeds", "Hybrid seeds", "Vegetable seeds", "Other seeds"],
  Fertilizers: [
    "Urea",
    "DAP",
    "NPK",
    "Potash",
    "Organic fertilizer",
    "Compost",
    "Micronutrients",
    "Other",
  ],
  Pesticides: [
    "Insecticides",
    "Fungicides",
    "Herbicides",
    "Bio-pesticides",
    "Other crop protection",
  ],
  "Farm Supplies": [
    "Diesel",
    "Irrigation materials",
    "Pipes",
    "Drip equipment",
    "Sprayers",
    "Tools",
    "Other supplies",
  ],
  Feed: ["Cattle feed", "Fodder", "Mineral mixture", "Other feed"],
  Other: ["Packaging", "Tarpaulin", "General"],
};

export const INVENTORY_UNITS = [
  "kg",
  "g",
  "quintal",
  "tonne",
  "L",
  "mL",
  "bag",
  "packet",
  "piece",
  "unit",
  "bottle",
  "box",
] as const;

export const STOCK_ADJUSTMENT_TYPES: {
  value: StockAdjustmentType;
  label: string;
  description: string;
}[] = [
  { value: "OPENING", label: "Opening Stock", description: "Initial baseline stock" },
  { value: "CORRECTION", label: "Count Correction", description: "Physical verification count" },
  { value: "DAMAGED", label: "Damaged / Spoiled", description: "Water, pest, or transit damage" },
  { value: "EXPIRED", label: "Expired Stock", description: "Out-of-date chemical/seed" },
  { value: "RETURNED", label: "Returned Stock", description: "Returned from field or to vendor" },
  { value: "TRANSFER", label: "Location Transfer", description: "Moved to another godown/shed" },
];

export const SEASONS = ["Kharif", "Rabi", "Zaid", "Perennial"] as const;

export const ADD_RECORD_OPTIONS: {
  type: AddRecordType;
  label: string;
  description: string;
}[] = [
  { type: "INCOME", label: "Money In", description: "Crop sale, milk, salary" },
  { type: "HOME_EXPENSE", label: "Home Expense", description: "Grocery, bills, medical" },
  { type: "FARM_EXPENSE", label: "Farm Expense", description: "Seeds, fertilizer, fuel" },
  { type: "LABOUR", label: "Labour Payment", description: "Workers, rate and days" },
  { type: "VEHICLE_EXPENSE", label: "Vehicle Expense", description: "Fuel, service, repairs" },
  { type: "LOAN", label: "Loan", description: "Money borrowed" },
  { type: "LENDING", label: "Lending", description: "Money given to someone" },
  { type: "REMINDER", label: "Reminder", description: "A date you should not miss" },
  { type: "OPENING_BALANCE", label: "Opening Balance", description: "Initial cash in hand or bank balance" },
];

export const EXPENSE_GROUP_LABELS: Record<ExpenseGroup, string> = {
  HOME: "Home",
  FARM: "Farm",
  VEHICLE: "Vehicle",
  OTHER: "Other",
};

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const MAX_AMOUNT_PAISE = 999_999_999_999; // ₹99,99,99,99,999

export const RECOVERY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const REMINDER_CATEGORY_LABELS: Record<ReminderCategory, string> = {
  Crop: "Crop work",
  Labour: "Labour payment",
  Loan: "Loan payment",
  Vehicle: "Vehicle",
  Bill: "Bill",
  Family: "Family",
  Inventory: "Stock & Inventory",
  Custom: "Custom",
};

export const LOAN_BORROWED_CATEGORIES = [
  "Bank Loan",
  "Cooperative Society Loan",
  "Agricultural Loan",
  "Personal Loan",
  "Vehicle Loan",
  "Gold Loan",
  "Private Lender",
  "Family & Friends",
  "Other",
] as const;

export const LOAN_LENT_CATEGORIES = [
  "Friends",
  "Relatives",
  "Neighbours",
  "Farmers",
  "Customers",
  "Other",
] as const;

export const LOAN_PAYMENT_FREQUENCIES = [
  "MONTHLY",
  "QUARTERLY",
  "HALF_YEARLY",
  "YEARLY",
  "LUMP_SUM",
  "IRREGULAR",
] as const;

export const INTEREST_CALCULATION_METHODS = [
  "NONE",
  "SIMPLE",
  "COMPOUND",
  "FLAT",
] as const;

export const LOAN_STATUSES = [
  "ACTIVE",
  "COMPLETED",
  "OVERDUE",
  "CLOSED",
  "WRITTEN_OFF",
] as const;

