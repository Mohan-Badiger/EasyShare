export async function generateEncryptionKey() {
  const key = await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  const rawKey = await window.crypto.subtle.exportKey("raw", key);
  const base64Key = btoa(String.fromCharCode(...new Uint8Array(rawKey)));
  return { key, base64Key };
}

export async function importEncryptionKey(base64Key) {
  const binaryString = atob(base64Key);
  const rawKey = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    rawKey[i] = binaryString.charCodeAt(i);
  }
  const key = await window.crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-GCM" },
    true,
    ["encrypt", "decrypt"]
  );
  return key;
}

export async function encryptChunk(key, arrayBuffer) {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encryptedContent = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    arrayBuffer
  );
  
  // Package IV (12 bytes) and ciphertext together
  const combined = new Uint8Array(iv.length + encryptedContent.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encryptedContent), iv.length);
  return combined.buffer;
}

export async function decryptChunk(key, arrayBuffer) {
  const combined = new Uint8Array(arrayBuffer);
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  
  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv },
    key,
    ciphertext
  );
  return decrypted;
}
