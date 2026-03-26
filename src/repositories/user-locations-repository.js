const { randomUUID } = require('crypto');
const { config } = require('../config/env');
const { runQuery } = require('../db/pool');
const { getUserLocationsStore } = require('../data/user-locations');

const mapLocationRow = (row) => ({
  id: row.id,
  userId: row.user_id,
  label: row.label,
  address: row.address,
  latitude: row.latitude !== null ? Number(row.latitude) : null,
  longitude: row.longitude !== null ? Number(row.longitude) : null
});

const getLocationsByUserId = async (userId) => {
  if (config.useInMemoryPersistence) {
    return getUserLocationsStore().filter((location) => location.userId === userId);
  }

  const result = await runQuery(
    'SELECT id, user_id, label, address, latitude, longitude FROM user_locations WHERE user_id = $1 ORDER BY created_at ASC',
    [userId]
  );

  return result.rows.map(mapLocationRow);
};

const getLocationById = async (id) => {
  if (config.useInMemoryPersistence) {
    return getUserLocationsStore().find((location) => location.id === id) || null;
  }

  const result = await runQuery(
    'SELECT id, user_id, label, address, latitude, longitude FROM user_locations WHERE id = $1 LIMIT 1',
    [id]
  );

  return result.rows[0] ? mapLocationRow(result.rows[0]) : null;
};

const createLocation = async ({ userId, label, address = null, latitude = null, longitude = null }) => {
  const id = `loc-${randomUUID()}`;

  if (config.useInMemoryPersistence) {
    const location = { id, userId, label, address, latitude, longitude };
    getUserLocationsStore().push(location);
    return location;
  }

  const result = await runQuery(
    `INSERT INTO user_locations (id, user_id, label, address, latitude, longitude)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, user_id, label, address, latitude, longitude`,
    [id, userId, label, address, latitude, longitude]
  );

  return mapLocationRow(result.rows[0]);
};

module.exports = { getLocationsByUserId, getLocationById, createLocation };
