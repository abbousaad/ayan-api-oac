const { createAttemptTracker, authenticateCredentials } = require('../../src/services/auth-service');

describe('auth service', () => {
  test('authenticateCredentials returns success for valid credentials', async () => {
    const lookup = jest.fn().mockReturnValue({
      id: 'u-1',
      username: 'demo',
      passwordHash: 'hash',
      role: 'user',
      mustChangePassword: false
    });
    const verifyPassword = jest.fn().mockResolvedValue(true);

    const result = await authenticateCredentials(lookup, verifyPassword, {
      username: 'demo',
      password: 'demo1234'
    });

    expect(result.success).toBe(true);
    expect(result.user).toEqual({ id: 'u-1', username: 'demo', role: 'user', mustChangePassword: false });
  });

  test('authenticateCredentials fails for invalid password', async () => {
    const lookup = jest.fn().mockReturnValue({
      id: 'u-1',
      username: 'demo',
      passwordHash: 'hash',
      role: 'user',
      mustChangePassword: false
    });
    const verifyPassword = jest.fn().mockResolvedValue(false);

    const result = await authenticateCredentials(lookup, verifyPassword, {
      username: 'demo',
      password: 'wrong-pass'
    });

    expect(result).toEqual({ success: false, user: null });
  });

  test('createAttemptTracker flags when attempts exceed threshold', () => {
    const tracker = createAttemptTracker(4);

    tracker.registerFailure('demo:127.0.0.1');
    tracker.registerFailure('demo:127.0.0.1');
    tracker.registerFailure('demo:127.0.0.1');
    tracker.registerFailure('demo:127.0.0.1');
    const fifth = tracker.registerFailure('demo:127.0.0.1');

    expect(fifth).toEqual({ count: 5, exceeded: true });
  });
});
