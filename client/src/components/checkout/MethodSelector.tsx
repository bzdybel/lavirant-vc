import { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface MethodOption {
  id: string;
  [key: string]: unknown;
}

interface MethodSelectorProps<T extends MethodOption> {
  title: string;
  options: T[];
  selectedMethod: string;
  onMethodChange: (_value: string) => void;
  renderOption: (option: T, isSelected: boolean) => ReactNode;
  renderExpandedContent?: (option: T) => ReactNode;
}

export function MethodSelector<T extends MethodOption>({
  title,
  options,
  selectedMethod,
  onMethodChange,
  renderOption,
  renderExpandedContent,
}: MethodSelectorProps<T>) {
  return (
    <div className="bg-[#1a3244]/60 rounded-lg border border-white/10 p-6">
      <h3 className="text-xl font-semibold text-white mb-4">{title}</h3>

      <RadioGroup value={selectedMethod} onValueChange={onMethodChange}>
        <div className="space-y-3">
          {options.map((option) => {
            const isSelected = selectedMethod === option.id;

            return (
              <div key={option.id}>
                <Label
                  htmlFor={option.id}
                  className={`flex items-start space-x-3 rounded-lg border p-4 cursor-pointer transition-all ${
                    isSelected
                      ? "border-[#c9a24d] bg-[#c9a24d]/10"
                      : "border-white/20 hover:border-white/40"
                  }`}
                >
                  <RadioGroupItem value={option.id} id={option.id} className="mt-1" />
                  <div className="flex-1">
                    {renderOption(option, isSelected)}
                  </div>
                </Label>

                {isSelected && renderExpandedContent?.(option)}
              </div>
            );
          })}
        </div>
      </RadioGroup>
    </div>
  );
}
