/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AMAP_KEY?: string;
  readonly VITE_AMAP_WEB_KEY?: string;
  readonly VITE_AMAP_SERVICE_KEY?: string;
  readonly VITE_AMAP_PROXY_BASE?: string;
  readonly VITE_AMAP_SECURITY_CODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
