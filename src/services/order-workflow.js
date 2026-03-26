const isPositiveQuantity = (quantity) => Number(quantity) > 0;

const isQuantityCompatibleWithUnit = (unit, quantity) => {
  if (!isPositiveQuantity(quantity)) {
    return false;
  }

  if (unit === 'unit') {
    return Number.isInteger(Number(quantity));
  }

  return true;
};

const canTransitionOrderStatus = ({ currentStatus, nextStatus, actorRole }) => {
  if (currentStatus === 'pending' && nextStatus === 'onpreparation' && actorRole === 'superadmin') {
    return true;
  }

  if (currentStatus === 'onpreparation' && nextStatus === 'ondelivery' && actorRole === 'livreur') {
    return true;
  }

  if (currentStatus === 'ondelivery' && nextStatus === 'paid' && actorRole === 'livreur') {
    return true;
  }

  return false;
};

module.exports = { isQuantityCompatibleWithUnit, canTransitionOrderStatus };
