const express = require('express');
const { requireJwt, requireRole } = require('../auth/auth-middleware');
const locationsRepository = require('../repositories/user-locations-repository');
const ordersRepository = require('../repositories/orders-repository');
const productsRepository = require('../repositories/products-repository');
const pricingConfigRepository = require('../repositories/order-pricing-config-repository');
const couponsRepository = require('../repositories/coupons-repository');
const { canTransitionOrderStatus, isQuantityCompatibleWithUnit } = require('../services/order-workflow');
const { computeOrderTotals } = require('../services/order-pricing');

const router = express.Router();

const buildOrderPayload = async (order) => {
  const items = await ordersRepository.getOrderItemsByOrderId(order.id);
  return { ...order, items };
};

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

  if (!locationId || !deliveryMode || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'locationId, deliveryMode and items are required' }
    });
  }

  if (deliveryMode !== 'instant' && deliveryMode !== 'scheduled') {
    return res.status(422).json({
      error: { code: 'INVALID_DELIVERY_MODE', message: 'deliveryMode must be instant or scheduled' }
    });
  }

  if (deliveryMode === 'scheduled' && !scheduledAt) {
    return res.status(422).json({
      error: { code: 'INVALID_SCHEDULE', message: 'scheduledAt is required for scheduled deliveries' }
    });
  }

  const location = await locationsRepository.getLocationById(locationId);
  if (!location || location.userId !== req.user.id) {
    return res.status(404).json({
      error: { code: 'LOCATION_NOT_FOUND', message: 'Location not found' }
    });
  }

  const resolvedItems = [];
  for (const item of items) {
    if (!item.productId || item.quantity === undefined) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Each item requires productId and quantity' }
      });
    }

    const product = await productsRepository.getProductById(item.productId);
    if (!product) {
      return res.status(404).json({
        error: { code: 'PRODUCT_NOT_FOUND', message: `Product ${item.productId} not found` }
      });
    }

    if (!isQuantityCompatibleWithUnit(product.unit, item.quantity)) {
      return res.status(422).json({
        error: { code: 'INVALID_QUANTITY', message: `Quantity is invalid for unit ${product.unit}` }
      });
    }

    const quantity = Number(item.quantity);
    const lineTotal = Number((product.price * quantity).toFixed(2));

    resolvedItems.push({
      productId: product.id,
      productName: product.name,
      unit: product.unit,
      quantity,
      unitPrice: product.price,
      lineTotal
    });
  }

  let validCoupon = null;
  let couponDiscountAmount = 0;
  if (couponCode) {
    validCoupon = await couponsRepository.getCouponByCode(couponCode);
    const now = new Date();
    const startsAt = validCoupon ? new Date(validCoupon.startsAt) : null;
    const endsAt = validCoupon ? new Date(validCoupon.endsAt) : null;
    const usageExceeded = validCoupon && validCoupon.maxUses !== null && validCoupon.usedCount >= validCoupon.maxUses;

    if (
      !validCoupon ||
      !validCoupon.isActive ||
      Number.isNaN(startsAt?.getTime()) ||
      Number.isNaN(endsAt?.getTime()) ||
      now < startsAt ||
      now > endsAt ||
      usageExceeded
    ) {
      return res.status(422).json({
        error: { code: 'INVALID_COUPON', message: 'Coupon is invalid or unavailable' }
      });
    }

    const subtotalPreview = resolvedItems.reduce((sum, item) => sum + item.lineTotal, 0);
    if (validCoupon.discountType === 'percentage') {
      couponDiscountAmount = Number((subtotalPreview * validCoupon.discountValue).toFixed(2));
    } else {
      couponDiscountAmount = Number(validCoupon.discountValue);
    }
    couponDiscountAmount = Number(Math.max(0, Math.min(subtotalPreview, couponDiscountAmount)).toFixed(2));
  }

  const pricingConfig = await pricingConfigRepository.getPricingConfig();
  const totals = computeOrderTotals({ items: resolvedItems, pricingConfig, couponDiscountAmount });

  const order = await ordersRepository.createOrderWithItems({
    userId: req.user.id,
    locationId,
    deliveryMode,
    scheduledAt: deliveryMode === 'scheduled' ? scheduledAt : null,
    items: resolvedItems,
    totals,
    couponId: validCoupon ? validCoupon.id : null,
    couponCode: validCoupon ? validCoupon.code : null
  });

  if (validCoupon) {
    await couponsRepository.incrementCouponUsage(validCoupon.id);
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

module.exports = { orderRouter: router };
