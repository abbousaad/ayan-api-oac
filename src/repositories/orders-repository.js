const { randomUUID } = require('crypto');
const { config } = require('../config/env');
const { runQuery, withTransaction } = require('../db/pool');
const { getOrdersStore, getOrderItemsStore } = require('../data/orders');

const mapOrderRow = (row) => ({
  id: row.id,
  userId: row.user_id,
  locationId: row.location_id,
  deliveryMode: row.delivery_mode,
  scheduledAt: row.scheduled_at,
  status: row.status,
  subtotalAmount: Number(row.subtotal_amount),
  deliveryFee: Number(row.delivery_fee),
  serviceFee: Number(row.service_fee),
  taxAmount: Number(row.tax_amount),
  discountAmount: Number(row.discount_amount),
  couponId: row.coupon_id,
  couponCode: row.coupon_code,
  couponDiscountAmount: Number(row.coupon_discount_amount),
  grandTotal: Number(row.grand_total),
  totalAmount: Number(row.total_amount)
});

const mapOrderItemRow = (row) => ({
  id: row.id,
  orderId: row.order_id,
  productId: row.product_id,
  productName: row.product_name,
  unit: row.unit,
  quantity: Number(row.quantity),
  unitPrice: Number(row.unit_price),
  lineTotal: Number(row.line_total)
});

const getOrderById = async (id) => {
  if (config.useInMemoryPersistence) {
    return getOrdersStore().find((order) => order.id === id) || null;
  }

  const result = await runQuery(
    `SELECT id, user_id, location_id, delivery_mode, scheduled_at, status,
            subtotal_amount, delivery_fee, service_fee, tax_amount, discount_amount,
            coupon_id, coupon_code, coupon_discount_amount, grand_total, total_amount
     FROM orders
     WHERE id = $1
     LIMIT 1`,
    [id]
  );

  return result.rows[0] ? mapOrderRow(result.rows[0]) : null;
};

const getOrderItemsByOrderId = async (orderId) => {
  if (config.useInMemoryPersistence) {
    return getOrderItemsStore().filter((item) => item.orderId === orderId);
  }

  const result = await runQuery(
    `SELECT id, order_id, product_id, product_name, unit, quantity, unit_price, line_total
     FROM order_items
     WHERE order_id = $1
     ORDER BY created_at ASC`,
    [orderId]
  );

  return result.rows.map(mapOrderItemRow);
};

const getOrdersByUserId = async (userId) => {
  if (config.useInMemoryPersistence) {
    return getOrdersStore().filter((order) => order.userId === userId);
  }

  const result = await runQuery(
    `SELECT id, user_id, location_id, delivery_mode, scheduled_at, status,
            subtotal_amount, delivery_fee, service_fee, tax_amount, discount_amount,
            coupon_id, coupon_code, coupon_discount_amount, grand_total, total_amount
     FROM orders
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );

  return result.rows.map(mapOrderRow);
};

const createOrderWithItems = async ({
  userId,
  locationId,
  deliveryMode,
  scheduledAt,
  items,
  totals,
  couponId = null,
  couponCode = null
}) => {
  const orderId = `ord-${randomUUID()}`;

  if (config.useInMemoryPersistence) {
    const order = {
      id: orderId,
      userId,
      locationId,
      deliveryMode,
      scheduledAt,
      status: 'pending',
      subtotalAmount: Number(totals.subtotalAmount),
      deliveryFee: Number(totals.deliveryFee),
      serviceFee: Number(totals.serviceFee),
      taxAmount: Number(totals.taxAmount),
      discountAmount: Number(totals.discountAmount),
      couponId,
      couponCode,
      couponDiscountAmount: Number(totals.couponDiscountAmount || 0),
      grandTotal: Number(totals.grandTotal),
      totalAmount: Number(totals.totalAmount)
    };

    getOrdersStore().push(order);

    items.forEach((item) => {
      getOrderItemsStore().push({
        id: `ord-item-${randomUUID()}`,
        orderId,
        productId: item.productId,
        productName: item.productName,
        unit: item.unit,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        lineTotal: Number(item.lineTotal)
      });
    });

    return order;
  }

  return withTransaction(async (client) => {
    const orderResult = await client.query(
      `INSERT INTO orders (
         id, user_id, location_id, delivery_mode, scheduled_at, status,
         subtotal_amount, delivery_fee, service_fee, tax_amount, discount_amount,
         coupon_id, coupon_code, coupon_discount_amount, grand_total, total_amount
       )
       VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING id, user_id, location_id, delivery_mode, scheduled_at, status,
                 subtotal_amount, delivery_fee, service_fee, tax_amount, discount_amount,
                 coupon_id, coupon_code, coupon_discount_amount, grand_total, total_amount`,
      [
        orderId,
        userId,
        locationId,
        deliveryMode,
        scheduledAt,
        Number(totals.subtotalAmount),
        Number(totals.deliveryFee),
        Number(totals.serviceFee),
        Number(totals.taxAmount),
        Number(totals.discountAmount),
        couponId,
        couponCode,
        Number(totals.couponDiscountAmount || 0),
        Number(totals.grandTotal),
        Number(totals.totalAmount)
      ]
    );

    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (id, order_id, product_id, product_name, unit, quantity, unit_price, line_total)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          `ord-item-${randomUUID()}`,
          orderId,
          item.productId,
          item.productName,
          item.unit,
          Number(item.quantity),
          Number(item.unitPrice),
          Number(item.lineTotal)
        ]
      );
    }

    return mapOrderRow(orderResult.rows[0]);
  });
};

const updateOrderStatus = async ({ orderId, status }) => {
  if (config.useInMemoryPersistence) {
    const order = getOrdersStore().find((entry) => entry.id === orderId);
    if (!order) {
      return null;
    }

    order.status = status;
    return order;
  }

  const result = await runQuery(
    `UPDATE orders
     SET status = $2, updated_at = NOW()
     WHERE id = $1
     RETURNING id, user_id, location_id, delivery_mode, scheduled_at, status,
               subtotal_amount, delivery_fee, service_fee, tax_amount, discount_amount,
               coupon_id, coupon_code, coupon_discount_amount, grand_total, total_amount`,
    [orderId, status]
  );

  return result.rows[0] ? mapOrderRow(result.rows[0]) : null;
};

module.exports = {
  getOrderById,
  getOrderItemsByOrderId,
  getOrdersByUserId,
  createOrderWithItems,
  updateOrderStatus
};
