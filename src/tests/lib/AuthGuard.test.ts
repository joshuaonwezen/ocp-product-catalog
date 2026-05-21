/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
import { AuthGuard } from '../../lib/AuthGuard';

jest.mock('@zaiusinc/app-sdk', () => ({
  ...jest.requireActual('@zaiusinc/app-sdk'),
  storage: {
    secrets: {
      get: jest.fn(),
    },
  },
}));

const { storage } = require('@zaiusinc/app-sdk');

describe('AuthGuard', () => {
  const makeHeaders = (authValue?: string): any => ({
    get: jest.fn().mockReturnValue(authValue || ''),
  });

  it('should return valid when token matches', async () => {
    storage.secrets.get.mockResolvedValue({ apiToken: 'valid-token' });

    const result = await AuthGuard.validate(makeHeaders('Bearer valid-token'));
    expect(result.valid).toBe(true);
  });

  it('should return invalid when no authorization header', async () => {
    const result = await AuthGuard.validate(makeHeaders(''));
    expect(result.valid).toBe(false);
  });

  it('should return invalid when token does not match', async () => {
    storage.secrets.get.mockResolvedValue({ apiToken: 'correct-token' });

    const result = await AuthGuard.validate(makeHeaders('Bearer wrong-token'));
    expect(result.valid).toBe(false);
  });

  it('should return invalid when no stored token exists', async () => {
    storage.secrets.get.mockResolvedValue(null);

    const result = await AuthGuard.validate(makeHeaders('Bearer some-token'));
    expect(result.valid).toBe(false);
  });
});
