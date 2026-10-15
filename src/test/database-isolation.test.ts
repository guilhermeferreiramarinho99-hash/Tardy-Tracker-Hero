// @vitest-environment node
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("Database school isolation (real PostgreSQL, actual migrations)", () => {
  it("allows authorized reads and changes only within each school", () => {
    const runner = fileURLToPath(new URL("../../scripts/test-db-isolation.sh", import.meta.url));
    const output = execFileSync("bash", [runner], {
      encoding: "utf8",
      timeout: 90_000,
      maxBuffer: 2 * 1024 * 1024,
    });
    expect(output).toContain("PASS: school isolation, authorized writes, role restrictions, audit and rollback");
  }, 100_000);
});