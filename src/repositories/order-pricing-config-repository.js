const { config } = require('../config/env');
const { runQuery } = require('../db/pool');
const { getOrderPricingConfigStore } = require('../data/order-pricing-config');

const mapPricingRow = (row) => ({
  deliveryFee: Number(row.delivery_fee),
  serviceFeeRate: Number(row.service_fee_rate),
  taxRate: Number(row.tax_rate),
  discountRate: Number(row.discount_rate)
});

const getPricingConfig = async () => {
  if (config.useInMemoryPersistence) {
    return { ...getOrderPricingConfigStore() };
  }

  const result = await runQuery(
    'SELECT delivery_fee, service_fee_rate, tax_rate, discount_rate FROM order_pricing_config WHERE id = $1 LIMIT 1',
    ['default']
  );

  if (!result.rows[0]) {
    return {
      deliveryFee: 3,
      serviceFeeRate: 0.05,
      taxRate: 0.1,
      discountRate: 0
    };
  }

  return mapPricingRow(result.rows[0]);
};

const updatePricingConfig = async (changes) => {
  if (config.useInMemoryPersistence) {
    const state = getOrderPricingConfigStore();
    Object.assign(state, changes);
    return { ...state };
  }

  const current = await getPricingConfig();
  const next = { ...current, ...changes };

  const result = await runQuery(
    `UPDATE order_pricing_config
     SET delivery_fee = $2,
         service_fee_rate = $3,
         tax_rate = $4,
         discount_rate = $5,
         updated_at = NOW()
     WHERE id = $1
     RETURNING delivery_fee, service_fee_rate, tax_rate, discount_rate`,
    ['default', next.deliveryFee, next.serviceFeeRate, next.taxRate, next.discountRate]
  );

  return result.rows[0] ? mapPricingRow(result.rows[0]) : null;
};

module.exports = { getPricingConfig, updatePricingConfig };
