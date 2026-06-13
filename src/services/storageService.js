// ============================================================
// Firebase Storage — product image uploads.
// Returns a public download URL stored in the product record.
// Path layout: stores/{storeId}/products/{timestamp}_{filename}
// ============================================================
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

export async function uploadProductImage(file, storeId = 'default') {
  if (!file) throw new Error('No file provided');
  const safeName = file.name ? file.name.replace(/[^\w.\-]/g, '_') : 'image.png';
  const path = `stores/${storeId}/products/${Date.now()}_${safeName}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type || 'image/png' });
  const url = await getDownloadURL(storageRef);
  return { url, path };
}

export async function deleteImageByPath(path) {
  if (!path) return;
  try { await deleteObject(ref(storage, path)); } catch (_) {}
}

// True when a stored image value is a Firebase URL (vs a local file path used
// by the offline/Electron build).
export function isRemoteImage(value) {
  return typeof value === 'string' && /^https?:\/\//.test(value);
}
