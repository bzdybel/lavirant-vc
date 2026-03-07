const ACCESS_KEY = "lavirant_private_access";
const PASSWORD = "LavirantDev123!";

export function ensurePrivateAccess() {
  if (typeof window === "undefined") return;

  const allowed = localStorage.getItem(ACCESS_KEY) === "ok";

  if (allowed) return;

  const input = window.prompt("🔒 Dostęp tymczasowy – podaj hasło:");

  if (input === PASSWORD) {
    localStorage.setItem(ACCESS_KEY, "ok");
    window.location.reload();
  } else {
    alert("❌ Brak dostępu");
    window.location.href = "/";
  }
}
