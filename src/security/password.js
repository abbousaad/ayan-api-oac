const bcrypt = require('bcryptjs');

const hashPassword = async (plainPassword) => bcrypt.hash(plainPassword, 10);

const verifyPassword = async (plainPassword, passwordHash) => {
  if (!passwordHash) {
    return false;
  }

  return bcrypt.compare(plainPassword, passwordHash);
};

module.exports = { hashPassword, verifyPassword };
