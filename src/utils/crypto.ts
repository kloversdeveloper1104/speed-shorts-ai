// OAuthトークン等の機密情報をディスクに保存する前に暗号化するユーティリティ
// AES-256-GCM を使用。鍵は TOKEN_ENCRYPTION_KEY (.env) から取得、未設定時は
// tokens/.encryption_key に自動生成して保存する(初回起動時のみ)。

import crypto from "crypto";
import fs from "fs";
import path from "path";

const KEY_FILE = path.join(process.cwd(), "tokens", ".encryption_key");

function loadOrCreateKey(): Buffer {
  const fromEnv = process.env.TOKEN_ENCRYPTION_KEY;
  if (fromEnv && fromEnv.length >= 32) {
    return crypto.createHash("sha256").update(fromEnv).digest();
  }

  fs.mkdirSync(path.dirname(KEY_FILE), { recursive: true });
  if (fs.existsSync(KEY_FILE)) {
    return Buffer.from(fs.readFileSync(KEY_FILE, "utf8"), "hex");
  }

  const key = crypto.randomBytes(32);
  fs.writeFileSync(KEY_FILE, key.toString("hex"), { mode: 0o600 });
  return key;
}

export function encryptSecret(plainText: string): string {
  const key = loadOrCreateKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(":");
}

export function decryptSecret(payload: string): string {
  const key = loadOrCreateKey();
  const [ivHex, authTagHex, dataHex] = payload.split(":");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
