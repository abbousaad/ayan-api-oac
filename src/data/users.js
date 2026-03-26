const USERS = [
  {
    id: 'u-1',
    username: 'demo',
    passwordHash: '$2a$10$z7gWmChDsDtQpxSwLuZfZOGatCsAruXiLOwlkM5CLx6g1MW9p4C1y',
    role: 'user',
    mustChangePassword: false
  },
  {
    id: 'u-2',
    username: 'superadmin',
    passwordHash: '$2a$10$vRJG0RKam.H7mbAx6UXdyuhiMBB46z4dcqGTtU9B.P40C/xD15DwO',
    role: 'superadmin',
    mustChangePassword: true
  },
  {
    id: 'u-3',
    username: 'livreur',
    passwordHash: '$2a$10$o8fu8cyrkrAz1qsasF3dguIvwhJ2Z/Z4lvCCaSDwrOVeX.bAlTyTW',
    role: 'livreur',
    mustChangePassword: false
  }
];

const getUserById = (id) => USERS.find((user) => user.id === id) || null;

const getUserByUsername = (username) => USERS.find((user) => user.username === username) || null;

const createUser = ({ id, username, passwordHash, role, mustChangePassword = false }) => {
  const user = { id, username, passwordHash, role, mustChangePassword };
  USERS.push(user);
  return user;
};

const updateUserPasswordHash = (id, passwordHash) => {
  const user = getUserById(id);
  if (!user) {
    return null;
  }

  user.passwordHash = passwordHash;
  user.mustChangePassword = false;
  return user;
};

module.exports = { getUserById, getUserByUsername, createUser, updateUserPasswordHash };
