"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Save, ArrowLeft, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { saveEditedPdf } from "@/lib/api/fastapi";

interface FormField {
    name: string;
    type: "text" | "checkbox" | "dropdown" | "radio";
    value: string;
    options?: string[]; // for dropdowns
}

interface PdfFormEditorProps {
    pdfBytes: Uint8Array;
    documentId: string;
    onBack: () => void;
    onSaveComplete?: () => void;
}

export function PdfFormEditor({
    pdfBytes,
    documentId,
    onBack,
    onSaveComplete,
}: PdfFormEditorProps) {
    const [fields, setFields] = useState<FormField[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [noFields, setNoFields] = useState(false);
    const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
    const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Load form fields from PDF
    useEffect(() => {
        async function loadFields() {
            try {
                const pdfDoc = await PDFDocument.load(pdfBytes);
                const form = pdfDoc.getForm();
                const pdfFields = form.getFields();

                if (pdfFields.length === 0) {
                    setNoFields(true);
                    setLoading(false);
                    return;
                }

                const extracted: FormField[] = pdfFields.map((field) => {
                    const name = field.getName();
                    const typeName = field.constructor.name;

                    if (typeName === "PDFCheckBox") {
                        const checkbox = form.getCheckBox(name);
                        return {
                            name,
                            type: "checkbox" as const,
                            value: checkbox.isChecked() ? "true" : "false",
                        };
                    }

                    if (typeName === "PDFDropdown") {
                        const dropdown = form.getDropdown(name);
                        return {
                            name,
                            type: "dropdown" as const,
                            value: dropdown.getSelected()?.[0] ?? "",
                            options: dropdown.getOptions(),
                        };
                    }

                    if (typeName === "PDFRadioGroup") {
                        const radio = form.getRadioGroup(name);
                        return {
                            name,
                            type: "radio" as const,
                            value: radio.getSelected() ?? "",
                            options: radio.getOptions(),
                        };
                    }

                    // Default: text field
                    try {
                        const textField = form.getTextField(name);
                        return {
                            name,
                            type: "text" as const,
                            value: textField.getText() ?? "",
                        };
                    } catch {
                        return {
                            name,
                            type: "text" as const,
                            value: "",
                        };
                    }
                });

                setFields(extracted);
            } catch {
                setNoFields(true);
            } finally {
                setLoading(false);
            }
        }

        loadFields();
    }, [pdfBytes]);

    const updateField = useCallback((index: number, value: string) => {
        setFields((prev) =>
            prev.map((f, i) => (i === index ? { ...f, value } : f))
        );
        // Trigger auto-save after 5 seconds of inactivity
        if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current);
        }
        setAutoSaveStatus("idle");
        autoSaveTimerRef.current = setTimeout(() => {
            triggerAutoSave();
        }, 5000);
    }, []);

    const triggerAutoSave = useCallback(async () => {
        setAutoSaveStatus("saving");
        try {
            const { PDFDocument } = await import("pdf-lib");
            const pdfDoc = await PDFDocument.load(pdfBytes);
            const form = pdfDoc.getForm();

            // We need the current fields, so we read from the state ref
            const currentFields = fields;
            for (const field of currentFields) {
                try {
                    if (field.type === "text") {
                        const tf = form.getTextField(field.name);
                        tf.setText(field.value);
                    } else if (field.type === "checkbox") {
                        const cb = form.getCheckBox(field.name);
                        if (field.value === "true") cb.check();
                        else cb.uncheck();
                    } else if (field.type === "dropdown") {
                        const dd = form.getDropdown(field.name);
                        if (field.value) dd.select(field.value);
                    } else if (field.type === "radio") {
                        const rg = form.getRadioGroup(field.name);
                        if (field.value) rg.select(field.value);
                    }
                } catch {
                    // Skip fields that can't be set
                }
            }

            const modifiedBytes = await pdfDoc.save();
            await saveEditedPdf(documentId, modifiedBytes);
            setAutoSaveStatus("saved");
            setTimeout(() => setAutoSaveStatus("idle"), 3000);
        } catch (err) {
            console.error("Auto-save failed:", err);
            setAutoSaveStatus("idle");
        }
    }, [pdfBytes, fields, documentId]);

    const handleSave = useCallback(async () => {
        setSaving(true);
        setError(null);
        setSaveSuccess(false);

        try {
            const pdfDoc = await PDFDocument.load(pdfBytes);
            const form = pdfDoc.getForm();

            for (const field of fields) {
                try {
                    if (field.type === "text") {
                        const tf = form.getTextField(field.name);
                        tf.setText(field.value);
                    } else if (field.type === "checkbox") {
                        const cb = form.getCheckBox(field.name);
                        if (field.value === "true") cb.check();
                        else cb.uncheck();
                    } else if (field.type === "dropdown") {
                        const dd = form.getDropdown(field.name);
                        if (field.value) dd.select(field.value);
                    } else if (field.type === "radio") {
                        const rg = form.getRadioGroup(field.name);
                        if (field.value) rg.select(field.value);
                    }
                } catch {
                    // Skip fields that can't be set
                }
            }

            const modifiedBytes = await pdfDoc.save();
            await saveEditedPdf(documentId, modifiedBytes);
            setSaveSuccess(true);
            setTimeout(() => onSaveComplete?.(), 1500);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save PDF");
        } finally {
            setSaving(false);
        }
    }, [pdfBytes, fields, documentId, onSaveComplete]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin" />
                <p className="text-sm">Loading form fields…</p>
            </div>
        );
    }

    if (noFields) {
        return (
            <div className="flex flex-col h-full">
                <div className="flex items-center gap-2 px-4 py-3 border-b bg-white">
                    <button
                        onClick={onBack}
                        className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-medium">Edit Form</span>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
                    <AlertCircle className="w-8 h-8 text-amber-500" />
                    <p className="text-sm font-medium text-gray-700">
                        No fillable form fields detected
                    </p>
                    <p className="text-xs text-gray-500 max-w-[280px]">
                        This PDF doesn&apos;t appear to have editable form fields. Only
                        fillable PDFs (like official IRS forms) can be edited in-app.
                    </p>
                    <button
                        onClick={onBack}
                        className="mt-2 px-4 py-2 text-xs font-medium bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        Back to viewer
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-white shrink-0">
                <div className="flex items-center gap-2">
                    <button
                        onClick={onBack}
                        className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                        title="Back to viewer"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-medium">
                        Edit Form ({fields.length} field{fields.length !== 1 ? "s" : ""})
                    </span>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                >
                    {saving ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : saveSuccess ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                        <Save className="w-3.5 h-3.5" />
                    )}
                    {saving ? "Saving…" : saveSuccess ? "Saved!" : "Save PDF"}
                </button>

                {/* Auto-save status */}
                {autoSaveStatus === "saving" && (
                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Auto-saving…
                    </span>
                )}
                {autoSaveStatus === "saved" && (
                    <span className="text-[10px] text-green-500 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        All changes saved
                    </span>
                )}
            </div>

            {/* Error */}
            {error && (
                <div className="px-4 py-2 bg-red-50 border-b border-red-100 text-sm text-red-600">
                    {error}
                </div>
            )}

            {/* Success */}
            {saveSuccess && (
                <div className="px-4 py-2 bg-green-50 border-b border-green-100 text-sm text-green-600 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    PDF saved successfully! AI will re-process the updated document.
                </div>
            )}

            {/* Form Fields */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {fields.map((field, index) => (
                    <div key={field.name} className="bg-white rounded-lg border p-3">
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">
                            {field.name.replace(/_/g, " ").replace(/\[.*?\]/g, "")}
                        </label>

                        {field.type === "text" && (
                            <input
                                type="text"
                                value={field.value}
                                onChange={(e) => updateField(index, e.target.value)}
                                className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Enter value…"
                            />
                        )}

                        {field.type === "checkbox" && (
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={field.value === "true"}
                                    onChange={(e) =>
                                        updateField(index, e.target.checked ? "true" : "false")
                                    }
                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">Checked</span>
                            </label>
                        )}

                        {field.type === "dropdown" && (
                            <select
                                value={field.value}
                                onChange={(e) => updateField(index, e.target.value)}
                                className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            >
                                <option value="">Select…</option>
                                {field.options?.map((opt) => (
                                    <option key={opt} value={opt}>
                                        {opt}
                                    </option>
                                ))}
                            </select>
                        )}

                        {field.type === "radio" && (
                            <div className="space-y-1">
                                {field.options?.map((opt) => (
                                    <label
                                        key={opt}
                                        className="flex items-center gap-2 cursor-pointer"
                                    >
                                        <input
                                            type="radio"
                                            name={field.name}
                                            value={opt}
                                            checked={field.value === opt}
                                            onChange={() => updateField(index, opt)}
                                            className="w-4 h-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700">{opt}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
