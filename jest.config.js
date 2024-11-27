{
    "preset": "ts-jest",
    "testEnvironment": "node",
    "roots": ["<rootDir>/src", "<rootDir>/tests"],
    "moduleNameMapper": {
        "^@core/(.*)$": "<rootDir>/src/core/$1",
        "^@application/(.*)$": "<rootDir>/src/application/$1",
        "^@infrastructure/(.*)$": "<rootDir>/src/infrastructure/$1",
        "^@presentation/(.*)$": "<rootDir>/src/presentation/$1",
        "^@config/(.*)$": "<rootDir>/src/config/$1"
    },
}