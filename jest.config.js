module.exports = {
	collectCoverage: true,
	coverageDirectory: "coverage",
	coverageReporters: ["text", "lcov"],
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70,
        },
    },
  	preset: 'ts-jest',
  	testEnvironment: 'node',
};