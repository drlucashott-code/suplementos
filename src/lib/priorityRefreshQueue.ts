import {
  GetQueueAttributesCommand,
  SQSClient,
  SendMessageCommand,
} from "@aws-sdk/client-sqs";

const queueUrl =
  process.env.AWS_PRIORITY_QUEUE_URL || process.env.AWS_QUEUE_URL || "";

const sqsClient = queueUrl
  ? new SQSClient({ region: process.env.AWS_REGION || "us-east-2" })
  : null;

export type PriorityRefreshReason =
  | "click"
  | "favorite"
  | "monitored"
  | "list"
  | "issue_report"
  | "admin"
  | "system";

export function isPriorityRefreshQueueConfigured() {
  return Boolean(sqsClient && queueUrl);
}

export async function getPriorityRefreshQueueSnapshot() {
  if (!sqsClient || !queueUrl) {
    return {
      configured: false as const,
      visibleMessages: 0,
      inFlightMessages: 0,
      delayedMessages: 0,
      totalMessages: 0,
    };
  }

  const response = await sqsClient.send(
    new GetQueueAttributesCommand({
      QueueUrl: queueUrl,
      AttributeNames: [
        "ApproximateNumberOfMessages",
        "ApproximateNumberOfMessagesNotVisible",
        "ApproximateNumberOfMessagesDelayed",
      ],
    })
  );

  const visibleMessages = Number(response.Attributes?.ApproximateNumberOfMessages ?? 0);
  const inFlightMessages = Number(
    response.Attributes?.ApproximateNumberOfMessagesNotVisible ?? 0
  );
  const delayedMessages = Number(
    response.Attributes?.ApproximateNumberOfMessagesDelayed ?? 0
  );

  return {
    configured: true as const,
    visibleMessages,
    inFlightMessages,
    delayedMessages,
    totalMessages: visibleMessages + inFlightMessages + delayedMessages,
  };
}

export async function enqueuePriorityRefresh(params: {
  asin: string;
  reason?: PriorityRefreshReason;
  notBeforeAt?: Date | string | null;
}) {
  if (!sqsClient || !queueUrl) {
    return { enqueued: false, reason: "queue_not_configured" as const };
  }

  const asin = params.asin.trim().toUpperCase();
  const reason = params.reason ?? "click";
  const notBeforeAt =
    params.notBeforeAt instanceof Date
      ? params.notBeforeAt
      : params.notBeforeAt
        ? new Date(params.notBeforeAt)
        : null;
  const delaySeconds = notBeforeAt
    ? Math.max(
        0,
        Math.min(900, Math.floor((notBeforeAt.getTime() - Date.now()) / 1000))
      )
    : 0;
  const payload = JSON.stringify({
    asin,
    reason,
    queuedAt: new Date().toISOString(),
    notBeforeAt: notBeforeAt?.toISOString() ?? null,
  });

  const input: ConstructorParameters<typeof SendMessageCommand>[0] = {
    QueueUrl: queueUrl,
    MessageBody: payload,
    ...(delaySeconds > 0 ? { DelaySeconds: delaySeconds } : {}),
  };

  if (queueUrl.endsWith(".fifo")) {
    input.MessageGroupId = "priority-refresh";
    input.MessageDeduplicationId = `${asin}-${Math.floor(Date.now() / 60000)}`;
  }

  await sqsClient.send(new SendMessageCommand(input));

  return { enqueued: true as const };
}
