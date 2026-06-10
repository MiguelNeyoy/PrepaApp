const UTF8_BOM = "\ufeff";

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function downloadCsvInBrowser(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(url);
}

export async function saveCsvFile(filename: string, csv: string): Promise<void> {
  const contents = UTF8_BOM + csv;

  if (!isTauriRuntime()) {
    downloadCsvInBrowser(filename, contents);
    return;
  }

  const [{ save }, { writeTextFile }] = await Promise.all([
    import("@tauri-apps/plugin-dialog"),
    import("@tauri-apps/plugin-fs"),
  ]);

  const filePath = await save({
    defaultPath: filename,
    filters: [{ name: "CSV", extensions: ["csv"] }],
  });

  if (!filePath) return;

  await writeTextFile(filePath, contents);
}
