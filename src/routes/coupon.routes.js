const express = require('express');
const { requireJwt, requireRole } = require('../auth/auth-middleware');
const couponsRepository = require('../repositories/coupons-repository');

const router = express.Router();

const validateCouponInput = (payload) => {
  const required = ['code', 'discountType', 'discountValue', 'startsAt', 'endsAt'];
  for (const field of required) {
    if (payload[field] === undefined || payload[field] === null || payload[field] === '') {
      return `${field} is required`;
    }
  }

  if (!['fixed', 'percentage'].includes(payload.discountType)) {
    return 'discountType must be fixed or percentage';
  }

  const discountValue = Number(payload.discountValue);
  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    return 'discountValue must be greater than zero';
  }

  if (payload.discountType === 'percentage' && discountValue > 1) {
    return 'percentage discountValue must be between 0 and 1';
  }

  const startsAt = new Date(payload.startsAt);
  const endsAt = new Date(payload.endsAt);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
    return 'Coupon period is invalid';
  }

  return null;
};

router.get('/coupons', requireJwt, requireRole('superadmin'), async (_req, res) => {
  const coupons = await couponsRepository.getAllCoupons();
  return res.status(200).json({ data: coupons });
});

router.post('/coupons', requireJwt, requireRole('superadmin'), async (req, res) => {
  const validationError = validateCouponInput(req.body || {});
  if (validationError) {
    return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: validationError } });
  }

  try {
    const coupon = await couponsRepository.createCoupon(req.body || {});
    return res.status(201).json({ data: coupon });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: { code: 'COUPON_EXISTS', message: 'Coupon code already exists' } });
    }
    throw error;
  }
});

router.patch('/coupons/:id', requireJwt, requireRole('superadmin'), async (req, res) => {
  if (req.body.code || req.body.discountType || req.body.discountValue || req.body.startsAt || req.body.endsAt) {
    const existing = await couponsRepository.getCouponById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Coupon not found' } });
    }

    const merged = { ...existing, ...req.body };
    const validationError = validateCouponInput(merged);
    if (validationError) {
      return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: validationError } });
    }
  }

  const updated = await couponsRepository.updateCoupon(req.params.id, req.body || {});
  if (!updated) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Coupon not found' } });
  }

  return res.status(200).json({ data: updated });
});

router.delete('/coupons/:id', requireJwt, requireRole('superadmin'), async (req, res) => {
  const deleted = await couponsRepository.deleteCoupon(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Coupon not found' } });
  }

  return res.status(200).json({ data: { deleted: true } });
});

module.exports = { couponRouter: router };
