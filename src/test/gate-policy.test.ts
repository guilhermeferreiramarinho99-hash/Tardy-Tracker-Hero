import { describe, expect, it } from "vitest";
import { gateVersionMatches, validateGatePassword } from "@/lib/gate-policy";

describe("Senha adicional da escola", () => {
  it("uma senha correta mantém o aparelho liberado na mesma versão", () => {
    expect(gateVersionMatches("v1", "v1")).toBe(true);
  });
  it("trocar a senha invalida a liberação anterior", () => {
    expect(gateVersionMatches("v1", "v2")).toBe(false);
  });
  it("um aparelho nunca liberado precisa informar a senha", () => {
    expect(gateVersionMatches(undefined, "v1")).toBe(false);
  });
  it("rejeita senha nova curta e aceita senha longa", () => {
    expect(() => validateGatePassword("12345678")).toThrow();
    expect(() => validateGatePassword("senha-ficticia-segura")).not.toThrow();
  });
});