// Microsoft Edge Read Aloud (無料TTS) の軽量クライアント。
// 既存のnpmパッケージ(msedge-tts)はMicrosoftが追加した署名検証(Sec-MS-GEC)に
// 対応しておらず接続が403で拒否されるため、自前で実装する。
// アルゴリズムはPython版 edge-tts (rany2/edge-tts) の実装を参考にした。

import { WebSocket } from "ws";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
// Microsoft側がChromiumバージョンを検証しているため、実在する新しめのバージョンを指定する必要がある。
const CHROMIUM_FULL_VERSION = "143.0.3650.96";
const WSS_BASE_URL = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}`;

const WIN_EPOCH = 11644473600n; // 1601-01-01 から 1970-01-01 までの秒数

function generateSecMsGec(): string {
  // JSのNumberは2^53を超える精度を保持できないため、BigIntで計算する。
  let ticksSec = BigInt(Math.floor(Date.now() / 1000)) + WIN_EPOCH;
  ticksSec -= ticksSec % 300n; // 5分単位に切り下げ
  const ticks100ns = ticksSec * 10000000n; // 秒 -> 100ns単位(Windowsティック)
  const strToHash = `${ticks100ns.toString()}${TRUSTED_CLIENT_TOKEN}`;
  return crypto.createHash("sha256").update(strToHash, "ascii").digest("hex").toUpperCase();
}

function connectId(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

function buildConnectUrl(): string {
  return `${WSS_BASE_URL}&Sec-MS-GEC=${generateSecMsGec()}&Sec-MS-GEC-Version=1-${CHROMIUM_FULL_VERSION}&ConnectionId=${connectId()}`;
}

const REQUEST_HEADERS = {
  "Origin": "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0",
};

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export interface EdgeTtsSynthesizeResult {
  audioBuffer: Buffer;
}

/** テキストをMP3音声に変換する(Microsoft Edge Read Aloud, 無料・APIキー不要) */
export function synthesizeEdgeTts(text: string, voice: string): Promise<EdgeTtsSynthesizeResult> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(buildConnectUrl(), { headers: REQUEST_HEADERS });
    const audioChunks: Buffer[] = [];
    let settled = false;

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        ws.terminate();
        reject(new Error("EdgeTTS: タイムアウトしました(30秒)"));
      }
    }, 30000);

    ws.on("open", () => {
      const requestId = crypto.randomUUID().replace(/-/g, "");
      const configMessage =
        `X-Timestamp:${new Date().toISOString()}\r\n` +
        `Content-Type:application/json; charset=utf-8\r\n` +
        `Path:speech.config\r\n\r\n` +
        JSON.stringify({
          context: {
            synthesis: {
              audio: {
                metadataoptions: { sentenceBoundaryEnabled: false, wordBoundaryEnabled: false },
                outputFormat: "audio-24khz-48kbitrate-mono-mp3",
              },
            },
          },
        });
      ws.send(configMessage);

      const ssml =
        `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='ja-JP'>` +
        `<voice name='${voice}'>` +
        `<prosody pitch='+0Hz' rate='+0%' volume='+0%'>${escapeXml(text)}</prosody>` +
        `</voice></speak>`;

      const ssmlMessage =
        `X-RequestId:${requestId}\r\n` +
        `Content-Type:application/ssml+xml\r\n` +
        `X-Timestamp:${new Date().toISOString()}\r\n` +
        `Path:ssml\r\n\r\n${ssml}`;
      ws.send(ssmlMessage);
    });

    ws.on("message", (data: Buffer, isBinary: boolean) => {
      if (isBinary) {
        // バイナリメッセージ: ヘッダー長(2byte) + ヘッダー文字列 + 音声データ
        const headerLength = data.readUInt16BE(0);
        const audioData = data.subarray(headerLength + 2);
        audioChunks.push(Buffer.from(audioData));
        return;
      }

      const message = data.toString();
      if (message.includes("Path:turn.end")) {
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          ws.close();
          resolve({ audioBuffer: Buffer.concat(audioChunks) });
        }
      }
    });

    ws.on("error", (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });

    ws.on("close", (code) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        reject(new Error(`EdgeTTS: WebSocketが予期せず閉じました (code: ${code})`));
      }
    });
  });
}

export async function synthesizeEdgeTtsToFile(text: string, voice: string, outputPath: string): Promise<string> {
  const { audioBuffer } = await synthesizeEdgeTts(text, voice);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, audioBuffer);
  return outputPath;
}
