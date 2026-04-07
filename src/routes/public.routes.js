const express = require('express');
const { runQuery } = require('../db/pool');
const publicOrdersRepository = require('../repositories/public-orders-repository');
const productsRepository = require('../repositories/products-repository');
const pricingConfigRepository = require('../repositories/order-pricing-config-repository');
const couponsRepository = require('../repositories/coupons-repository');
const appSettingsRepository = require('../repositories/app-settings-repository');
const { computeOrderTotals } = require('../services/order-pricing');
const { isQuantityCompatibleWithUnit } = require('../services/order-workflow');
const { createOrderBuilder } = require('../services/order-builder');

const router = express.Router();
const orderBuilder = createOrderBuilder({
  productsRepository,
  pricingConfigRepository,
  couponsRepository,
  computeOrderTotals,
  isQuantityCompatibleWithUnit
});

const buildPublicOrderPayload = async (order) => {
  const items = await publicOrdersRepository.getPublicOrderItemsByOrderId(order.id);
  const currencyCode = await appSettingsRepository.getCurrencyCode();
  return { ...order, items, currencyCode };
};

router.get('/public', (_req, res) => {
  res.status(200).json({ data: { message: 'Public route reachable' } });
});

router.get('/public/db-status', async (_req, res) => {
  try {
    const result = await runQuery('SELECT NOW() AS now');
    return res.status(200).json({
      data: {
        status: 'connected',
        now: result.rows[0].now
      }
    });
  } catch (_error) {
    return res.status(503).json({
      error: {
        code: 'DB_UNAVAILABLE',
        message: 'Database connection is not available'
      }
    });
  }
});

router.post('/public/orders', async (req, res) => {
  const { guest, deliveryMode, scheduledAt = null, items, couponCode = null } = req.body || {};

  if (!guest || !guest.name || !guest.phone || !guest.address) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'guest name, phone and address are required' }
    });
  }

  const builtOrder = await orderBuilder.buildOrderInput({ deliveryMode, scheduledAt, items, couponCode });
  if (builtOrder.error) {
    return res.status(builtOrder.error.status).json(builtOrder.error.body);
  }

  const order = await publicOrdersRepository.createPublicOrderWithItems({
    guest: {
      name: guest.name,
      phone: guest.phone,
      email: guest.email || null,
      address: guest.address
    },
    deliveryMode,
    scheduledAt: deliveryMode === 'scheduled' ? scheduledAt : null,
    items: builtOrder.data.items,
    totals: builtOrder.data.totals,
    couponId: builtOrder.data.coupon ? builtOrder.data.coupon.id : null,
    couponCode: builtOrder.data.coupon ? builtOrder.data.coupon.code : null
  });

  if (builtOrder.data.coupon) {
    await couponsRepository.incrementCouponUsage(builtOrder.data.coupon.id);
  }

  return res.status(201).json({ data: await buildPublicOrderPayload(order) });
});

module.exports = { publicRouter: router };
