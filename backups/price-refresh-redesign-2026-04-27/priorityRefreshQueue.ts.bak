import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

const queueUrl =
  process.env.AWS_PRIORITY_QUEUE_URL || process.env.AWS_QUEUE_URL || "";

const sqsClient = queueUrl
  ? new SQSClient({ region: process.env.AWS_REGION || "us-east-2" })
  : null;

export type PriorityRefreshReason = "click" | "admin" | "system";

export async function enqueuePriorityRefresh(params: {
  asin: string;
  reason?: PriorityRefreshReason;
}) {
  if (!sqsClient || !queueUrl) {
    return { enqueued: false, reason: "queue_not_configured" as const };
  }

  const asin = params.asin.trim().toUpperCase();
  const reason = params.reason ?? "click";
  const payload = JSON.stringify({
    asin,
    reason,
    queuedAt: new Date().toISOString(),
  });

  const input: ConstructorParameters<typeof SendMessageCommand>[0] = {
    QueueUrl: queueUrl,
    MessageBody: payload,
  };

  if (queueUrl.endsWith(".fifo")) {
    input.MessageGroupId = "priority-refresh";
    input.MessageDeduplicationId = `${asin}-${Math.floor(Date.now() / 60000)}`;
  }

  await sqsClient.send(new SendMessageCommand(input));

  return { enqueued: true as const };
}
