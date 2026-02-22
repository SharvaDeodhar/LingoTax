-- ─── Migration 012: Questionnaire V2 ─────────────────────────────────────────
-- Extends the questionnaires table with all new sections (A–I) and creates
-- subsidiary tables for repeatable data (dependents, immigration history,
-- state residency with date ranges, and D5 per-source income follow-ups).
--
-- Design notes:
--   • All new string-enum columns use TEXT (not Postgres ENUM) so values can
--     be extended without destructive ALTER TYPE.
--   • 'yes' / 'no' / 'not_sure' are the standard tri-state values.
--   • Existing columns (filing_year, filing_status, residency_status, visa_type,
--     has_ssn, has_itin, num_dependents, states_lived, states_worked,
--     income_sources, notes) are KEPT for backward-compatibility with the
--     recommendations engine in tasks.py.
--   • New columns are all nullable (no defaults) so partial saves work.

-- ─── Section A — Basic Identity & Filing Setup ────────────────────────────────
ALTER TABLE questionnaires
  ADD COLUMN IF NOT EXISTS country_of_residence    TEXT,          -- 'US' or free text
  ADD COLUMN IF NOT EXISTS multi_state_lived        TEXT,          -- 'yes'|'no'|'not_sure'
  ADD COLUMN IF NOT EXISTS age_on_dec31             INT,
  ADD COLUMN IF NOT EXISTS ssn_status               TEXT,          -- 'yes'|'no'|'applied_waiting'|'prefer_not_to_say'
  ADD COLUMN IF NOT EXISTS itin_status              TEXT,          -- 'yes'|'no'|'applied_waiting'|'not_sure'
  ADD COLUMN IF NOT EXISTS filing_for               TEXT;          -- 'self'|'self_spouse'|'self_dependents'|'self_spouse_dependents'|'not_sure'

-- ─── Section B — Immigration / Residency ──────────────────────────────────────
ALTER TABLE questionnaires
  ADD COLUMN IF NOT EXISTS is_us_citizen            TEXT,          -- 'yes'|'no'
  ADD COLUMN IF NOT EXISTS is_permanent_resident    TEXT,          -- 'yes'|'no'|'not_sure'
  ADD COLUMN IF NOT EXISTS immigration_statuses     TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS immigration_status_other TEXT,
  ADD COLUMN IF NOT EXISTS status_changed           TEXT,          -- 'yes'|'no'|'not_sure'
  ADD COLUMN IF NOT EXISTS first_entry_date         TEXT,          -- stored as text (approximate)
  ADD COLUMN IF NOT EXISTS us_days_current_type     TEXT,          -- 'exact'|'estimate'|'not_sure'
  ADD COLUMN IF NOT EXISTS us_days_current          INT,
  ADD COLUMN IF NOT EXISTS us_days_year_minus1      INT,
  ADD COLUMN IF NOT EXISTS us_days_year_minus2      INT,
  ADD COLUMN IF NOT EXISTS us_days_prior_not_sure   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_exempt_individual     TEXT,          -- 'yes'|'no'|'not_sure'
  ADD COLUMN IF NOT EXISTS received_scholarship     TEXT,          -- 'yes'|'no'|'not_sure'
  ADD COLUMN IF NOT EXISTS received_school_tax_forms TEXT;         -- 'yes'|'no'|'not_sure'

-- ─── Section C — Filing Status & Family ───────────────────────────────────────
ALTER TABLE questionnaires
  ADD COLUMN IF NOT EXISTS marital_status           TEXT,          -- 'single'|'married'|'separated'|'divorced'|'widowed'|'not_sure'
  ADD COLUMN IF NOT EXISTS spouse_location          TEXT,          -- 'us'|'outside_us'|'part_year'|'not_sure'
  ADD COLUMN IF NOT EXISTS spouse_id_type           TEXT,          -- 'ssn'|'itin'|'no'|'applied_waiting'|'not_sure'
  ADD COLUMN IF NOT EXISTS has_dependents           TEXT;          -- 'yes'|'no'|'not_sure'

