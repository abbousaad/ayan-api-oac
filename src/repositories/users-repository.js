const { runQuery } = require('../db/pool');
const { randomUUID } = require('crypto');
const {
  getUserById: getInMemoryUserById,
  getUserByUsername: getInMemoryUserByUsername,
  createUser: createInMemoryUser,
  updateUserPasswordHash: updateInMemoryUserPasswordHash
} = require('../data/users');
const { config } = require('../config/env');

const mapUserRow = (row) => ({
  id: row.id,
  username: row.username,
  passwordHash: row.password_hash,
  role: row.role,
  mustChangePassword: row.must_change_password
});

const getUserById = async (id) => {
  if (config.useInMemoryPersistence) {
    return getInMemoryUserById(id);
  }

  const result = await runQuery(
    'SELECT id, username, password_hash, role, must_change_password FROM users WHERE id = $1 LIMIT 1',
    [id]
  );

  return result.rows[0] ? mapUserRow(result.rows[0]) : null;
};

const getUserByUsername = async (username) => {
  if (config.useInMemoryPersistence) {
    return getInMemoryUserByUsername(username);
  }

  const result = await runQuery(
    'SELECT id, username, password_hash, role, must_change_password FROM users WHERE username = $1 LIMIT 1',
    [username]
  );

  return result.rows[0] ? mapUserRow(result.rows[0]) : null;
};

const createUser = async ({ username, passwordHash, role = 'user', mustChangePassword = false }) => {
  const id = `u-${randomUUID()}`;

  if (config.useInMemoryPersistence) {
    return createInMemoryUser({ id, username, passwordHash, role, mustChangePassword });
  }

  const result = await runQuery(
    `INSERT INTO users (id, username, password_hash, role, must_change_password)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, username, password_hash, role, must_change_password`,
    [id, username, passwordHash, role, mustChangePassword]
  );

  return mapUserRow(result.rows[0]);
};

const updateUserPasswordHash = async ({ userId, passwordHash }) => {
  if (config.useInMemoryPersistence) {
    return updateInMemoryUserPasswordHash(userId, passwordHash);
  }

  const result = await runQuery(
    `UPDATE users
     SET password_hash = $2, must_change_password = FALSE, updated_at = NOW()
     WHERE id = $1
     RETURNING id, username, password_hash, role, must_change_password`,
    [userId, passwordHash]
  );

  return result.rows[0] ? mapUserRow(result.rows[0]) : null;
};

module.exports = { getUserById, getUserByUsername, createUser, updateUserPasswordHash };
