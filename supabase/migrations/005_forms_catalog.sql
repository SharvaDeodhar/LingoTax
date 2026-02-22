-- forms_catalog: global reference of US tax forms
CREATE TABLE IF NOT EXISTS forms_catalog (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_code           TEXT NOT NULL UNIQUE,     -- 'W-2', '1099-NEC', 'Form 8843', etc.
  display_name        TEXT NOT NULL,
  description         TEXT,
  applicable_sources  TEXT[] NOT NULL DEFAULT '{}',  -- income_sources that trigger this form
  applicable_visas    TEXT[],                         -- NULL = all visas; ['F-1','OPT'] = gated
  applicable_residencies TEXT[],                      -- NULL = all; ['nonresident_alien'] = gated
  federal             BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed common US tax forms
INSERT INTO forms_catalog (form_code, display_name, description, applicable_sources, applicable_visas, applicable_residencies) VALUES
  ('W-2',         'Wage and Tax Statement',              'Reports wages paid and taxes withheld by employer',            ARRAY['w2'],                NULL,                     NULL),
  ('1099-NEC',    'Nonemployee Compensation',             'Reports freelance/self-employment income',                      ARRAY['1099_nec'],           NULL,                     NULL),
  ('1099-INT',    'Interest Income',                     'Reports interest earned from bank accounts',                   ARRAY['1099_int'],           NULL,                     NULL),
  ('1099-DIV',    'Dividends and Distributions',         'Reports dividends from investments',                            ARRAY['1099_div'],           NULL,                     NULL),
  ('1099-B',      'Proceeds from Broker Transactions',   'Reports stock/crypto sale proceeds',                            ARRAY['investments'],        NULL,                     NULL),
  ('1098-T',      'Tuition Statement',                   'Reports tuition paid for education credits',                    ARRAY['1098_t'],             NULL,                     NULL),
  ('1040',        'US Individual Income Tax Return',     'Main federal tax return for residents/citizens',                ARRAY[]::TEXT[],             NULL,                     ARRAY['citizen','permanent_resident','resident_alien','dual_status']),
  ('1040-NR',     'US Nonresident Alien Income Tax',     'Federal tax return for nonresident aliens',                     ARRAY[]::TEXT[],             NULL,                     ARRAY['nonresident_alien','dual_status']),
  ('Form 8843',   'Statement for Exempt Individuals',    'Required for F-1/J-1/OPT visa holders regardless of income',   ARRAY[]::TEXT[],             ARRAY['F-1','F-2','J-1','J-2','OPT','STEM OPT'], ARRAY['nonresident_alien']),
  ('Schedule C',  'Profit or Loss from Business',       'Self-employment income and expenses',                           ARRAY['1099_nec'],           NULL,                     NULL),
  ('Schedule D',  'Capital Gains and Losses',           'Investment gains/losses summary',                               ARRAY['investments'],        NULL,                     NULL),
  ('Schedule E',  'Supplemental Income and Loss',       'Rental income and losses',                                      ARRAY['rental'],             NULL,                     NULL)
ON CONFLICT (form_code) DO NOTHING;

-- user_form_checklist: per-user upcoming forms checklist
CREATE TABLE IF NOT EXISTS user_form_checklist (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  form_id     UUID NOT NULL REFERENCES forms_catalog(id) ON DELETE CASCADE,
  filing_year INT NOT NULL DEFAULT 2024,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'received', 'filed')
  ),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, form_id, filing_year)
);

CREATE INDEX IF NOT EXISTS idx_user_form_checklist_user ON user_form_checklist (user_id);

DROP TRIGGER IF EXISTS trg_user_form_checklist_updated ON user_form_checklist;
CREATE TRIGGER trg_user_form_checklist_updated
  BEFORE UPDATE ON user_form_checklist
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
