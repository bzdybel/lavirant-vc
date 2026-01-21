import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FormFieldProps {
  id: string;
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  readOnly?: boolean;
  defaultValue?: string;
  onChange?: (_event: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}

export const FormField = ({
  id,
  name,
  label,
  type = "text",
  placeholder,
  maxLength,
  disabled,
  readOnly,
  defaultValue = "",
  onChange,
  className
}: FormFieldProps) => (
  <div className="space-y-2">
    <Label htmlFor={id} className="text-white">{label} *</Label>
    <Input
      id={id}
      name={name}
      type={type}
      defaultValue={defaultValue}
      onChange={onChange}
      className={className || "bg-[#0f2433] border-white/20 text-white"}
      placeholder={placeholder}
      maxLength={maxLength}
      disabled={disabled}
      readOnly={readOnly}
      required
    />
  </div>
);
