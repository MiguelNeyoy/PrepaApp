function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function downloadXlsxInBrowser(filename: string, contents: Uint8Array) {
  const blob = new Blob([contents], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(url);
}

export async function saveXlsxFile(filename: string, contents: Uint8Array): Promise<void> {
  if (!isTauriRuntime()) {
    downloadXlsxInBrowser(filename, contents);
    return;
  }

  const [{ save }, { writeFile }] = await Promise.all([
    import("@tauri-apps/plugin-dialog"),
    import("@tauri-apps/plugin-fs"),
  ]);

  const filePath = await save({
    defaultPath: filename,
    filters: [{ name: "Excel", extensions: ["xlsx"] }],
  });

  if (!filePath) return;

  await writeFile(filePath, contents);
}