-- ─── Section D — Employment & Income ──────────────────────────────────────────
ALTER TABLE questionnaires
  ADD COLUMN IF NOT EXISTS employee_wages           TEXT,          -- 'yes'|'no'|'not_sure'
  ADD COLUMN IF NOT EXISTS received_w2              TEXT,          -- 'yes'|'no'|'not_sure'|'lost'
  ADD COLUMN IF NOT EXISTS num_employers            TEXT,          -- '1'|'2_3'|'4_plus'|'not_sure'
  ADD COLUMN IF NOT EXISTS worked_multi_state       TEXT,          -- 'yes'|'no'|'not_sure'
  ADD COLUMN IF NOT EXISTS freelance_income         TEXT,          -- 'yes'|'no'|'not_sure'
  ADD COLUMN IF NOT EXISTS received_1099            TEXT,          -- 'yes'|'no'|'not_sure'
  ADD COLUMN IF NOT EXISTS has_business_expenses    TEXT,          -- 'yes'|'no'|'not_sure'
  ADD COLUMN IF NOT EXISTS used_car_for_work        BOOLEAN,
  ADD COLUMN IF NOT EXISTS earned_bank_interest     TEXT,          -- 'yes'|'no'|'not_sure'
  ADD COLUMN IF NOT EXISTS has_investments          TEXT,          -- 'yes'|'no'|'not_sure'
  ADD COLUMN IF NOT EXISTS sold_investments         TEXT,          -- 'yes'|'no'|'not_sure'
  ADD COLUMN IF NOT EXISTS received_broker_forms    TEXT,          -- 'yes'|'no'|'not_sure'
  ADD COLUMN IF NOT EXISTS was_student              TEXT,          -- 'yes'|'no'
  ADD COLUMN IF NOT EXISTS paid_tuition             TEXT,          -- 'yes'|'no'|'not_sure'
  ADD COLUMN IF NOT EXISTS received_1098t           TEXT,          -- 'yes'|'no'|'not_sure'
  ADD COLUMN IF NOT EXISTS taxable_scholarship_inc  TEXT;          -- 'yes'|'no'|'not_sure'

-- ─── Section E — Foreign Assets / International ───────────────────────────────
ALTER TABLE questionnaires
  ADD COLUMN IF NOT EXISTS foreign_bank_accounts    TEXT,          -- 'yes'|'no'|'not_sure'
  ADD COLUMN IF NOT EXISTS multi_country_accounts   BOOLEAN,
  ADD COLUMN IF NOT EXISTS foreign_accounts_value   TEXT,          -- 'yes'|'no'|'not_sure'|'dont_know'
  ADD COLUMN IF NOT EXISTS foreign_income           TEXT,          -- 'yes'|'no'|'not_sure'
  ADD COLUMN IF NOT EXISTS owns_foreign_company     TEXT,          -- 'yes'|'no'|'not_sure'
  ADD COLUMN IF NOT EXISTS received_foreign_family_money TEXT,     -- 'yes'|'no'|'not_sure'
  ADD COLUMN IF NOT EXISTS foreign_family_money_type TEXT,         -- 'gift'|'income'|'support'
  ADD COLUMN IF NOT EXISTS paid_foreign_taxes       TEXT,          -- 'yes'|'no'|'not_sure'
  ADD COLUMN IF NOT EXISTS filing_foreign_taxes     TEXT;          -- 'yes'|'no'|'not_sure'

-- ─── Section F — Health Coverage / Life Events ────────────────────────────────
ALTER TABLE questionnaires
  ADD COLUMN IF NOT EXISTS health_coverage          TEXT,          -- 'all_year'|'part_year'|'no'|'not_sure'
  ADD COLUMN IF NOT EXISTS marketplace_insurance    TEXT,          -- 'yes'|'no'|'not_sure'
  ADD COLUMN IF NOT EXISTS received_1095a           TEXT,          -- 'yes'|'no'|'not_sure'
  ADD COLUMN IF NOT EXISTS life_events              TEXT[] NOT NULL DEFAULT '{}';

-- ─── Section G — Potential Deductions / Credits ───────────────────────────────
ALTER TABLE questionnaires
  ADD COLUMN IF NOT EXISTS deduct_tuition_fees      TEXT,
  ADD COLUMN IF NOT EXISTS deduct_student_loan_int  TEXT,
  ADD COLUMN IF NOT EXISTS claimed_as_dependent     TEXT,
  ADD COLUMN IF NOT EXISTS paid_childcare           TEXT,
  ADD COLUMN IF NOT EXISTS bought_work_supplies     TEXT,
  ADD COLUMN IF NOT EXISTS paid_biz_comms           TEXT,
  ADD COLUMN IF NOT EXISTS has_home_office          TEXT,
  ADD COLUMN IF NOT EXISTS paid_rent                TEXT,
  ADD COLUMN IF NOT EXISTS paid_mortgage            TEXT,
  ADD COLUMN IF NOT EXISTS made_donations           TEXT,
  ADD COLUMN IF NOT EXISTS paid_state_local_taxes   TEXT,
  ADD COLUMN IF NOT EXISTS contributed_hsa          TEXT,
  ADD COLUMN IF NOT EXISTS withdrew_hsa             TEXT,
  ADD COLUMN IF NOT EXISTS large_medical_expenses   TEXT,
  ADD COLUMN IF NOT EXISTS contributed_ira          TEXT;

