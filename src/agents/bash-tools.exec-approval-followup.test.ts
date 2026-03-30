import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./tools/gateway.js", () => ({
  callGatewayTool: vi.fn(),
}));

let callGatewayTool: typeof import("./tools/gateway.js").callGatewayTool;
let sendExecApprovalFollowup: typeof import("./bash-tools.exec-approval-followup.js").sendExecApprovalFollowup;

describe("sendExecApprovalFollowup", () => {
  beforeAll(async () => {
    ({ callGatewayTool } = await import("./tools/gateway.js"));
    ({ sendExecApprovalFollowup } = await import("./bash-tools.exec-approval-followup.js"));
  });

  beforeEach(() => {
    vi.mocked(callGatewayTool).mockClear();
    vi.mocked(callGatewayTool).mockResolvedValue({ status: "ok" });
  });

  it("keeps webchat followups inside the current session", async () => {
    await expect(
      sendExecApprovalFollowup({
        approvalId: "approval-1",
        sessionKey: "agent:main:session-1",
        turnSourceChannel: "webchat",
        turnSourceTo: "session:webchat-main",
        turnSourceAccountId: "default",
        turnSourceThreadId: "thread-1",
        resultText: "Exec finished successfully",
      }),
    ).resolves.toBe(true);

    expect(callGatewayTool).toHaveBeenCalledWith(
      "agent",
      { timeoutMs: 60_000 },
      expect.objectContaining({
        sessionKey: "agent:main:session-1",
        deliver: false,
        channel: undefined,
        to: undefined,
        accountId: undefined,
        threadId: undefined,
        idempotencyKey: "exec-approval-followup:approval-1",
      }),
      { expectFinal: true },
    );
  });

  it("still delivers followups to explicit external channels", async () => {
    await expect(
      sendExecApprovalFollowup({
        approvalId: "approval-2",
        sessionKey: "agent:main:session-2",
        turnSourceChannel: "telegram",
        turnSourceTo: "chat:123",
        turnSourceAccountId: "work",
        turnSourceThreadId: 456,
        resultText: "Exec finished successfully",
      }),
    ).resolves.toBe(true);

    expect(callGatewayTool).toHaveBeenCalledWith(
      "agent",
      { timeoutMs: 60_000 },
      expect.objectContaining({
        sessionKey: "agent:main:session-2",
        deliver: true,
        channel: "telegram",
        to: "chat:123",
        accountId: "work",
        threadId: "456",
        idempotencyKey: "exec-approval-followup:approval-2",
      }),
      { expectFinal: true },
    );
  });
});
