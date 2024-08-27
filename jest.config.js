/** @type {import('ts-jest').JestConfigWithTsJest} **/
export default {
  testEnvironment: "node",
  roots: ["dist"],
  transform: {
    "^.+.tsx?$": ["ts-jest", {}],
  },
};
