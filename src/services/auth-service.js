const createAttemptTracker = (maxAllowedFailures) => {
  const attempts = new Map();

  const registerFailure = (key) => {
    const current = attempts.get(key) || 0;
    const next = current + 1;
    attempts.set(key, next);
    return {
      count: next,
      exceeded: next > maxAllowedFailures
    };
  };

  const clearFailures = (key) => {
    attempts.delete(key);
  };

  return { registerFailure, clearFailures };
};

const authenticateCredentials = async (lookupUserByUsername, verifyPassword, credentials) => {
  const user = await lookupUserByUsername(credentials.username);
  const validPassword = user ? await verifyPassword(credentials.password, user.passwordHash) : false;

  if (!user || !validPassword) {
    return { success: false, user: null };
  }

  return {
    success: true,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      mustChangePassword: Boolean(user.mustChangePassword)
    }
  };
};

module.exports = { createAttemptTracker, authenticateCredentials };
