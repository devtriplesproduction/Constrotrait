/**
 * Validates the actual magic bytes of an uploaded file to prevent spoofing.
 */

export async function validateFileMagicBytes(file: File): Promise<boolean> {
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

  return false;
}

export function getAllowedExtension(file: File): string | null {
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith(".pdf")) return "pdf";
  if (lowerName.endsWith(".jpg")) return "jpg";
  if (lowerName.endsWith(".jpeg")) return "jpeg";
  if (lowerName.endsWith(".png")) return "png";
  if (lowerName.endsWith(".webp")) return "webp";
  return null;
}
