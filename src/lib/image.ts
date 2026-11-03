function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that photo."));
    reader.readAsDataURL(file);
  });
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("That photo could not be opened."));
    image.src = source;
  });
}

/**
 * Receipt photos are optional and local-first. They are resized before storage
 * so a single phone photo does not make the record too large to sync.
 */
export async function fileToReceiptDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }
  if (file.size > 8_000_000) {
    throw new Error("That photo is too large. Please choose one under 8 MB.");
  }

  const original = await readFileAsDataUrl(file);
  const image = await loadImage(original);
  const maxSide = 1000;
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not prepare that photo.");
  context.drawImage(image, 0, 0, width, height);

  let quality = 0.72;
  let result = canvas.toDataURL("image/jpeg", quality);
  while (result.length > 300_000 && quality > 0.32) {
    quality -= 0.12;
    result = canvas.toDataURL("image/jpeg", quality);
  }
  if (result.length > 380_000) {
    throw new Error("That photo is still too large. Please choose a smaller one.");
  }
  return result;
}
