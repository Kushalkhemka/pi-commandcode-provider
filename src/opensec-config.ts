/** OpenSec member credentials are routed only to the configured OpenSec endpoint. */
export const DEFAULT_OPENSEC_ROUTER_URL = "https://cc.opensec.in"

export function isOpenSecMemberToken(token?: string): boolean {
  return Boolean(token?.startsWith("os_member_"))
}

/** Only explicit operator configuration selects a different trusted router. */
export function routerBaseUrl(value = DEFAULT_OPENSEC_ROUTER_URL): string {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error("Invalid OpenSec router URL")
  }
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
  if (
    (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error(
      "OpenSec router requires HTTPS (HTTP is allowed only on loopback), without URL credentials, query or fragment",
    )
  return url.toString().replace(/\/+$/, "")
}
