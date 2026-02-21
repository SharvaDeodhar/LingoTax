"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { SUPPORTED_LANGUAGES } from "@/lib/constants";

interface LanguagePreferenceProps {
  userId: string;
  currentLanguage: string;
  onSaved?: () => void;
}

/**
 * Language is stored in profiles.preferred_language (NOT in questionnaires).
 */
export function LanguagePreference({
  userId,
  currentLanguage,
  onSaved,
}: LanguagePreferenceProps) {
  const [selected, setSelected] = useState(currentLanguage);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = getSupabaseBrowserClient();

  async function handleSave() {
    setLoading(true);
    setError(null);
    setSaved(false);

    const { error } = await supabase
      .from("profiles")
      .update({ preferred_language: selected })
      .eq("user_id", userId);

    if (error) {
      setError(error.message);
    } else {
      setSaved(true);
      onSaved?.();
    }
    setLoading(false);
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
        Preferred language
      </h3>
      <p className="text-xs text-muted-foreground">
        AI responses in the document chat will use this language by default.
      </p>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      {saved && (
        <p className="text-sm text-green-600">Language preference saved.</p>
      )}

      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.label}
          </option>
        ))}
      </select>

      <button
        onClick={handleSave}
        disabled={loading || selected === currentLanguage}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
