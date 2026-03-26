const { randomUUID } = require('crypto');
const { config } = require('../config/env');
const { runQuery } = require('../db/pool');
const { getCouponsStore } = require('../data/coupons');

const mapCouponRow = (row) => ({
  id: row.id,
  code: row.code,
  discountType: row.discount_type,
  discountValue: Number(row.discount_value),
  startsAt: row.starts_at,
  endsAt: row.ends_at,
  isActive: row.is_active,
  maxUses: row.max_uses !== null ? Number(row.max_uses) : null,
  usedCount: Number(row.used_count)
});

const normalizeCode = (code) => String(code || '').trim().toUpperCase();

const getAllCoupons = async () => {
  if (config.useInMemoryPersistence) {
    return [...getCouponsStore()];
  }

  const result = await runQuery(
    `SELECT id, code, discount_type, discount_value, starts_at, ends_at, is_active, max_uses, used_count
     FROM coupons
     ORDER BY created_at DESC`
  );

  return result.rows.map(mapCouponRow);
};

const getCouponById = async (id) => {
  if (config.useInMemoryPersistence) {
    return getCouponsStore().find((coupon) => coupon.id === id) || null;
  }

  const result = await runQuery(
    `SELECT id, code, discount_type, discount_value, starts_at, ends_at, is_active, max_uses, used_count
     FROM coupons
     WHERE id = $1
     LIMIT 1`,
    [id]
  );

  return result.rows[0] ? mapCouponRow(result.rows[0]) : null;
};

const getCouponByCode = async (code) => {
  const normalizedCode = normalizeCode(code);

  if (config.useInMemoryPersistence) {
    return getCouponsStore().find((coupon) => coupon.code === normalizedCode) || null;
  }

  const result = await runQuery(
    `SELECT id, code, discount_type, discount_value, starts_at, ends_at, is_active, max_uses, used_count
     FROM coupons
     WHERE code = $1
     LIMIT 1`,
    [normalizedCode]
  );

  return result.rows[0] ? mapCouponRow(result.rows[0]) : null;
};

const createCoupon = async ({ code, discountType, discountValue, startsAt, endsAt, isActive = true, maxUses = null }) => {
  const id = `cp-${randomUUID()}`;
  const normalizedCode = normalizeCode(code);

  if (config.useInMemoryPersistence) {
    const coupon = {
      id,
      code: normalizedCode,
      discountType,
      discountValue: Number(discountValue),
      startsAt,
      endsAt,
      isActive: Boolean(isActive),
      maxUses: maxUses !== null ? Number(maxUses) : null,
      usedCount: 0
    };
    getCouponsStore().push(coupon);
    return coupon;
  }

  const result = await runQuery(
    `INSERT INTO coupons (id, code, discount_type, discount_value, starts_at, ends_at, is_active, max_uses, used_count)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0)
     RETURNING id, code, discount_type, discount_value, starts_at, ends_at, is_active, max_uses, used_count`,
    [id, normalizedCode, discountType, Number(discountValue), startsAt, endsAt, Boolean(isActive), maxUses]
  );

  return mapCouponRow(result.rows[0]);
};

const updateCoupon = async (id, changes) => {
  const existing = await getCouponById(id);
  if (!existing) {
    return null;
  }

  const next = {
    ...existing,
    ...changes,
    code: changes.code ? normalizeCode(changes.code) : existing.code,
    discountValue: changes.discountValue !== undefined ? Number(changes.discountValue) : existing.discountValue,
    maxUses: changes.maxUses !== undefined ? (changes.maxUses === null ? null : Number(changes.maxUses)) : existing.maxUses,
    isActive: changes.isActive !== undefined ? Boolean(changes.isActive) : existing.isActive
  };

  if (config.useInMemoryPersistence) {
    const coupons = getCouponsStore();
    const index = coupons.findIndex((coupon) => coupon.id === id);
    coupons[index] = next;
    return next;
  }

  const result = await runQuery(
    `UPDATE coupons
     SET code = $2,
         discount_type = $3,
         discount_value = $4,
         starts_at = $5,
         ends_at = $6,
         is_active = $7,
         max_uses = $8,
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, code, discount_type, discount_value, starts_at, ends_at, is_active, max_uses, used_count`,
    [id, next.code, next.discountType, next.discountValue, next.startsAt, next.endsAt, next.isActive, next.maxUses]
  );

  return result.rows[0] ? mapCouponRow(result.rows[0]) : null;
};

const deleteCoupon = async (id) => {
  if (config.useInMemoryPersistence) {
    const coupons = getCouponsStore();
    const index = coupons.findIndex((coupon) => coupon.id === id);
    if (index === -1) {
      return false;
    }
    coupons.splice(index, 1);
    return true;
  }

  const result = await runQuery('DELETE FROM coupons WHERE id = $1', [id]);
  return result.rowCount > 0;
};

const incrementCouponUsage = async (couponId) => {
  if (config.useInMemoryPersistence) {
    const coupon = getCouponsStore().find((entry) => entry.id === couponId);
    if (!coupon) {
      return null;
    }
    coupon.usedCount += 1;
    return coupon;
  }

  const result = await runQuery(
    `UPDATE coupons
     SET used_count = used_count + 1,
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, code, discount_type, discount_value, starts_at, ends_at, is_active, max_uses, used_count`,
    [couponId]
  );

  return result.rows[0] ? mapCouponRow(result.rows[0]) : null;
};

module.exports = {
  getAllCoupons,
  getCouponById,
  getCouponByCode,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  incrementCouponUsage,
  normalizeCode
};
