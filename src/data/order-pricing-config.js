const ORDER_PRICING_CONFIG = {
  deliveryFee: 3,
  serviceFeeRate: 0.05,
  taxRate: 0.1,
  discountRate: 0
};

const getOrderPricingConfigStore = () => ORDER_PRICING_CONFIG;

module.exports = { getOrderPricingConfigStore };
