import {
  INTERNAL_MESSAGE_CHANNEL,
  isDeliverableMessageChannel,
  normalizeMessageChannel,
} from "../utils/message-channel.js";
import { callGatewayTool } from "./tools/gateway.js";

type ExecApprovalFollowupParams = {
  approvalId: string;
  sessionKey?: string;
  turnSourceChannel?: string;
  turnSourceTo?: string;
  turnSourceAccountId?: string;
  turnSourceThreadId?: string | number;
  resultText: string;
};

export function buildExecApprovalFollowupPrompt(resultText: string): string {
  return [
    "An async command the user already approved has completed.",
    "Do not run the command again.",
    "",
    "Exact completion details:",
    resultText.trim(),
    "",
    "Reply to the user in a helpful way.",
    "If it succeeded, share the relevant output.",
    "If it failed, explain what went wrong.",
  ].join("\n");
}

export async function sendExecApprovalFollowup(
  params: ExecApprovalFollowupParams,
): Promise<boolean> {
  const sessionKey = params.sessionKey?.trim();
  const resultText = params.resultText.trim();
  if (!sessionKey || !resultText) {
    return false;
  }

  const normalizedChannel = normalizeMessageChannel(params.turnSourceChannel);
  const to = params.turnSourceTo?.trim();
  const threadId =
    params.turnSourceThreadId != null && params.turnSourceThreadId !== ""
      ? String(params.turnSourceThreadId)
      : undefined;
  const channel =
    normalizedChannel &&
    normalizedChannel !== INTERNAL_MESSAGE_CHANNEL &&
    isDeliverableMessageChannel(normalizedChannel)
      ? normalizedChannel
      : undefined;
  const hasExplicitDeliverTarget = Boolean(channel && to);

  await callGatewayTool(
    "agent",
    { timeoutMs: 60_000 },
    {
      sessionKey,
      message: buildExecApprovalFollowupPrompt(resultText),
      deliver: hasExplicitDeliverTarget,
      bestEffortDeliver: true,
      channel: hasExplicitDeliverTarget ? channel : undefined,
      to: hasExplicitDeliverTarget ? to : undefined,
      accountId: hasExplicitDeliverTarget ? params.turnSourceAccountId?.trim() || undefined : undefined,
      threadId: hasExplicitDeliverTarget ? threadId : undefined,
      idempotencyKey: `exec-approval-followup:${params.approvalId}`,
    },
    { expectFinal: true },
  );

  return true;
}
