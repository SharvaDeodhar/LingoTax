// ─── Supported display languages ──────────────────────────────────────────────
// BCP-47 code + display name shown in LanguageSelector
export const SUPPORTED_LANGUAGES = [
  { code: "en",      label: "English" },
  { code: "es",      label: "Español" },
  { code: "zh-Hans", label: "中文 (简体)" },
  { code: "zh-Hant", label: "中文 (繁體)" },
  { code: "hi",      label: "हिन्दी" },
  { code: "ko",      label: "한국어" },
  { code: "vi",      label: "Tiếng Việt" },
  { code: "pt",      label: "Português" },
  { code: "ar",      label: "العربية" },
  { code: "tl",      label: "Filipino" },
  { code: "bn",      label: "বাংলা" },
  { code: "gu",      label: "ગુજરાતી" },
  { code: "ta",      label: "தமிழ்" },
  { code: "te",      label: "తెలుగు" },
  { code: "ur",      label: "اردو" },
  { code: "ja",      label: "日本語" },
  { code: "fr",      label: "Français" },
  { code: "de",      label: "Deutsch" },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

// ─── Income sources ───────────────────────────────────────────────────────────
// value must match forms_catalog.applicable_sources and questionnaires.income_sources
export const INCOME_SOURCES = [
  { value: "w2",          label: "W-2 (Employee wages)" },
  { value: "1099_nec",    label: "1099-NEC (Self-employment / freelance)" },
  { value: "1099_int",    label: "1099-INT (Bank interest)" },
  { value: "1099_div",    label: "1099-DIV (Dividends)" },
  { value: "investments", label: "Investment sales (stocks, crypto, ETFs)" },
  { value: "1098_t",      label: "1098-T (Tuition / Education)" },
  { value: "rental",      label: "Rental income" },
] as const;

// ─── Visa types ───────────────────────────────────────────────────────────────
export const VISA_TYPES = [
  "F-1",
  "F-2",
  "J-1",
  "J-2",
  "H-1B",
  "H-4",
  "OPT",
  "STEM OPT",
  "L-1",
  "L-2",
  "O-1",
  "TN",
  "E-3",
  "B-1/B-2",
  "Other",
] as const;

// ─── US States ────────────────────────────────────────────────────────────────
export const US_STATES = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DC", name: "District of Columbia" },
  { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
] as const;

// ─── Filing year ──────────────────────────────────────────────────────────────
export const CURRENT_FILING_YEAR = 2024;

// ─── Task statuses ────────────────────────────────────────────────────────────
export const TASK_STATUS_LABELS = {
  not_started: "Not started",
  in_progress: "In progress",
  done: "Done",
} as const;

export const TASK_GROUP_NAMES = ["Personal", "Tax Forms", "Work Forms", "Other"] as const;
