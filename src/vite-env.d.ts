/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface Window {
  desktopReminder?: {
    show: (payload: { title: string; body: string; tag?: string }) => Promise<{ ok?: boolean }>;
  };
  desktopCapture?: {
    saveElementScreenshot: (payload: {
      filename: string;
      rect: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
    }) => Promise<{ canceled?: boolean; filePath?: string }>;
  };
}
