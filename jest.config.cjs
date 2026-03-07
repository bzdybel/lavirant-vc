module.exports = {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  moduleFileExtensions: ["ts", "tsx", "js", "json"],

  // Only run files that end in .test.ts — this prevents helper/fixture files
  // under __tests__/ directories from being mistakenly executed as test suites.
  testMatch: ["**/*.test.ts"],

  // Automatically reset mock state before every test so individual files do
  // not need to call jest.clearAllMocks() in their own beforeEach hooks.
  clearMocks: true,

  // Generous timeout for job tests that rely on real timers.
  testTimeout: 10000,

  moduleNameMapper: {
    "^@shared/(.*)$": "<rootDir>/shared/$1",
  },
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { useESM: true, tsconfig: "<rootDir>/tsconfig.json" }],
  },

};