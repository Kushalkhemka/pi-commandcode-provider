import { describe, expect, it } from "vitest"
import { decryptSecret, encryptSecret, keyFingerprint } from "../server/vault"

describe("encrypted API-key vault", () => {
  it("round-trips a key without storing plaintext", () => {
    const masterKey = Buffer.alloc(32, 7)
    const secret = "cmd_test_abcdefghijklmnopqrstuvwxyz"
    const encrypted = encryptSecret(secret, masterKey)

    expect(encrypted).not.toContain(secret)
    expect(encrypted.split(".")).toHaveLength(3)
    expect(decryptSecret(encrypted, masterKey)).toBe(secret)
  })

  it("uses a stable, non-reversible display fingerprint", () => {
    const fingerprint = keyFingerprint("cmd_test_abcdefghijklmnopqrstuvwxyz")
    expect(fingerprint).toMatch(/^key_••••_[a-f0-9]{8}$/)
    expect(fingerprint).not.toContain("abcdefghijklmnopqrstuvwxyz")
  })
})
