// ─── Supported display languages ──────────────────────────────────────────────
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

// ─── Filing year ──────────────────────────────────────────────────────────────
export const CURRENT_FILING_YEAR = 2024;

// ─── Income sources (legacy — used by forms_catalog and tasks.py) ─────────────
export const INCOME_SOURCES = [
  { value: "w2",          label: "W-2 (Employee wages)" },
  { value: "1099_nec",    label: "1099-NEC (Self-employment / freelance)" },
  { value: "1099_int",    label: "1099-INT (Bank interest)" },
  { value: "1099_div",    label: "1099-DIV (Dividends)" },
  { value: "investments", label: "Investment sales (stocks, crypto, ETFs)" },
  { value: "1098_t",      label: "1098-T (Tuition / Education)" },
  { value: "rental",      label: "Rental income" },
] as const;

// ─── Section B — Immigration statuses (multi-select) ──────────────────────────
export const IMMIGRATION_STATUSES = [
  { value: "F-1/F-2",        label: "F-1 / F-2 (Student)" },
  { value: "J-1/J-2",        label: "J-1 / J-2 (Exchange visitor)" },
  { value: "H-1B/H-4",       label: "H-1B / H-4 (Specialty occupation)" },
  { value: "L-1/L-2",        label: "L-1 / L-2 (Intracompany transfer)" },
  { value: "O-visa",          label: "O visa (Extraordinary ability)" },
  { value: "TN",              label: "TN (NAFTA/CUSMA professional)" },
  { value: "Asylee/Refugee",  label: "Asylee / Refugee" },
  { value: "TPS",             label: "TPS (Temporary Protected Status)" },
  { value: "DACA",            label: "DACA" },
  { value: "Other-work-visa", label: "Other work visa" },
  { value: "No-visa",         label: "No visa / undocumented" },
  { value: "Other",           label: "Other" },
  { value: "Prefer-not",      label: "Prefer not to say" },
] as const;

// ─── Section D5 — Other income source items ───────────────────────────────────
export const D5_INCOME_SOURCES = [
  { value: "unemployment",     label: "Unemployment benefits" },
  { value: "state_tax_refund", label: "State tax refund" },
  { value: "retirement",       label: "Retirement / pension distributions" },
  { value: "social_security",  label: "Social Security benefits" },
  { value: "alimony",          label: "Alimony received" },
  { value: "rental",           label: "Rental income" },
  { value: "royalties",        label: "Royalties" },
  { value: "gambling",         label: "Gambling winnings" },
  { value: "prize_award",      label: "Prize / award income" },
  { value: "foreign_income",   label: "Foreign income earned outside the U.S." },
  { value: "foreign_pension",  label: "Foreign pension" },
  { value: "child_support",    label: "Child support (received)" },
  { value: "cash_gifts",       label: "Cash gifts received" },
  { value: "crypto",           label: "Cryptocurrency transactions" },
  { value: "property_sale",    label: "Sale of property / home" },
] as const;

// ─── Section F — Life events (multi-select) ───────────────────────────────────
export const LIFE_EVENTS = [
  { value: "moved_to_us",        label: "Moved to the U.S." },
  { value: "moved_from_us",      label: "Moved out of the U.S." },
  { value: "married",            label: "Married" },
  { value: "divorced",           label: "Divorced" },
  { value: "had_child",          label: "Had a child" },
  { value: "adopted_child",      label: "Adopted a child" },
  { value: "started_school",     label: "Started school" },
  { value: "graduated",          label: "Graduated" },
  { value: "changed_visa",       label: "Changed visa status" },
  { value: "lost_job",           label: "Lost job" },
  { value: "started_business",   label: "Started business" },
  { value: "bought_home",        label: "Bought home" },
  { value: "sold_home",          label: "Sold home" },
  { value: "none",               label: "None of these" },
] as const;

// ─── Section H — Document types (multi-select) ────────────────────────────────
export const DOCUMENT_TYPES = [
  { value: "W-2",              label: "Wage statement from employer (W-2)" },
  { value: "1099-NEC/K/MISC",  label: "Contractor/gig income form (1099-NEC / 1099-K / 1099-MISC)" },
  { value: "1099-INT",         label: "Bank interest form (1099-INT)" },
  { value: "1099-DIV",         label: "Investment/dividend form (1099-DIV)" },
  { value: "1099-B",           label: "Brokerage sales form (1099-B)" },
  { value: "1098-T",           label: "Tuition statement (1098-T)" },
  { value: "1098",             label: "Mortgage interest statement (1098)" },
  { value: "1098-E",           label: "Student loan interest statement (1098-E)" },
  { value: "1095-A",           label: "Health insurance marketplace form (1095-A)" },
  { value: "scholarship-stmt", label: "Scholarship / fellowship statement" },
  { value: "prior-return",     label: "Prior year tax return" },
  { value: "irs-letter",       label: "IRS letter / state tax letter" },
  { value: "pay-stubs",        label: "Pay stubs" },
  { value: "immigration-docs", label: "Passport / visa / I-94 / immigration documents" },
  { value: "ssn-itin-card",    label: "SSN / ITIN letter or card" },
  { value: "none-yet",         label: "None yet" },
  { value: "not-sure-what",    label: "I'm not sure what I have" },
] as const;

// ─── Visa types (legacy — used in ResidencyStep and tasks.py) ─────────────────
export const VISA_TYPES = [
  "F-1", "F-2", "J-1", "J-2", "H-1B", "H-4", "OPT", "STEM OPT",
  "L-1", "L-2", "O-1", "TN", "E-3", "B-1/B-2", "Other",
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

// ─── Task statuses ────────────────────────────────────────────────────────────
export const TASK_STATUS_LABELS = {
  not_started: "Not started",
  in_progress: "In progress",
  done: "Done",
} as const;

export const TASK_GROUP_NAMES = ["Personal", "Tax Forms", "Work Forms", "Other"] as const;
