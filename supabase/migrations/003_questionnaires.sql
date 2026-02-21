-- questionnaires: tax context per user per filing year
-- NOTE: No preferred_language here — it lives in profiles.preferred_language
CREATE TABLE IF NOT EXISTS questionnaires (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,

  filing_year       INT NOT NULL DEFAULT 2024,

  filing_status     TEXT CHECK (
    filing_status IN (
      'single',
      'married_filing_jointly',
      'married_filing_separately',
      'head_of_household',
      'qualifying_widow'
    )
  ),

  residency_status  TEXT CHECK (
    residency_status IN (
      'citizen',
      'permanent_resident',
      'resident_alien',
      'nonresident_alien',
      'dual_status',
      'unsure'
    )
  ),

  visa_type         TEXT,                  -- F-1, H-1B, OPT, L-1, etc. Nullable.

  has_ssn           BOOLEAN,
  has_itin          BOOLEAN,
  num_dependents    INT NOT NULL DEFAULT 0,

  states_lived      TEXT[] NOT NULL DEFAULT '{}',   -- e.g. ['CA', 'NY']
  states_worked     TEXT[] NOT NULL DEFAULT '{}',

  -- income_sources matches INCOME_SOURCES constant in frontend
  income_sources    TEXT[] NOT NULL DEFAULT '{}',   -- ['w2', '1099_nec', '1098_t', etc.]

  notes             TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, filing_year)
);

DROP TRIGGER IF EXISTS trg_questionnaires_updated ON questionnaires;
CREATE TRIGGER trg_questionnaires_updated
  BEFORE UPDATE ON questionnaires
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
