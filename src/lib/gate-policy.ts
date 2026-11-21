export function gateVersionMatches(unlockedVersion: string | undefined, currentVersion: string) {
  return unlockedVersion === currentVersion;
}

export function validateGatePassword(password: string) {
  if (password.length < 12 || password.length > 128) throw new Error("Use uma senha de 12 a 128 caracteres.");
}