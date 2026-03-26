const roundMoney = (value) => Number(Number(value).toFixed(2));

const computeOrderTotals = ({ items, pricingConfig, couponDiscountAmount = 0 }) => {
  const subtotalAmount = roundMoney(items.reduce((sum, item) => sum + Number(item.lineTotal), 0));
  const deliveryFee = roundMoney(pricingConfig.deliveryFee);
  const serviceFee = roundMoney(subtotalAmount * pricingConfig.serviceFeeRate);
  const taxAmount = roundMoney(subtotalAmount * pricingConfig.taxRate);
  const discountAmount = roundMoney(subtotalAmount * pricingConfig.discountRate);
  const safeCouponDiscountAmount = roundMoney(Math.max(0, Number(couponDiscountAmount)));
  const grandTotal = roundMoney(
    Math.max(0, subtotalAmount + deliveryFee + serviceFee + taxAmount - discountAmount - safeCouponDiscountAmount)
  );

  return {
    subtotalAmount,
    deliveryFee,
    serviceFee,
    taxAmount,
    discountAmount,
    couponDiscountAmount: safeCouponDiscountAmount,
    grandTotal,
    totalAmount: grandTotal
  };
};

module.exports = { computeOrderTotals, roundMoney };
