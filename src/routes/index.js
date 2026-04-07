const express = require('express');
const { publicRouter } = require('./public.routes');
const { protectedRouter } = require('./protected.routes');
const { productRouter } = require('./product.routes');
const { storeRouter } = require('./store.routes');
const { orderRouter } = require('./order.routes');
const { couponRouter } = require('./coupon.routes');
const { settingsRouter } = require('./settings.routes');

const apiRouter = express.Router();

apiRouter.use(publicRouter);
apiRouter.use(protectedRouter);
apiRouter.use(productRouter);
apiRouter.use(storeRouter);
apiRouter.use(orderRouter);
apiRouter.use(couponRouter);
apiRouter.use(settingsRouter);

module.exports = { apiRouter };
