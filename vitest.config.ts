import { defineConfig } from "vitest/config";

// contracts/generated holds conformance tests for the codecs (node:test, Kotlin, Swift): they run against a codec, not here.
export default defineConfig({ test: { include: ["test/**/*.test.ts"] } });
