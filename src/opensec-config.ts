/** OpenSec member credentials are routed only to the configured OpenSec endpoint. */
export const DEFAULT_OPENSEC_ROUTER_URL = "https://cc.opensec.in"

export function isOpenSecMemberToken(token?: string): boolean {
  return Boolean(token?.startsWith("os_member_"))
}
