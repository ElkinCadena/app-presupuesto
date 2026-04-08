module.exports = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  collectCoverage: true,
  coverageDirectory: "coverage",
  moduleNameMapper: {
  "\\.(css|less|scss)$": "identity-obj-proxy",
  "^@/(.*)$": "<rootDir>/src/$1"   
},
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  transform: {
  "^.+\\.tsx?$": ["ts-jest", {
    tsconfig: {
      jsx: "react-jsx"
    }
  }]
},
};