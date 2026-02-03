import { MapPin } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { useInpostGeowidget } from "@/hooks/useInpostGeowidget";
import content from "@/lib/content.json";

declare global {
  interface Window {
    __inpostPointSelected?: (point: unknown) => void;
  }
}

interface DeliveryPointPickerProps {
  value: string;
  onChange: (value: string) => void;
}

const { pointPicker } = content.checkout.delivery;

function normalizePointId(payload: unknown): string | null {
  if (!payload) return null;
  if (typeof payload === "string") return payload;

  const point = payload as Record<string, unknown>;
  const nestedPoint = (point.point as Record<string, unknown> | undefined) ?? undefined;

  const candidates = [
    point.name,
    point.id,
    point.pointId,
    nestedPoint?.name,
    nestedPoint?.id,
    nestedPoint?.pointId,
  ];

  const found = candidates.find((value) => typeof value === "string" && value.length > 0) as string | undefined;
  return found ?? null;
}

export const DeliveryPointPicker = ({ value, onChange }: DeliveryPointPickerProps) => {
  const { config, widgetReady, widgetFailed } = useInpostGeowidget();
  const widgetRef = useRef<HTMLElement | null>(null);
  const widgetConfig = useMemo(
    () =>
      JSON.stringify({
        country: "PL",
        points: { types: ["parcel_locker"] },
      }),
    [],
  );

  useEffect(() => {
    if (!widgetReady || !widgetRef.current) return;

    const handlePoint = (payload: unknown) => {
      const pointId = normalizePointId(payload);
      if (pointId) onChange(pointId.toUpperCase());
    };

    window.__inpostPointSelected = handlePoint;

    const current = widgetRef.current;
    const eventHandler = (event: Event) => {
      const customEvent = event as CustomEvent;
      handlePoint(customEvent.detail);
    };

    current.addEventListener("point", eventHandler as EventListener);
    current.addEventListener("select", eventHandler as EventListener);

    return () => {
      current.removeEventListener("point", eventHandler as EventListener);
      current.removeEventListener("select", eventHandler as EventListener);
      if (window.__inpostPointSelected === handlePoint) {
        delete window.__inpostPointSelected;
      }
    };
  }, [widgetReady, onChange]);

  const renderManualInput = () => (
    <div className="space-y-2">
      <label className="block text-sm text-white/70 mb-2" htmlFor="deliveryPoint">
        {pointPicker.manualLabel}
      </label>
      <input
        id="deliveryPoint"
        name="deliveryPoint"
        value={value}
        onChange={(event) => onChange(event.target.value.toUpperCase())}
        placeholder={pointPicker.manualPlaceholder}
        className="w-full rounded-md bg-[#0f2433] border border-white/20 text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#c9a24d]"
      />
      <p className="text-xs text-white/50">
        {widgetFailed ? pointPicker.manualFailure : pointPicker.manualFallback}
      </p>
    </div>
  );

  if (!config.enabled || !config.geowidgetToken || widgetFailed) {
    return (
      <div className="bg-[#1a3244]/60 rounded-lg border border-white/10 p-6">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          {pointPicker.title}
        </h3>
        {renderManualInput()}
      </div>
    );
  }

  return (
    <div className="bg-[#1a3244]/60 rounded-lg border border-white/10 p-6">
      <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
        <MapPin className="h-5 w-5" />
        {pointPicker.title}
      </h3>

      <div className="space-y-4">
        <div className="rounded-md border border-white/10 overflow-hidden bg-[#0f2433]">
          <inpost-geowidget
            ref={(element: HTMLElement | null) => {
              widgetRef.current = element;
            }}
            token={config.geowidgetToken}
            language="pl"
            className="block w-full h-[520px]"
            config={widgetConfig}
            onpoint="__inpostPointSelected"
          />
        </div>
        <div>
          <label className="block text-sm text-white/70 mb-2" htmlFor="deliveryPoint">
            {pointPicker.selectedLabel}
          </label>
          <input
            id="deliveryPoint"
            name="deliveryPoint"
            value={value}
            readOnly
            className="w-full rounded-md bg-[#0f2433] border border-white/20 text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#c9a24d]"
            placeholder={pointPicker.mapPlaceholder}
          />
        </div>
        {!widgetReady ? (
          <p className="text-xs text-white/60">{pointPicker.loading}</p>
        ) : null}
      </div>
    </div>
  );
};
