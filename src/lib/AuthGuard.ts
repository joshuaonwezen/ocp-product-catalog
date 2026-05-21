import { storage, Headers } from '@zaiusinc/app-sdk';

export class AuthGuard {
  public static async validate(headers: Headers): Promise<{ valid: boolean }> {
    const authHeader = headers.get('authorization') || headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) return { valid: false };

    const secrets = await storage.secrets.get('api');
    const storedToken = secrets?.apiToken;

    if (!storedToken || token !== storedToken) return { valid: false };

    return { valid: true };
  }
}
