const express = require('express');
const { requireJwt, requireRole, requireAnyRole } = require('../auth/auth-middleware');
const locationsRepository = require('../repositories/user-locations-repository');
const ordersRepository = require('../repositories/orders-repository');
const publicOrdersRepository = require('../repositories/public-orders-repository');
const productsRepository = require('../repositories/products-repository');
const pricingConfigRepository = require('../repositories/order-pricing-config-repository');
const couponsRepository = require('../repositories/coupons-repository');
const appSettingsRepository = require('../repositories/app-settings-repository');
const { canTransitionOrderStatus, isQuantityCompatibleWithUnit } = require('../services/order-workflow');
const { computeOrderTotals } = require('../services/order-pricing');
const { createOrderBuilder } = require('../services/order-builder');

const router = express.Router();
const orderBuilder = createOrderBuilder({
  productsRepository,
  pricingConfigRepository,
  couponsRepository,
  computeOrderTotals,
  isQuantityCompatibleWithUnit
});

const buildOrderPayload = async (order) => {
  const items = await ordersRepository.getOrderItemsByOrderId(order.id);
  const currencyCode = await appSettingsRepository.getCurrencyCode();
  return { ...order, items, currencyCode };
};

const buildPublicOrderPayload = async (order) => {
  const items = await publicOrdersRepository.getPublicOrderItemsByOrderId(order.id);
  const currencyCode = await appSettingsRepository.getCurrencyCode();
  return { ...order, items, currencyCode };
};

const isValidOrderStatus = (status) => ['pending', 'onpreparation', 'ondelivery', 'paid'].includes(status);

const validatePricingChanges = (changes) => {
  const numericFields = ['deliveryFee', 'serviceFeeRate', 'taxRate', 'discountRate'];
  for (const field of numericFields) {
    if (changes[field] !== undefined && !Number.isFinite(Number(changes[field]))) {
      return `${field} must be numeric`;
    }
  }

  if (changes.deliveryFee !== undefined && Number(changes.deliveryFee) < 0) {
    return 'deliveryFee must be greater than or equal to zero';
  }

  const rateFields = ['serviceFeeRate', 'taxRate', 'discountRate'];
  for (const field of rateFields) {
    if (changes[field] !== undefined) {
      const value = Number(changes[field]);
      if (value < 0 || value > 1) {
        return `${field} must be between 0 and 1`;
      }
    }
  }

  return null;
};

router.get('/orders/pricing-config', requireJwt, requireRole('superadmin'), async (_req, res) => {
  const pricing = await pricingConfigRepository.getPricingConfig();
  return res.status(200).json({ data: pricing });
});

router.patch('/orders/pricing-config', requireJwt, requireRole('superadmin'), async (req, res) => {
  const changes = req.body || {};
  const validationError = validatePricingChanges(changes);
  if (validationError) {
    return res.status(422).json({
      error: { code: 'VALIDATION_ERROR', message: validationError }
    });
  }

  const normalizedChanges = {
    ...(changes.deliveryFee !== undefined ? { deliveryFee: Number(changes.deliveryFee) } : {}),
    ...(changes.serviceFeeRate !== undefined ? { serviceFeeRate: Number(changes.serviceFeeRate) } : {}),
    ...(changes.taxRate !== undefined ? { taxRate: Number(changes.taxRate) } : {}),
    ...(changes.discountRate !== undefined ? { discountRate: Number(changes.discountRate) } : {})
  };

  const updated = await pricingConfigRepository.updatePricingConfig(normalizedChanges);
  return res.status(200).json({ data: updated });
});

router.get('/me/locations', requireJwt, async (req, res) => {
  const locations = await locationsRepository.getLocationsByUserId(req.user.id);
  return res.status(200).json({ data: locations });
});

router.post('/me/locations', requireJwt, async (req, res) => {
  const { label, address = null, latitude = null, longitude = null } = req.body || {};

  if (!label) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'label is required' }
    });
  }

  if (!address && (latitude === null || longitude === null)) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'address or latitude/longitude are required' }
    });
  }

  const location = await locationsRepository.createLocation({
    userId: req.user.id,
    label,
    address,
    latitude,
    longitude
  });

  return res.status(201).json({ data: location });
});

router.get('/me/orders', requireJwt, async (req, res) => {
  const orders = await ordersRepository.getOrdersByUserId(req.user.id);
  const payload = await Promise.all(orders.map(buildOrderPayload));
  return res.status(200).json({ data: payload });
});

router.post('/orders', requireJwt, async (req, res) => {
  const { locationId, deliveryMode, scheduledAt = null, items, couponCode = null } = req.body || {};

  if (!locationId) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'locationId, deliveryMode and items are required' }
    });
  }

  const location = await locationsRepository.getLocationById(locationId);
  if (!location || location.userId !== req.user.id) {
    return res.status(404).json({
      error: { code: 'LOCATION_NOT_FOUND', message: 'Location not found' }
    });
  }

  const builtOrder = await orderBuilder.buildOrderInput({ deliveryMode, scheduledAt, items, couponCode });
  if (builtOrder.error) {
    return res.status(builtOrder.error.status).json(builtOrder.error.body);
  }

  const order = await ordersRepository.createOrderWithItems({
    userId: req.user.id,
    locationId,
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

  return res.status(201).json({ data: await buildOrderPayload(order) });
});

