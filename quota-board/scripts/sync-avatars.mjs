import { mkdir, writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"

const outputDir = resolve("public/avatars")
await mkdir(outputDir, { recursive: true })

const firstGeneratedAvatar = 9
const lastAvatar = 256
const concurrency = 12

// Avatars 01–08 are the original hand-picked portraits. Keep them untouched so
// existing accounts retain the visual style users already recognize.
async function syncAvatar(index) {
  const number = String(index).padStart(2, "0")
  const seed = `commandcode-account-${number}`
  const url = `https://api.dicebear.com/10.x/notionists-neutral/svg?seed=${encodeURIComponent(seed)}&radius=18`
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Avatar ${number} failed with ${response.status}`)
  const svg = await response.text()
  if (!svg.startsWith("<svg") || !svg.includes("Notionists")) throw new Error(`Avatar ${number} was not a valid Notionists SVG`)
  await writeFile(join(outputDir, `avatar-${number}.svg`), svg, "utf8")
}

const queue = Array.from({ length: lastAvatar - firstGeneratedAvatar + 1 }, (_, index) => index + firstGeneratedAvatar)
let cursor = 0
await Promise.all(Array.from({ length: concurrency }, async () => {
  while (cursor < queue.length) {
    const index = queue[cursor]
    cursor += 1
    await syncAvatar(index)
  }
}))

console.log("Synced 248 deterministic Notionists Neutral avatars; preserved 8 original portraits.")
