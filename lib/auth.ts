import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'antigravity-ecommerce-engine-rules-secret-key-123456';

export interface JWTPayload {
  userId: string;
  username: string;
  role: string;
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input).toString('base64url');
}

function base64UrlDecode(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function createSignature(headerPayload: string): string {
  return crypto.createHmac('sha256', JWT_SECRET).update(headerPayload).digest('base64url');
}

function parseJsonToken(token: string): JWTPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(parts[1])) as JWTPayload;
    return payload;
  } catch {
    return null;
  }
}

export async function signToken(payload: JWTPayload): Promise<string> {
  const header = JSON.stringify({ alg: 'HS256', typ: 'JWT' });
  const now = Math.floor(Date.now() / 1000);
  const body = {
    ...payload,
    iat: now,
    exp: now + 86400
  };

  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(JSON.stringify(body));
  const signature = createSignature(`${encodedHeader}.${encodedPayload}`);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, payload, signature] = parts;
    const expectedSignature = createSignature(`${header}.${payload}`);

    if (signature !== expectedSignature) return null;

    const decodedPayload = JSON.parse(base64UrlDecode(payload)) as JWTPayload & { exp?: number };
    if (decodedPayload.exp && decodedPayload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return decodedPayload as JWTPayload;
  } catch {
    return null;
  }
}
