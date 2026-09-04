import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto"
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"

function decodeMasterKey(value: string): Buffer {
  const trimmed = value.trim()
  const key = /^[a-f0-9]{64}$/i.test(trimmed)
    ? Buffer.from(trimmed, "hex")
    : Buffer.from(trimmed, "base64")
  if (key.length !== 32) {
    throw new Error("QUOTA_BOARD_MASTER_KEY must decode to exactly 32 bytes")
  }
  return key
}

export async function loadMasterKey(dataDir: string): Promise<Buffer> {
  const configured = process.env.QUOTA_BOARD_MASTER_KEY
  if (configured) return decodeMasterKey(configured)

  const keyPath = join(dataDir, ".master-key")
  await mkdir(dirname(keyPath), { recursive: true, mode: 0o700 })
  try {
    return decodeMasterKey(await readFile(keyPath, "utf8"))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
  }

  const key = randomBytes(32)
  await writeFile(keyPath, key.toString("base64"), { mode: 0o600, flag: "wx" })
  await chmod(keyPath, 0o600)
  return key
}

export function encryptSecret(secret: string, key: Buffer): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()])
  return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString("base64url")).join(".")
}

export function decryptSecret(value: string, key: Buffer): string {
  const [ivText, tagText, ciphertextText] = value.split(".")
  if (!ivText || !tagText || !ciphertextText) throw new Error("Invalid encrypted secret")
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivText, "base64url"))
  decipher.setAuthTag(Buffer.from(tagText, "base64url"))
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextText, "base64url")),
    decipher.final(),
  ]).toString("utf8")
}

export function keyFingerprint(apiKey: string): string {
  const digest = createHash("sha256").update(apiKey).digest("hex").slice(0, 8)
  return `key_••••_${digest}`
}
