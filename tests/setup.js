// Global test setup
require('dotenv').config();

// Setup timeout
jest.setTimeout(10000);

// Mock console pour tests
beforeAll(() => {
  global.console = {
    ...console,
    log: jest.fn(),
  };
});
