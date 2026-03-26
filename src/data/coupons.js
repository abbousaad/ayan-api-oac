const now = new Date();
const inOneDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);
const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

const COUPONS = [
  {
    id: 'cp-welcome10',
    code: 'WELCOME10',
    discountType: 'percentage',
    discountValue: 0.1,
    startsAt: yesterday.toISOString(),
    endsAt: inOneDay.toISOString(),
    isActive: true,
    maxUses: null,
    usedCount: 0
  },
  {
    id: 'cp-expired5',
    code: 'EXPIRED5',
    discountType: 'fixed',
    discountValue: 5,
    startsAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    endsAt: yesterday.toISOString(),
    isActive: true,
    maxUses: null,
    usedCount: 0
  }
];

const getCouponsStore = () => COUPONS;

module.exports = { getCouponsStore };
