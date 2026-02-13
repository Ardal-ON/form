export type User = {
  id: number;
  username: string;
  roles: string[];
  is_admin: boolean;
};

export type FormField = {
  name: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
};

export type FormSchema = {
  form_name: string;
  role: string;
  fields: FormField[];
};

export type AuditLog = {
  id: number;
  form_name: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_at: string;
  changed_by: number | null;
  changed_by_name?: string | null;
};

export type LdxFileInfo = {
  name: string;
  size: number;
  modified_at: string;
};
