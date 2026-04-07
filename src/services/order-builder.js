const createOrderBuilder = ({ productsRepository, pricingConfigRepository, couponsRepository, computeOrderTotals, isQuantityCompatibleWithUnit }) => {
  const resolveItems = async (items) => {
    const resolvedItems = [];

    for (const item of items) {
      if (!item.productId || item.quantity === undefined) {
        return { error: { status: 400, body: { error: { code: 'VALIDATION_ERROR', message: 'Each item requires productId and quantity' } } } };
      }

      const product = await productsRepository.getProductById(item.productId);
      if (!product) {
        return { error: { status: 404, body: { error: { code: 'PRODUCT_NOT_FOUND', message: `Product ${item.productId} not found` } } } };
      }

      if (!isQuantityCompatibleWithUnit(product.unit, item.quantity)) {
        return { error: { status: 422, body: { error: { code: 'INVALID_QUANTITY', message: `Quantity is invalid for unit ${product.unit}` } } } };
      }

      const quantity = Number(item.quantity);
      resolvedItems.push({
        productId: product.id,
        productName: product.name,
        unit: product.unit,
        quantity,
        unitPrice: product.price,
        lineTotal: Number((product.price * quantity).toFixed(2))
      });
    }

    return { data: resolvedItems };
  };

  const resolveCoupon = async ({ couponCode, items }) => {
    if (!couponCode) {
      return { data: { coupon: null, couponDiscountAmount: 0 } };
    }

    const coupon = await couponsRepository.getCouponByCode(couponCode);
    const now = new Date();
    const startsAt = coupon ? new Date(coupon.startsAt) : null;
    const endsAt = coupon ? new Date(coupon.endsAt) : null;
    const usageExceeded = coupon && coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses;

    if (!coupon || !coupon.isActive || Number.isNaN(startsAt?.getTime()) || Number.isNaN(endsAt?.getTime()) || now < startsAt || now > endsAt || usageExceeded) {
      return { error: { status: 422, body: { error: { code: 'INVALID_COUPON', message: 'Coupon is invalid or unavailable' } } } };
    }

    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const discount = coupon.discountType === 'percentage'
      ? Number((subtotal * coupon.discountValue).toFixed(2))
      : Number(coupon.discountValue);

    return {
      data: {
        coupon,
        couponDiscountAmount: Number(Math.max(0, Math.min(subtotal, discount)).toFixed(2))
      }
    };
  };

  const buildOrderInput = async ({ deliveryMode, scheduledAt = null, items, couponCode = null }) => {
    if (!deliveryMode || !Array.isArray(items) || items.length === 0) {
      return { error: { status: 400, body: { error: { code: 'VALIDATION_ERROR', message: 'deliveryMode and items are required' } } } };
    }

    if (deliveryMode !== 'instant' && deliveryMode !== 'scheduled') {
      return { error: { status: 422, body: { error: { code: 'INVALID_DELIVERY_MODE', message: 'deliveryMode must be instant or scheduled' } } } };
    }

    if (deliveryMode === 'scheduled' && !scheduledAt) {
      return { error: { status: 422, body: { error: { code: 'INVALID_SCHEDULE', message: 'scheduledAt is required for scheduled deliveries' } } } };
    }

    const resolvedItems = await resolveItems(items);
    if (resolvedItems.error) {
      return resolvedItems;
    }

    const resolvedCoupon = await resolveCoupon({ couponCode, items: resolvedItems.data });
    if (resolvedCoupon.error) {
      return resolvedCoupon;
    }

    const pricingConfig = await pricingConfigRepository.getPricingConfig();
    return {
      data: {
        items: resolvedItems.data,
        pricingConfig,
        totals: computeOrderTotals({
          items: resolvedItems.data,
          pricingConfig,
          couponDiscountAmount: resolvedCoupon.data.couponDiscountAmount
        }),
        coupon: resolvedCoupon.data.coupon
      }
    };
  };

  return { buildOrderInput };
};

module.exports = { createOrderBuilder };
