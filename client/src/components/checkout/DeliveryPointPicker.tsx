"use client";

import { MapPin } from "lucide-react";
import { useState } from "react";
import content from "@/lib/content.json";
import { useInpostGeowidget, InpostPointPayload } from "@/hooks/useInpostGeowidget";

interface DeliveryPointPickerProps {
  value: string;
  onChange: (value: string) => void;
}

const { pointPicker } = content.checkout.delivery;

export const DeliveryPointPicker = ({ value, onChange }: DeliveryPointPickerProps) => {
  const [selectedLabel, setSelectedLabel] = useState("");
  const [isMapOpen, setIsMapOpen] = useState(true);

  const { config, widgetFailed } = useInpostGeowidget((point: InpostPointPayload) => {
    const pointId = point?.name || point?.id || point?.pointId;
    if (pointId) {
      onChange(pointId.toUpperCase());
      setIsMapOpen(false);
    }

    const label = [
      point?.name,
      point?.address_details?.street,
      point?.address_details?.city,
    ]
      .filter(Boolean)
      .join(" • ");

    setSelectedLabel(label);
  });

  if (!config.enabled || !config.geowidgetToken || widgetFailed) {
    return (
      <div className="rounded-2xl p-6 border border-white/10 bg-[#132838]">
        <h3 className="text-xl text-white flex gap-2 mb-4">
          <MapPin className="h-5 w-5" />
          {pointPicker.title}
        </h3>

        <input
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          placeholder={pointPicker.manualPlaceholder}
          className="w-full rounded-md bg-[#0b1f2d] border border-white/15 px-4 py-2 text-white"
        />

        <p className="text-xs text-white/50 mt-2">
          {pointPicker.manualFallback}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-6 border border-white/10 bg-[#132838]">
      <h3 className="text-xl text-white flex gap-2 mb-4">
        <MapPin className="h-5 w-5" />
        {pointPicker.title}
      </h3>

      {isMapOpen ? (
        <div className="h-[800px] rounded-xl overflow-hidden border border-white/10">
          <inpost-geowidget
            token={config.geowidgetToken}
            language="pl"
            config="parcelCollect"
            onpoint="afterInpostPointSelected"
            style={{ width: "100%", height: "100%", display: "block" }}
          />
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-[#0b1f2d] p-4">
          <p className="text-sm text-white/60 mb-1">
            Wybrany paczkomat:
          </p>
          <p className="text-white font-medium">
            {selectedLabel}
          </p>

          <button
            type="button"
            onClick={() => setIsMapOpen(true)}
            className="mt-3 text-sm text-[#c9a24d] hover:underline"
          >
            Zmień paczkomat
          </button>
        </div>
      )}

      <input
        value={value}
        readOnly
        className="mt-4 w-full rounded-md bg-[#0b1f2d] border border-white/15 px-4 py-2 text-white"
        placeholder={pointPicker.mapPlaceholder}
      />
    </div>
  );
};
