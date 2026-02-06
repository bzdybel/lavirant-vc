import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

/* =========================
   Types
========================= */

export interface InPostConfigResponse {
  enabled: boolean;
  geowidgetToken: string | null;
}

export interface InpostPointPayload {
  name?: string;
  id?: string;
  pointId?: string;
  address_details?: {
    street?: string;
    city?: string;
  };
}

const DEFAULT_CONFIG: InPostConfigResponse = {
  enabled: false,
  geowidgetToken: null,
};

/* =========================
   Hook
========================= */

export function useInpostGeowidget(
  onPointSelect?: (point: InpostPointPayload) => void
) {
  const [widgetReady, setWidgetReady] = useState(false);
  const [widgetFailed, setWidgetFailed] = useState(false);

  const handlerRef = useRef(onPointSelect);
  handlerRef.current = onPointSelect;

  /* ---- Config ---- */
  const { data: config = DEFAULT_CONFIG } = useQuery({
    queryKey: ["shipping", "inpost-config"],
    queryFn: async (): Promise<InPostConfigResponse> => {
      const res = await fetch("/api/shipping/inpost-config");
      if (!res.ok) return DEFAULT_CONFIG;
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  /* ---- Global callback (onpoint) ---- */
  useEffect(() => {
    if (typeof window === "undefined") return;

    (window as any).afterInpostPointSelected = (point: InpostPointPayload) => {
      handlerRef.current?.(point);
    };

    return () => {
      delete (window as any).afterInpostPointSelected;
    };
  }, []);

  /* ---- SDK + CSS ---- */
  useEffect(() => {
    if (!config.enabled || !config.geowidgetToken) return;
    if (typeof window === "undefined") return;

    let cancelled = false;

    const SCRIPT_ID = "inpost-geowidget-js";
    const STYLE_ID = "inpost-geowidget-css";
    const isProduction = import.meta.env.MODE === "production";
    const scriptUrl = isProduction
      ? "https://geowidget.inpost.pl/inpost-geowidget.js"
      : "https://sandbox-easy-geowidget-sdk.easypack24.net/inpost-geowidget.js";
    const styleUrl = isProduction
      ? "https://geowidget.inpost.pl/inpost-geowidget.css"
      : "https://sandbox-easy-geowidget-sdk.easypack24.net/inpost-geowidget.css";

    if (!document.getElementById(STYLE_ID)) {
      const link = document.createElement("link");
      link.id = STYLE_ID;
      link.rel = "stylesheet";
      link.href = styleUrl;
      document.head.appendChild(link);
    }

    if (!document.getElementById(SCRIPT_ID)) {
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = scriptUrl;
      script.defer = true;
      script.onerror = () => {
        if (!cancelled) setWidgetFailed(true);
      };
      document.body.appendChild(script);
    }

    customElements
      .whenDefined("inpost-geowidget")
      .then(() => {
        if (!cancelled) {
          setWidgetReady(true);
          setWidgetFailed(false);
        }
      })
      .catch(() => {
        if (!cancelled) setWidgetFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [config.enabled, config.geowidgetToken]);

  return {
    config,
    widgetReady,
    widgetFailed,
  };
}
