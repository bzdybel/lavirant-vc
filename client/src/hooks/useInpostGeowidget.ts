import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

export interface InPostConfigResponse {
  enabled: boolean;
  geowidgetToken: string | null;
}

const DEFAULT_CONFIG: InPostConfigResponse = { enabled: false, geowidgetToken: null };

export function useInpostGeowidget() {
  const [widgetReady, setWidgetReady] = useState(false);
  const [widgetFailed, setWidgetFailed] = useState(false);

  const { data: config = DEFAULT_CONFIG } = useQuery({
    queryKey: ["shipping", "inpost-config"],
    queryFn: async (): Promise<InPostConfigResponse> => {
      const response = await fetch("/api/shipping/inpost-config");
      if (!response.ok) {
        return DEFAULT_CONFIG;
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!config.enabled || !config.geowidgetToken) return;

    let timeoutId: number | undefined;
    const scriptId = "inpost-geowidget-script";
    const styleId = "inpost-geowidget-style";

    const ensureStyle = () => {
      if (document.getElementById(styleId)) return;
      const style = document.createElement("link");
      style.id = styleId;
      style.rel = "stylesheet";
      style.href = "https://geowidget.easypack24.net/css/easypack.css";
      document.head.appendChild(style);
    };

    const markReadyIfDefined = () => {
      if (customElements.get("inpost-geowidget")) {
        setWidgetReady(true);
        setWidgetFailed(false);
        return true;
      }
      return false;
    };

    ensureStyle();

    if (markReadyIfDefined()) return;

    const existing = document.getElementById(scriptId);
    if (existing) {
      timeoutId = window.setTimeout(() => {
        if (!markReadyIfDefined()) {
          setWidgetFailed(true);
        }
      }, 8000);
      return () => {
        if (timeoutId) window.clearTimeout(timeoutId);
      };
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://geowidget.easypack24.net/js/sdk-for-javascript";
    script.async = true;
    script.onload = () => {
      if (!markReadyIfDefined()) {
        setWidgetFailed(true);
      }
    };
    script.onerror = () => {
      setWidgetFailed(true);
      setWidgetReady(false);
    };
    document.body.appendChild(script);

    timeoutId = window.setTimeout(() => {
      if (!markReadyIfDefined()) {
        setWidgetFailed(true);
      }
    }, 8000);

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [config.enabled, config.geowidgetToken]);

  return {
    config,
    widgetReady,
    widgetFailed,
  };
}
