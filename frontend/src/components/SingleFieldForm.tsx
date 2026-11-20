import { useState, type SubmitEvent } from "react";

interface SingleFieldFormProps {
  id: string;
  label: string;
  buttonLabel: string;
  placeholder?: string;
  maxLength?: number;
  onSubmit: (value: string) => Promise<boolean>;
  submitting: boolean;
  error: string | null;
}

export function SingleFieldForm({
  id, label, buttonLabel, placeholder, maxLength, onSubmit, submitting, error,
}: SingleFieldFormProps) {
  const [value, setValue] = useState("");

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (await onSubmit(value.trim())) setValue("");
  };

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(e) => setValue(e.target.value)}
        required
      />
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={submitting || value.trim() === ""}>
        {buttonLabel}
      </button>
    </form>
  );
}