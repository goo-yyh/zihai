import { randomUUID } from "node:crypto";

import { neonConfig } from "@neondatabase/serverless";
import { and, count, eq, inArray, isNull } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const testUrl = process.env.DATABASE_TEST_URL ?? "";
const integrationEnabled = process.env.RUN_DB_IT === "1" && testUrl.length > 0;
const testWebSocketProxy = process.env.DATABASE_TEST_WS_PROXY;

if (testWebSocketProxy) {
  neonConfig.wsProxy = testWebSocketProxy;
  neonConfig.useSecureWebSocket = false;
  neonConfig.pipelineConnect = false;
}

function assertSafeTestDatabase() {
  const pathname = new URL(testUrl).pathname;
  if (!pathname.endsWith("_test")) {
    throw new Error(
      "DATABASE_TEST_URL must point at a database whose name ends with _test.",
    );
  }
}

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({
  getServerEnv: () => ({ DATABASE_URL: testUrl }),
}));

const { withTransaction } = await import("./index");
const { notifications, projectSuggestions, projects, user } =
  await import("./schema");

describe.skipIf(!integrationEnabled)("project suggestion integration", () => {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
  const ownerId = `suggestion-owner-${suffix}`;
  const authorId = `suggestion-author-${suffix}`;
  const otherId = `suggestion-other-${suffix}`;
  const approvedProjectId = randomUUID();
  const draftProjectId = randomUUID();

  beforeAll(() => {
    assertSafeTestDatabase();
  });

  beforeAll(async () => {
    await withTransaction(async (tx) => {
      await tx.insert(user).values([
        {
          id: ownerId,
          name: "Suggestion Owner",
          username: `owner-${suffix}`,
          email: `owner-${suffix}@example.com`,
          emailVerified: true,
          onboardingCompleted: true,
        },
        {
          id: authorId,
          name: "Suggestion Author",
          username: `author-${suffix}`,
          email: `author-${suffix}@example.com`,
          emailVerified: true,
          onboardingCompleted: true,
        },
        {
          id: otherId,
          name: "Suggestion Other",
          username: `other-${suffix}`,
          email: `other-${suffix}@example.com`,
          emailVerified: true,
          onboardingCompleted: true,
        },
      ]);
      await tx.insert(projects).values([
        {
          id: approvedProjectId,
          ownerId,
          name: "Approved suggestion test project",
          slug: `suggestion-approved-${suffix}`,
          description: "An approved project used for suggestion testing.",
          websiteUrl: "https://example.com/approved",
          status: "approved",
          approvedAt: new Date(),
          publishedAt: new Date(),
        },
        {
          id: draftProjectId,
          ownerId,
          name: "Draft suggestion test project",
          slug: `suggestion-draft-${suffix}`,
          description: "A draft project used for suggestion testing.",
          websiteUrl: "https://example.com/draft",
          status: "draft",
        },
      ]);
    });
  });

  afterAll(async () => {
    if (!integrationEnabled) return;
    await withTransaction(async (tx) => {
      await tx
        .delete(user)
        .where(inArray(user.id, [ownerId, authorId, otherId]));
    });
  });

  it("rejects owner submissions and suggestions for non-public projects", async () => {
    await expect(
      withTransaction((tx) =>
        tx.insert(projectSuggestions).values({
          projectId: approvedProjectId,
          authorId: ownerId,
          content: "The owner must not suggest changes to this project.",
        }),
      ),
    ).rejects.toThrow();
    await expect(
      withTransaction((tx) =>
        tx.insert(projectSuggestions).values({
          projectId: draftProjectId,
          authorId,
          content: "Draft projects must not accept public suggestions.",
        }),
      ),
    ).rejects.toThrow();
  });

  it("allows the same user to submit multiple suggestions", async () => {
    const inserted = await withTransaction((tx) =>
      tx
        .insert(projectSuggestions)
        .values([
          {
            projectId: approvedProjectId,
            authorId,
            content: "Please add a public roadmap for upcoming improvements.",
          },
          {
            projectId: approvedProjectId,
            authorId,
            content: "Please improve the keyboard navigation in the product.",
          },
        ])
        .returning({ id: projectSuggestions.id }),
    );
    expect(inserted).toHaveLength(2);
  });

  it("enforces status detail consistency", async () => {
    await expect(
      withTransaction((tx) =>
        tx.insert(projectSuggestions).values({
          projectId: approvedProjectId,
          authorId,
          content: "This accepted record intentionally lacks a response time.",
          status: "accepted",
        }),
      ),
    ).rejects.toThrow();
  });

  it("rolls back a failed suggestion mutation", async () => {
    const content = "This suggestion mutation should roll back.";
    await expect(
      withTransaction(async (tx) => {
        await tx.insert(projectSuggestions).values({
          projectId: approvedProjectId,
          authorId,
          content,
        });
        throw new Error("rollback probe");
      }),
    ).rejects.toThrow("rollback probe");

    const [suggestionCount] = await withTransaction((tx) =>
      tx
        .select({ value: count() })
        .from(projectSuggestions)
        .where(eq(projectSuggestions.content, content)),
    );
    expect(suggestionCount?.value).toBe(0);
  });

  it("serializes concurrent processing without duplicate transitions", async () => {
    const [suggestion] = await withTransaction((tx) =>
      tx
        .insert(projectSuggestions)
        .values({
          projectId: approvedProjectId,
          authorId: otherId,
          content: "Only one concurrent owner response should be accepted.",
        })
        .returning({ id: projectSuggestions.id }),
    );
    expect(suggestion).toBeTruthy();

    async function acceptOnce() {
      return withTransaction(async (tx) => {
        const [locked] = await tx
          .select({ status: projectSuggestions.status })
          .from(projectSuggestions)
          .where(eq(projectSuggestions.id, suggestion!.id))
          .for("update");
        if (locked?.status !== "pending") return false;
        const now = new Date();
        const updated = await tx
          .update(projectSuggestions)
          .set({
            status: "accepted",
            respondedAt: now,
            respondedBy: ownerId,
            updatedAt: now,
          })
          .where(
            and(
              eq(projectSuggestions.id, suggestion!.id),
              eq(projectSuggestions.status, "pending"),
            ),
          )
          .returning({ id: projectSuggestions.id });
        if (!updated[0]) return false;
        return true;
      });
    }

    expect((await Promise.all([acceptOnce(), acceptOnce()])).sort()).toEqual([
      false,
      true,
    ]);
    const [persistedSuggestion] = await withTransaction((tx) =>
      tx
        .select({ status: projectSuggestions.status })
        .from(projectSuggestions)
        .where(eq(projectSuggestions.id, suggestion!.id)),
    );
    expect(persistedSuggestion?.status).toBe("accepted");
  });

  it("preserves notification history when its project, suggestion, and actor are deleted", async () => {
    const deletedActorId = `suggestion-deleted-actor-${suffix}`;
    const deletedProjectId = randomUUID();
    const notificationId = await withTransaction(async (tx) => {
      await tx.insert(user).values({
        id: deletedActorId,
        name: "Deleted suggestion actor",
        username: `gone-${suffix}`,
        email: `gone-${suffix}@example.com`,
        emailVerified: true,
        onboardingCompleted: true,
      });
      await tx.insert(projects).values({
        id: deletedProjectId,
        ownerId,
        name: "Deleted notification target",
        slug: `deleted-${suffix}`,
        description: "A disposable project for notification history testing.",
        websiteUrl: "https://example.com/deleted",
        status: "approved",
        approvedAt: new Date(),
        publishedAt: new Date(),
      });
      const [suggestion] = await tx
        .insert(projectSuggestions)
        .values({
          projectId: deletedProjectId,
          authorId: deletedActorId,
          content: "Preserve this notification after deleting its targets.",
        })
        .returning({ id: projectSuggestions.id });
      const [notification] = await tx
        .insert(notifications)
        .values({
          recipientId: ownerId,
          actorId: deletedActorId,
          type: "project_suggestion_received",
          projectId: deletedProjectId,
          suggestionId: suggestion!.id,
          payload: {
            projectName: "Deleted notification target",
            actorName: "Deleted suggestion actor",
          },
        })
        .returning({ id: notifications.id });
      return notification!.id;
    });

    await withTransaction(async (tx) => {
      await tx.delete(projects).where(eq(projects.id, deletedProjectId));
      await tx.delete(user).where(eq(user.id, deletedActorId));
    });

    const [history] = await withTransaction((tx) =>
      tx
        .select({
          actorId: notifications.actorId,
          projectId: notifications.projectId,
          suggestionId: notifications.suggestionId,
          payload: notifications.payload,
        })
        .from(notifications)
        .where(eq(notifications.id, notificationId)),
    );
    expect(history).toMatchObject({
      actorId: null,
      projectId: null,
      suggestionId: null,
      payload: { projectName: "Deleted notification target" },
    });
  });

  it("marks only existing unread notifications for one recipient as read", async () => {
    await withTransaction(async (tx) => {
      await tx.insert(notifications).values([
        {
          recipientId: authorId,
          type: "project_approved",
          projectId: approvedProjectId,
          payload: { projectName: "Approved suggestion test project" },
        },
        {
          recipientId: authorId,
          type: "project_republished",
          projectId: approvedProjectId,
          payload: { projectName: "Approved suggestion test project" },
        },
        {
          recipientId: otherId,
          type: "project_approved",
          projectId: approvedProjectId,
          payload: { projectName: "Approved suggestion test project" },
        },
      ]);
      await tx
        .update(notifications)
        .set({ readAt: new Date() })
        .where(
          and(
            eq(notifications.recipientId, authorId),
            isNull(notifications.readAt),
          ),
        );
    });

    await withTransaction((tx) =>
      tx.insert(notifications).values({
        recipientId: authorId,
        type: "project_approved",
        projectId: approvedProjectId,
        payload: { projectName: "Notification created after opening" },
      }),
    );

    const [authorUnread, otherUnread] = await withTransaction(async (tx) => {
      const authorUnread = await tx
        .select({ value: count() })
        .from(notifications)
        .where(
          and(
            eq(notifications.recipientId, authorId),
            isNull(notifications.readAt),
          ),
        );
      const otherUnread = await tx
        .select({ value: count() })
        .from(notifications)
        .where(
          and(
            eq(notifications.recipientId, otherId),
            isNull(notifications.readAt),
          ),
        );
      return [authorUnread, otherUnread] as const;
    });
    expect(authorUnread[0]?.value).toBe(1);
    expect(otherUnread[0]?.value).toBeGreaterThan(0);
  });
});
