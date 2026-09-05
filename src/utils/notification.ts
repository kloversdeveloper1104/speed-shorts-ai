// NotificationProvider抽象化。投稿成功・失敗時に通知する。
// 将来 Discord / Slack / Email を追加する場合はこのファイルにプロバイダーを追加するだけでよい。

import { env } from "./env";

export interface NotificationPayload {
  title: string;
  message: string;
  level: "info" | "success" | "warning" | "error";
}

export interface NotificationProvider {
  name: string;
  send(payload: NotificationPayload): Promise<void>;
}

class DiscordNotificationProvider implements NotificationProvider {
  name = "discord";
  constructor(private webhookUrl: string) {}

  async send(payload: NotificationPayload): Promise<void> {
    await fetch(this.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: `**[${payload.level.toUpperCase()}] ${payload.title}**\n${payload.message}`,
      }),
    });
  }
}

class SlackNotificationProvider implements NotificationProvider {
  name = "slack";
  constructor(private webhookUrl: string) {}

  async send(payload: NotificationPayload): Promise<void> {
    await fetch(this.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: `*[${payload.level.toUpperCase()}] ${payload.title}*\n${payload.message}` }),
    });
  }
}

class ConsoleNotificationProvider implements NotificationProvider {
  name = "console";
  async send(payload: NotificationPayload): Promise<void> {
    console.log(`[通知][${payload.level}] ${payload.title}: ${payload.message}`);
  }
}

export function getNotificationProviders(): NotificationProvider[] {
  const providers: NotificationProvider[] = [new ConsoleNotificationProvider()];
  const discordUrl = env("DISCORD_WEBHOOK_URL");
  const slackUrl = env("SLACK_WEBHOOK_URL");
  if (discordUrl) providers.push(new DiscordNotificationProvider(discordUrl));
  if (slackUrl) providers.push(new SlackNotificationProvider(slackUrl));
  return providers;
}

export async function notify(payload: NotificationPayload): Promise<void> {
  const providers = getNotificationProviders();
  await Promise.allSettled(providers.map((p) => p.send(payload)));
}
