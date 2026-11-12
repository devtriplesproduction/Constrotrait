/**
 * Validates the actual magic bytes of an uploaded file to prevent spoofing.
 */

export interface FileValidationOptions {
  allowExcel?: boolean;
}

export async function validateFileMagicBytes(file: File, options?: FileValidationOptions): Promise<boolean> {
  const bytes = await file.slice(0, 12).arrayBuffer();
  const arr = new Uint8Array(bytes);

  // PDF: %PDF (25 50 44 46)
  if (arr.length >= 4 && arr[0] === 0x25 && arr[1] === 0x50 && arr[2] === 0x44 && arr[3] === 0x46) {
    return true;
  }

  // PNG: \x89PNG (89 50 4E 47)
  if (arr.length >= 4 && arr[0] === 0x89 && arr[1] === 0x50 && arr[2] === 0x4e && arr[3] === 0x47) {
    return true;
  }

  // JPG: FF D8 FF
  if (arr.length >= 3 && arr[0] === 0xff && arr[1] === 0xd8 && arr[2] === 0xff) {
    return true;
  }

  // WEBP: RIFF....WEBP (52 49 46 46 .... 57 45 42 50)
  if (
    arr.length >= 12 &&
    arr[0] === 0x52 && arr[1] === 0x49 && arr[2] === 0x46 && arr[3] === 0x46 &&
    arr[8] === 0x57 && arr[9] === 0x45 && arr[10] === 0x42 && arr[11] === 0x50
  ) {
    return true;
  }

  if (options?.allowExcel) {
    // XLSX / XLSM / XLSB (ZIP archive format): PK\x03\x04, PK\x05\x06, PK\x07\x08
    if (
      arr.length >= 4 &&
      arr[0] === 0x50 &&
      arr[1] === 0x4b &&
      (arr[2] === 0x03 || arr[2] === 0x05 || arr[2] === 0x07)
    ) {
      return true;
    }

    // XLS (OLE2 / Compound File Binary Format): D0 CF 11 E0 A1 B1 1A E1
    if (
      arr.length >= 8 &&
      arr[0] === 0xd0 &&
      arr[1] === 0xcf &&
      arr[2] === 0x11 &&
      arr[3] === 0xe0 &&
      arr[4] === 0xa1 &&
      arr[5] === 0xb1 &&
      arr[6] === 0x1a &&
      arr[7] === 0xe1
    ) {
      return true;
    }

    // CSV (Text file / UTF BOM or printable characters without null bytes)
    const lowerName = file.name.toLowerCase();
    if (lowerName.endsWith(".csv")) {
      // UTF-8 BOM
      if (arr.length >= 3 && arr[0] === 0xef && arr[1] === 0xbb && arr[2] === 0xbf) {
        return true;
      }
      // UTF-16 BOM
      if (arr.length >= 2 && ((arr[0] === 0xff && arr[1] === 0xfe) || (arr[0] === 0xfe && arr[1] === 0xff))) {
        return true;
      }
      // Plain text CSV (non-empty, text characters without null bytes)
      if (arr.length > 0) {
        const isText = Array.from(arr).every(
          (b) => b === 0x09 || b === 0x0a || b === 0x0d || (b >= 0x20 && b <= 0x7e) || b >= 0x80
        );
        if (isText) return true;
      }
    }
  }

  return false;
}

export function getAllowedExtension(file: File, options?: FileValidationOptions): string | null {
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith(".pdf")) return "pdf";
  if (lowerName.endsWith(".jpg")) return "jpg";
  if (lowerName.endsWith(".jpeg")) return "jpeg";
  if (lowerName.endsWith(".png")) return "png";
  if (lowerName.endsWith(".webp")) return "webp";

  if (options?.allowExcel) {
    if (lowerName.endsWith(".xlsx")) return "xlsx";
    if (lowerName.endsWith(".xls")) return "xls";
    if (lowerName.endsWith(".csv")) return "csv";
    if (lowerName.endsWith(".xlsm")) return "xlsm";
    if (lowerName.endsWith(".xlsb")) return "xlsb";
  }

  return null;
}
