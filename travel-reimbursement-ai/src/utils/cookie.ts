const TOKEN_KEY = 'access_token';

export function setTokenCookie(token: string, maxAgeSeconds: number): void {
  document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

export function getTokenFromCookie(): string | null {
  const match = document.cookie.match(new RegExp('(?:^|; )' + TOKEN_KEY + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

export function removeTokenCookie(): void {
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`;
}
