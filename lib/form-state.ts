export type FormActionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

export function invalid(field: string, message: string): FormActionState {
  return { fieldErrors: { [field]: message }, error: message };
}

export function invalidResult(
  fallbackField: string,
  result: { ok: false; error: string; field?: string },
): FormActionState {
  return invalid(result.field || fallbackField, result.error);
}

/** Maps company identity `name` onto signup (`companyName`) or create-company (`name`) fields. */
export function identityInvalid(
  result: { ok: false; error: string; field?: string },
  nameField = "name",
): FormActionState {
  const field = !result.field || result.field === "name" ? nameField : result.field;
  return invalid(field, result.error);
}
