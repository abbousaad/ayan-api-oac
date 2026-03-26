const USER_LOCATIONS = [
  {
    id: 'loc-u1-home',
    userId: 'u-1',
    label: 'Home',
    address: '15 Market Street',
    latitude: null,
    longitude: null
  },
  {
    id: 'loc-u1-work',
    userId: 'u-1',
    label: 'Work',
    address: '78 Business Avenue',
    latitude: null,
    longitude: null
  }
];

const getUserLocationsStore = () => USER_LOCATIONS;

module.exports = { getUserLocationsStore };
