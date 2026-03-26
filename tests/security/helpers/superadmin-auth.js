const request = require('supertest');
const { app } = require('../../../src/app');
const { createUser } = require('../../../src/repositories/users-repository');
const { hashPassword } = require('../../../src/security/password');

const createUniqueUsername = () => `superadmin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createAndLoginSuperadmin = async ({ mustChangePassword = false, password = 'Superadmin1234!' } = {}) => {
  const username = createUniqueUsername();
  const passwordHash = await hashPassword(password);

  await createUser({
    username,
    passwordHash,
    role: 'superadmin',
    mustChangePassword
  });

  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ username, password });

  if (login.status !== 200) {
    throw new Error(`Unable to login superadmin test user: ${login.status}`);
  }

  return {
    username,
    password,
    token: login.body.data.token,
    user: login.body.data.user
  };
};

module.exports = { createAndLoginSuperadmin };
