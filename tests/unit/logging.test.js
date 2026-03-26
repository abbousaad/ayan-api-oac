const { redactSensitive } = require('../../src/logging/logger');

describe('logging redaction', () => {
  test('redactSensitive masks nested secrets', () => {
    const payload = {
      username: 'demo',
      password: 'secret',
      nested: {
        authorization: 'Bearer abc',
        token: 'jwt-token'
      }
    };

    const redacted = redactSensitive(payload);

    expect(redacted).toEqual({
      username: 'demo',
      password: '[REDACTED]',
      nested: {
        authorization: '[REDACTED]',
        token: '[REDACTED]'
      }
    });
  });
});