-- ─── Section H — Document Inventory ───────────────────────────────────────────
ALTER TABLE questionnaires
  ADD COLUMN IF NOT EXISTS owned_documents          TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS waiting_for_forms        TEXT,          -- 'yes'|'no'|'not_sure'
  ADD COLUMN IF NOT EXISTS lost_forms               TEXT,          -- 'yes'|'no'
  ADD COLUMN IF NOT EXISTS can_contact_issuer       TEXT;          -- 'yes'|'no'|'not_sure'

-- ─── Section I — Prior Filing History ─────────────────────────────────────────
ALTER TABLE questionnaires
  ADD COLUMN IF NOT EXISTS filed_us_taxes           TEXT,          -- 'yes'|'no'|'not_sure'
  ADD COLUMN IF NOT EXISTS first_filed_year         INT,
  ADD COLUMN IF NOT EXISTS has_prior_return         TEXT,          -- 'yes'|'no'|'not_sure'
  ADD COLUMN IF NOT EXISTS prior_filing_type        TEXT,          -- 'resident'|'nonresident'|'not_sure'|'dont_know'
  ADD COLUMN IF NOT EXISTS received_irs_letter      TEXT;          -- 'yes'|'no'|'not_sure'

-- ─── Questionnaire version ─────────────────────────────────────────────────────
ALTER TABLE questionnaires
  ADD COLUMN IF NOT EXISTS questionnaire_version    INT NOT NULL DEFAULT 1;

-- Mark existing rows as version 1
UPDATE questionnaires SET questionnaire_version = 1 WHERE questionnaire_version = 1;

-- ─── Subsidiary table: dependents ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS questionnaire_dependents (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id          UUID NOT NULL REFERENCES questionnaires(id) ON DELETE CASCADE,
  user_id                   UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,

  full_name                 TEXT,
  relationship              TEXT,          -- 'child'|'parent'|'sibling'|'other' + free text
  date_of_birth             TEXT,          -- stored as text (YYYY-MM-DD or approximate)
  months_lived_with         INT,           -- 0–12
  id_type                   TEXT,          -- 'ssn'|'itin'|'no'|'applied_waiting'|'not_sure'
  is_full_time_student      BOOLEAN,
  provided_over_half_support BOOLEAN,
  residence                 TEXT,          -- 'us'|'outside_us'|'both'

  sort_order                INT NOT NULL DEFAULT 0,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_q_dependents_q_id  ON questionnaire_dependents (questionnaire_id);
CREATE INDEX IF NOT EXISTS idx_q_dependents_user  ON questionnaire_dependents (user_id);

-- ─── Subsidiary table: immigration status change history ──────────────────────
CREATE TABLE IF NOT EXISTS questionnaire_immigration_history (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id  UUID NOT NULL REFERENCES questionnaires(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,

  from_status       TEXT NOT NULL,
  to_status         TEXT NOT NULL,
  effective_date    TEXT,                  -- approximate, stored as text

  sort_order        INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_q_imm_history_q_id ON questionnaire_immigration_history (questionnaire_id);

-- ─── Subsidiary table: state residency with date ranges ───────────────────────
CREATE TABLE IF NOT EXISTS questionnaire_state_residency (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id  UUID NOT NULL REFERENCES questionnaires(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,

  state_code        TEXT NOT NULL,         -- 'CA', 'NY', etc.
  date_from         TEXT,                  -- YYYY-MM-DD or approximate
  date_to           TEXT,                  -- null = still residing

  sort_order        INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_q_state_res_q_id ON questionnaire_state_residency (questionnaire_id);

-- ─── Subsidiary table: D5 per-income-source follow-ups ───────────────────────
CREATE TABLE IF NOT EXISTS questionnaire_d5_income (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id  UUID NOT NULL REFERENCES questionnaires(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,

  income_source     TEXT NOT NULL,         -- 'unemployment'|'rental'|'crypto' etc.
  flag              TEXT,                  -- 'yes'|'no'|'not_sure'
  approximate_amount NUMERIC,
  country_source    TEXT,
  received_document TEXT,                  -- 'yes'|'no'|'not_sure'
  document_name     TEXT,
  can_upload        TEXT,                  -- 'yes'|'no'|'later'

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (questionnaire_id, income_source)
);

CREATE INDEX IF NOT EXISTS idx_q_d5_q_id ON questionnaire_d5_income (questionnaire_id);

-- ─── RLS for new subsidiary tables ────────────────────────────────────────────
ALTER TABLE questionnaire_dependents          ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaire_immigration_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaire_state_residency     ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaire_d5_income           ENABLE ROW LEVEL SECURITY;

CREATE POLICY "q_dependents_all_own" ON questionnaire_dependents
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "q_imm_history_all_own" ON questionnaire_immigration_history
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "q_state_res_all_own" ON questionnaire_state_residency
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "q_d5_all_own" ON questionnaire_d5_income
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
