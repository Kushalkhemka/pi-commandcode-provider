import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises"
import { join } from "node:path"
import type { DatabaseShape } from "./types"

const EMPTY_DATABASE: DatabaseShape = {
  version: 1,
  accounts: [],
  snapshots: {},
  telemetry: [],
}

export class JsonStore {
  private readonly filePath: string
  private queue: Promise<unknown> = Promise.resolve()

  constructor(private readonly dataDir: string) {
    this.filePath = join(dataDir, "quota-board.json")
  }

  async init(): Promise<void> {
    await mkdir(this.dataDir, { recursive: true, mode: 0o700 })
    try {
      await readFile(this.filePath)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
      await this.write(EMPTY_DATABASE)
    }
  }

  async read(): Promise<DatabaseShape> {
    const parsed = JSON.parse(await readFile(this.filePath, "utf8")) as DatabaseShape
    if (parsed.version !== 1 || !Array.isArray(parsed.accounts)) {
      throw new Error("Unsupported quota board data format")
    }
    return parsed
  }

  async update(mutator: (database: DatabaseShape) => void): Promise<DatabaseShape> {
    const task = this.queue.then(async () => {
      const database = await this.read()
      mutator(database)
      await this.write(database)
      return database
    })
    this.queue = task.catch(() => undefined)
    return task
  }

  private async write(database: DatabaseShape): Promise<void> {
    const temporary = `${this.filePath}.${process.pid}.tmp`
    await writeFile(temporary, `${JSON.stringify(database, null, 2)}\n`, { mode: 0o600 })
    await chmod(temporary, 0o600)
    await rename(temporary, this.filePath)
    await chmod(this.filePath, 0o600)
  }
}