router.patch('/orders/:id/confirm', requireJwt, requireRole('superadmin'), async (req, res) => {
  const order = await ordersRepository.getOrderById(req.params.id);
  if (!order) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Order not found' } });
  }

  if (!canTransitionOrderStatus({ currentStatus: order.status, nextStatus: 'onpreparation', actorRole: req.user.role })) {
    return res.status(409).json({ error: { code: 'INVALID_STATUS_TRANSITION', message: 'Cannot confirm this order' } });
  }

  const updated = await ordersRepository.updateOrderStatus({ orderId: order.id, status: 'onpreparation' });
  return res.status(200).json({ data: updated });
});

router.patch('/orders/:id/accept-delivery', requireJwt, requireRole('livreur'), async (req, res) => {
  const order = await ordersRepository.getOrderById(req.params.id);
  if (!order) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Order not found' } });
  }

  if (!canTransitionOrderStatus({ currentStatus: order.status, nextStatus: 'ondelivery', actorRole: req.user.role })) {
    return res.status(409).json({ error: { code: 'INVALID_STATUS_TRANSITION', message: 'Cannot accept this order' } });
  }

  const updated = await ordersRepository.updateOrderStatus({ orderId: order.id, status: 'ondelivery' });
  return res.status(200).json({ data: updated });
});

router.patch('/orders/:id/mark-paid', requireJwt, requireRole('livreur'), async (req, res) => {
  const order = await ordersRepository.getOrderById(req.params.id);
  if (!order) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Order not found' } });
  }

  if (!canTransitionOrderStatus({ currentStatus: order.status, nextStatus: 'paid', actorRole: req.user.role })) {
    return res.status(409).json({ error: { code: 'INVALID_STATUS_TRANSITION', message: 'Cannot mark this order as paid' } });
  }

  const updated = await ordersRepository.updateOrderStatus({ orderId: order.id, status: 'paid' });
  return res.status(200).json({ data: updated });
});

router.get('/public-orders', requireJwt, requireAnyRole(['superadmin', 'livreur']), async (req, res) => {
  const { status } = req.query;

  if (status && !isValidOrderStatus(status)) {
    return res.status(422).json({
      error: { code: 'VALIDATION_ERROR', message: 'status is invalid' }
    });
  }

  const orders = await publicOrdersRepository.getPublicOrders({ status });
  const payload = await Promise.all(orders.map(buildPublicOrderPayload));
  return res.status(200).json({ data: payload });
});

router.patch('/public-orders/:id/confirm', requireJwt, requireRole('superadmin'), async (req, res) => {
  const order = await publicOrdersRepository.getPublicOrderById(req.params.id);
  if (!order) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Public order not found' } });
  }

  if (!canTransitionOrderStatus({ currentStatus: order.status, nextStatus: 'onpreparation', actorRole: req.user.role })) {
    return res.status(409).json({ error: { code: 'INVALID_STATUS_TRANSITION', message: 'Cannot confirm this order' } });
  }

  const updated = await publicOrdersRepository.updatePublicOrderStatus({ orderId: order.id, status: 'onpreparation' });
  return res.status(200).json({ data: updated });
});

router.patch('/public-orders/:id/accept-delivery', requireJwt, requireRole('livreur'), async (req, res) => {
  const order = await publicOrdersRepository.getPublicOrderById(req.params.id);
  if (!order) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Public order not found' } });
  }

  if (!canTransitionOrderStatus({ currentStatus: order.status, nextStatus: 'ondelivery', actorRole: req.user.role })) {
    return res.status(409).json({ error: { code: 'INVALID_STATUS_TRANSITION', message: 'Cannot accept this order' } });
  }

  const updated = await publicOrdersRepository.updatePublicOrderStatus({ orderId: order.id, status: 'ondelivery' });
  return res.status(200).json({ data: updated });
});

router.patch('/public-orders/:id/mark-paid', requireJwt, requireRole('livreur'), async (req, res) => {
  const order = await publicOrdersRepository.getPublicOrderById(req.params.id);
  if (!order) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Public order not found' } });
  }

  if (!canTransitionOrderStatus({ currentStatus: order.status, nextStatus: 'paid', actorRole: req.user.role })) {
    return res.status(409).json({ error: { code: 'INVALID_STATUS_TRANSITION', message: 'Cannot mark this order as paid' } });
  }

  const updated = await publicOrdersRepository.updatePublicOrderStatus({ orderId: order.id, status: 'paid' });
  return res.status(200).json({ data: updated });
});

module.exports = { orderRouter: router };
