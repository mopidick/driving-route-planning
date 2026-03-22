declare global {
  interface AMapSecurityConfig {
    securityJsCode?: string;
    serviceHost?: string;
  }

  interface AMapInstance {
    destroy: () => void;
    clearMap: () => void;
    setFitView: () => void;
    add: (items: unknown[] | unknown) => void;
    setCenter: (center: [number, number]) => void;
    setZoom: (zoom: number) => void;
    setStatus?: (status: {
      dragEnable?: boolean;
      zoomEnable?: boolean;
      keyboardEnable?: boolean;
      doubleClickZoom?: boolean;
    }) => void;
  }

  interface AMapMarker {
    setMap: (map: AMapInstance | null) => void;
  }

  interface AMapPolyline {
    setMap: (map: AMapInstance | null) => void;
  }

  interface Window {
    AMap?: {
      Map: new (container: HTMLElement, options?: Record<string, unknown>) => AMapInstance;
      Marker: new (options?: Record<string, unknown>) => AMapMarker;
      Polyline: new (options?: Record<string, unknown>) => AMapPolyline;
      Pixel: new (x: number, y: number) => unknown;
      LngLat: new (lng: number, lat: number) => unknown;
    };
    _AMapSecurityConfig?: AMapSecurityConfig;
  }
}

export {};
