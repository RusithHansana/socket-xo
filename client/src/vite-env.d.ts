/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEV_MODE: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
