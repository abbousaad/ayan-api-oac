const PUBLIC_ORDERS = [];
const PUBLIC_ORDER_ITEMS = [];

const getPublicOrdersStore = () => PUBLIC_ORDERS;
const getPublicOrderItemsStore = () => PUBLIC_ORDER_ITEMS;

module.exports = { getPublicOrdersStore, getPublicOrderItemsStore };
