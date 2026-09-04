import { mkdir, writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"

const outputDir = resolve("public/avatars")
await mkdir(outputDir, { recursive: true })

for (let index = 1; index <= 50; index += 1) {
  const number = String(index).padStart(2, "0")
  const seed = `commandcode-account-${number}`
  const url = `https://api.dicebear.com/10.x/notionists/svg?seed=${encodeURIComponent(seed)}&radius=18`
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Avatar ${number} failed with ${response.status}`)
  const svg = await response.text()
  if (!svg.startsWith("<svg") || !svg.includes("Notionists")) throw new Error(`Avatar ${number} was not a valid Notionists SVG`)
  await writeFile(join(outputDir, `avatar-${number}.svg`), svg, "utf8")
}

console.log("Synced 50 deterministic Notionists avatars.")
