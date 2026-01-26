import { MapPin } from "lucide-react";

const MOCK_POINTS = [
  { id: "WAW123", label: "WAW123 – Warszawa" },
  { id: "KRK456", label: "KRK456 – Kraków" },
  { id: "GDA789", label: "GDA789 – Gdańsk" },
];

interface DeliveryPointPickerProps {
  value: string;
  onChange: (value: string) => void;
}

export const DeliveryPointPicker = ({ value, onChange }: DeliveryPointPickerProps) => (
  <div className="bg-[#1a3244]/60 rounded-lg border border-white/10 p-6">
    <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
      <MapPin className="h-5 w-5" />
      Wybierz paczkomat InPost
    </h3>
    <label className="block text-sm text-white/70 mb-2" htmlFor="deliveryPoint">
      Numer paczkomatu
    </label>
    <input
      id="deliveryPoint"
      name="deliveryPoint"
      list="deliveryPointOptions"
      value={value}
      onChange={(event) => onChange(event.target.value.toUpperCase())}
      placeholder="np. WAW123"
      className="w-full rounded-md bg-[#0f2433] border border-white/20 text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#c9a24d]"
    />
    <datalist id="deliveryPointOptions">
      {MOCK_POINTS.map((point) => (
        <option key={point.id} value={point.id}>
          {point.label}
        </option>
      ))}
    </datalist>
    <p className="text-xs text-white/50 mt-2">
      Wpisz kod paczkomatu lub wybierz z listy sugerowanych punktów.
    </p>
  </div>
);
