import { currentMonitor, getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";

export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function resizeDesktopWindow(
  width: number,
  height: number,
  minWidth: number,
  minHeight: number,
  resizable: boolean
) {
  if (!isTauriRuntime()) return;

  const appWindow = getCurrentWindow();
  const monitor = await currentMonitor();
  const scaleFactor = monitor?.scaleFactor ?? await appWindow.scaleFactor();
  const workWidth = monitor ? monitor.workArea.size.width / scaleFactor : width;
  const workHeight = monitor ? monitor.workArea.size.height / scaleFactor : height;
  const margin = 32;
  const safeWidth = Math.max(640, Math.floor(workWidth - margin));
  const safeHeight = Math.max(480, Math.floor(workHeight - margin));
  const nextWidth = Math.min(width, safeWidth);
  const nextHeight = Math.min(height, safeHeight);
  const nextMinWidth = Math.min(minWidth, nextWidth);
  const nextMinHeight = Math.min(minHeight, nextHeight);

  await appWindow.setMinSize(new LogicalSize(nextMinWidth, nextMinHeight));
  await appWindow.setSize(new LogicalSize(nextWidth, nextHeight));
  await appWindow.setResizable(resizable);
  await appWindow.center();
  await appWindow.show();
}
