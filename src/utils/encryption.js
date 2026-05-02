
const PBKDF2_ITERATIONS = 200000
const SALT_BYTES        = 16
const IV_BYTES          = 12
const KEY_LENGTH        = 256

// Encode / decode helpers
const toBase64  = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)))
const fromBase64 = (b64) => Uint8Array.from(atob(b64), c => c.charCodeAt(0))
const enc = new TextEncoder()
const dec = new TextDecoder()

//derive an encryption key from a password and salt
async function deriveKey(password, saltBytes) {
  //import raw password as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
  )
  //create an encryption key using pbkdf2
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: saltBytes, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  )
}

//encrypt a json string using a password and return string base64(salt + iv + ciphertext)
export async function encryptData(plaintextJson, password) {
  //generate salt and iv, and derive the key
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const iv   = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const key  = await deriveKey(password, salt)

  //encrypt the data
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintextJson)
  )

  //combine salt + iv + ciphertext into one array
  const packed = new Uint8Array(SALT_BYTES + IV_BYTES + ciphertext.byteLength)
  packed.set(salt, 0)
  packed.set(iv,   SALT_BYTES)
  packed.set(new Uint8Array(ciphertext), SALT_BYTES + IV_BYTES)

  return toBase64(packed.buffer)
}

//decrypt base64 encrypted data back into json string
export async function decryptData(encryptedBase64, password) {
  //decode base64 into bytes
  const packed = fromBase64(encryptedBase64)
  //extract salt, iv, and ciphertext from data
  const salt       = packed.slice(0, SALT_BYTES)
  const iv         = packed.slice(SALT_BYTES, SALT_BYTES + IV_BYTES)
  const ciphertext = packed.slice(SALT_BYTES + IV_BYTES)

  const key = await deriveKey(password, salt)

  let plaintext
  try {
    plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  } 
  //Catch errors
  catch {
    throw new Error('Decryption failed - wrong password or corrupted file.')
  }

  return dec.decode(plaintext)
}

//Returns true if the string looks like its encrypted (not JSON).
export function isEncrypted(content) {
  const trimmed = content.trim()
  return !trimmed.startsWith('{') && !trimmed.startsWith('[')
}
