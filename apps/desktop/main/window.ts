import { BrowserWindow } from "electron";

export function createWindow(preloadPath: string): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    show: false,
    backgroundColor: "#040D12",
    fullscreenable: true,
    resizable: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Show when ready to avoid white flash
  win.once("ready-to-show", () => {
    win.show();
  });

  return win;
}
