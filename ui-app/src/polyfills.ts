const g = globalThis as any;
const poly = () => {
  if (g.crypto && typeof g.crypto.getRandomValues === "function") {
    const buf = new Uint8Array(16);
    g.crypto.getRandomValues(buf);
    buf[6] = (buf[6] & 0x0f) | 0x40;
    buf[8] = (buf[8] & 0x3f) | 0x80;
    const hex = Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return `uuid-${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
};

const ensureRandomUUID = () => {
  let cryptoObj = g.crypto;
  if (!cryptoObj || typeof cryptoObj !== "object") cryptoObj = {};
  try {
    const CryptoCtor = g.Crypto;
    if (CryptoCtor?.prototype && typeof CryptoCtor.prototype.randomUUID !== "function") {
      CryptoCtor.prototype.randomUUID = poly;
    }
  } catch {}
  if (typeof cryptoObj.randomUUID !== "function") {
    try {
      cryptoObj.randomUUID = poly;
    } catch {}
    try {
      Object.defineProperty(cryptoObj, "randomUUID", { value: poly, configurable: true, writable: true });
    } catch {}
  }
  if (!g.crypto || g.crypto !== cryptoObj || typeof g.crypto.randomUUID !== "function") {
    try {
      Object.defineProperty(g, "crypto", { value: cryptoObj, configurable: true, writable: true });
    } catch {}
    try {
      g.crypto = cryptoObj;
    } catch {}
  }
  if (typeof g.crypto?.randomUUID !== "function") {
    try {
      g.randomUUID = poly;
    } catch {}
  }
};

ensureRandomUUID();

if (typeof window !== "undefined") {
  window.addEventListener(
    "error",
    (event) => {
      if (typeof event?.message === "string" && event.message.includes("gn is not defined")) {
        event.preventDefault();
      }
    },
    true
  );
}
