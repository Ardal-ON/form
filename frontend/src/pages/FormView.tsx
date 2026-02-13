import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { FormSchema } from "../types";

type Props = {
  schema: FormSchema | null;
  values: Record<string, string | null>;
  onSubmit: (values: Record<string, string | null>) => Promise<void>;
  readOnly?: boolean;
  headerContent?: ReactNode;
};

export default function FormView({ schema, values, onSubmit, headerContent }: Props) {
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Record<string, string | null>>(values);

  useEffect(() => {
    setDraft(values);
  }, [values, schema?.role]);

  if (!schema) {
    return (
      <div className="card">
        {headerContent}
        <p>No form available.</p>
      </div>
    );
  }

  const updateField = (name: string, value: string | null) => {
    setDraft((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    await onSubmit(draft);
    setSaving(false);
  };

  return (
    <div className="card">
      {headerContent}
      <h3>{schema.form_name}</h3>
      <form onSubmit={handleSubmit}>
        {schema.fields.map((field) => {
          const fieldValue = draft[field.name] ?? "";
          if (field.type === "textarea") {
            return (
              <div className="field" key={field.name}>
                <label>{field.label}</label>
                <textarea
                  rows={3}
                  value={fieldValue}
                  onChange={(event) => updateField(field.name, event.target.value)}
                />
              </div>
            );
          }
          if (field.type === "select") {
            return (
              <div className="field" key={field.name}>
                <label>{field.label}</label>
                <select
                  value={fieldValue}
                  onChange={(event) => updateField(field.name, event.target.value)}
                >
                  <option value="">Select...</option>
                  {field.options?.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            );
          }
          const inputType = field.type === "number" ? "number" : "text";
          return (
            <div className="field" key={field.name}>
              <label>{field.label}</label>
              <input
                type={inputType}
                value={fieldValue}
                onChange={(event) => updateField(field.name, event.target.value)}
              />
            </div>
          );
        })}
        <button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </button>
      </form>
    </div>
  );
}
