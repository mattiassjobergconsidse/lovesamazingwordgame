import { useId, useState } from "react";
import type {
  FieldError,
  SetFieldErrors,
  SetFields,
} from "../../core/setValidation";
import { useI18n, type MessageKey } from "../../i18n";

interface SetFieldsFormProps {
  readonly values: SetFields;
  readonly errors: SetFieldErrors;
  /** Show every error, e.g. after a submit attempt; otherwise only fields the user has left. */
  readonly showAllErrors?: boolean;
  readonly onChange: (values: SetFields) => void;
}

const ERROR_KEYS: Readonly<Record<FieldError, MessageKey>> = {
  required: "sets.error.required",
  tooLong: "sets.error.tooLong",
  duplicate: "sets.error.duplicate",
};

const FIELDS = [
  { name: "name", label: "sets.field.name" },
  { name: "langA", label: "sets.field.langA" },
  { name: "langB", label: "sets.field.langB" },
] as const satisfies readonly { name: keyof SetFields; label: MessageKey }[];

/** The three text fields of a set (name and both language labels) with inline errors (FR-SET-1). */
export function SetFieldsForm({
  values,
  errors,
  showAllErrors = false,
  onChange,
}: SetFieldsFormProps) {
  const { t } = useI18n();
  const idPrefix = useId();
  const [touched, setTouched] = useState<ReadonlySet<keyof SetFields>>(
    new Set(),
  );

  return (
    <>
      {FIELDS.map(({ name, label }) => {
        const error = errors[name];
        const visibleError =
          error !== undefined && (showAllErrors || touched.has(name))
            ? error
            : undefined;
        const inputId = `${idPrefix}-${name}`;
        const errorId = `${inputId}-error`;
        return (
          <div className="field" key={name}>
            <label htmlFor={inputId} className="field-label">
              {t(label)}
            </label>
            <input
              id={inputId}
              className="text-input"
              value={values[name]}
              placeholder={t(label)}
              aria-invalid={visibleError !== undefined}
              aria-describedby={
                visibleError === undefined ? undefined : errorId
              }
              onChange={(event) => {
                onChange({ ...values, [name]: event.target.value });
              }}
              onBlur={() => {
                setTouched((previous) => new Set(previous).add(name));
              }}
            />
            {visibleError !== undefined && (
              <p id={errorId} className="field-error">
                {t(ERROR_KEYS[visibleError])}
              </p>
            )}
          </div>
        );
      })}
    </>
  );
}
