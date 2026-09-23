export function getClientIP(request: Request): string {
  const header =
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  return header
}

export async function anonymizeIP(ip: string): Promise<string> {
  if (ip === 'unknown') {
    return 'unknown'
  }

  const ipv4Match = /^(\d{1,3}\.\d{1,3}\.\d{1,3})\.\d{1,3}$/.exec(ip)
  if (ipv4Match) {
    return `${ipv4Match[1]}.0`
  }

  const encoder = new TextEncoder()
  const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(ip))
  const hash = Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
  return hash.slice(0, 16)
}
