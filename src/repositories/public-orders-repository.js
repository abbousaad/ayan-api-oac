const { randomUUID } = require('crypto');
const { config } = require('../config/env');
const { runQuery, withTransaction } = require('../db/pool');
const { getPublicOrdersStore, getPublicOrderItemsStore } = require('../data/public-orders');

const mapPublicOrderRow = (row) => ({
  id: row.id,
  guestName: row.guest_name,
  guestPhone: row.guest_phone,
  guestEmail: row.guest_email,
  guestAddress: row.guest_address,
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

const getPublicOrderById = async (id) => {
  if (config.useInMemoryPersistence) {
    return getPublicOrdersStore().find((order) => order.id === id) || null;
  }

  const result = await runQuery(
    `SELECT id, guest_name, guest_phone, guest_email, guest_address, delivery_mode, scheduled_at, status,
            subtotal_amount, delivery_fee, service_fee, tax_amount, discount_amount,
            coupon_id, coupon_code, coupon_discount_amount, grand_total, total_amount
     FROM public_orders
     WHERE id = $1
     LIMIT 1`,
    [id]
  );

  return result.rows[0] ? mapPublicOrderRow(result.rows[0]) : null;
};

const getPublicOrders = async ({ status } = {}) => {
  if (config.useInMemoryPersistence) {
    const entries = status
      ? getPublicOrdersStore().filter((order) => order.status === status)
      : getPublicOrdersStore();
    return [...entries].reverse();
  }

  if (status) {
    const result = await runQuery(
      `SELECT id, guest_name, guest_phone, guest_email, guest_address, delivery_mode, scheduled_at, status,
              subtotal_amount, delivery_fee, service_fee, tax_amount, discount_amount,
              coupon_id, coupon_code, coupon_discount_amount, grand_total, total_amount
       FROM public_orders
       WHERE status = $1
       ORDER BY created_at DESC`,
      [status]
    );

    return result.rows.map(mapPublicOrderRow);
  }

  const result = await runQuery(
    `SELECT id, guest_name, guest_phone, guest_email, guest_address, delivery_mode, scheduled_at, status,
            subtotal_amount, delivery_fee, service_fee, tax_amount, discount_amount,
            coupon_id, coupon_code, coupon_discount_amount, grand_total, total_amount
     FROM public_orders
     ORDER BY created_at DESC`
  );

  return result.rows.map(mapPublicOrderRow);
};

const getPublicOrderItemsByOrderId = async (publicOrderId) => {
  if (config.useInMemoryPersistence) {
    return getPublicOrderItemsStore().filter((item) => item.publicOrderId === publicOrderId);
  }

  const result = await runQuery(
    `SELECT id, public_order_id, product_id, product_name, unit, quantity, unit_price, line_total
     FROM public_order_items
     WHERE public_order_id = $1
     ORDER BY created_at ASC`,
    [publicOrderId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    publicOrderId: row.public_order_id,
    productId: row.product_id,
    productName: row.product_name,
    unit: row.unit,
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
    lineTotal: Number(row.line_total)
  }));
};

const createPublicOrderWithItems = async ({ guest, deliveryMode, scheduledAt, items, totals, couponId = null, couponCode = null }) => {
  const orderId = `pub-ord-${randomUUID()}`;

  if (config.useInMemoryPersistence) {
    const order = {
      id: orderId,
      guestName: guest.name,
      guestPhone: guest.phone,
      guestEmail: guest.email,
      guestAddress: guest.address,
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

    getPublicOrdersStore().push(order);
    items.forEach((item) => {
      getPublicOrderItemsStore().push({
        id: `pub-ord-item-${randomUUID()}`,
        publicOrderId: orderId,
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
      `INSERT INTO public_orders (
         id, guest_name, guest_phone, guest_email, guest_address, delivery_mode, scheduled_at, status,
         subtotal_amount, delivery_fee, service_fee, tax_amount, discount_amount,
         coupon_id, coupon_code, coupon_discount_amount, grand_total, total_amount
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       RETURNING id, guest_name, guest_phone, guest_email, guest_address, delivery_mode, scheduled_at, status,
                 subtotal_amount, delivery_fee, service_fee, tax_amount, discount_amount,
                 coupon_id, coupon_code, coupon_discount_amount, grand_total, total_amount`,
      [
        orderId,
        guest.name,
        guest.phone,
        guest.email,
        guest.address,
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
        `INSERT INTO public_order_items (id, public_order_id, product_id, product_name, unit, quantity, unit_price, line_total)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [`pub-ord-item-${randomUUID()}`, orderId, item.productId, item.productName, item.unit, Number(item.quantity), Number(item.unitPrice), Number(item.lineTotal)]
      );
    }

    return mapPublicOrderRow(orderResult.rows[0]);
  });
};

const updatePublicOrderStatus = async ({ orderId, status }) => {
  if (config.useInMemoryPersistence) {
    const order = getPublicOrdersStore().find((entry) => entry.id === orderId);
    if (!order) {
      return null;
    }

    order.status = status;
    return order;
  }

  const result = await runQuery(
    `UPDATE public_orders
     SET status = $2, updated_at = NOW()
     WHERE id = $1
     RETURNING id, guest_name, guest_phone, guest_email, guest_address, delivery_mode, scheduled_at, status,
               subtotal_amount, delivery_fee, service_fee, tax_amount, discount_amount,
               coupon_id, coupon_code, coupon_discount_amount, grand_total, total_amount`,
    [orderId, status]
  );

  return result.rows[0] ? mapPublicOrderRow(result.rows[0]) : null;
};

module.exports = {
  createPublicOrderWithItems,
  getPublicOrderItemsByOrderId,
  getPublicOrderById,
  getPublicOrders,
  updatePublicOrderStatus
};
