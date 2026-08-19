import "dotenv/config";

import { createHash } from "node:crypto";
import { deflateSync } from "node:zlib";

import { neon } from "@neondatabase/serverless";
import { del, put } from "@vercel/blob";
import { and, count, eq, inArray, notInArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";

import { user } from "../src/db/schema/auth";
import { projectImages, projects } from "../src/db/schema/projects";

const USER_COUNT = 10;
const PROJECT_COUNTS = [2, 3, 4, 2, 3, 4, 2, 3, 4, 2] as const;
const SEED_PREFIX = "dev-seed";
const DEFAULT_AVATAR_URL = "/images/default-avatar.png";

const projectNames = [
  "灵感雷达 AI",
  "会议速记助手",
  "智能文档翻译",
  "代码审查伙伴",
  "营销文案工坊",
  "旅行规划师",
  "知识库问答",
  "图片提示词助手",
  "播客剪辑助手",
  "数据洞察台",
  "客服自动化助手",
  "学习计划伙伴",
  "简历优化器",
  "视频摘要助手",
  "销售线索研究员",
  "合同审阅助手",
  "社交媒体日历",
  "产品需求生成器",
  "语音笔记整理器",
  "智能表格助手",
  "品牌视觉灵感库",
  "竞品监控雷达",
  "用户反馈分析器",
  "邮件写作助手",
  "创作者数据面板",
  "科研论文阅读器",
  "团队周报生成器",
  "电商选品助手",
  "本地生活推荐器",
] as const;

const projectDescriptions = [
  "把零散灵感整理成清晰、可执行的产品方向。",
  "自动整理会议内容，提取摘要、关键结论和待办事项，让团队会后立即进入执行状态。",
  "面向多语言团队的智能文档翻译工具，支持术语库、上下文理解和格式保留，可快速处理产品文档、营销内容与技术资料，并通过质量检查减少遗漏，帮助团队在跨语言协作中保持准确、一致和高效。",
  "让每一次代码审查更聚焦。",
] as const;

const palettes = [
  [
    [103, 65, 245],
    [210, 255, 99],
  ],
  [
    [8, 145, 178],
    [165, 243, 252],
  ],
  [
    [225, 29, 72],
    [253, 164, 175],
  ],
  [
    [37, 99, 235],
    [147, 197, 253],
  ],
  [
    [124, 58, 237],
    [221, 214, 254],
  ],
  [
    [5, 150, 105],
    [167, 243, 208],
  ],
  [
    [234, 88, 12],
    [254, 215, 170],
  ],
  [
    [190, 24, 93],
    [251, 207, 232],
  ],
  [
    [15, 118, 110],
    [153, 246, 228],
  ],
  [
    [79, 70, 229],
    [199, 210, 254],
  ],
] as const;

const crcTable = new Uint32Array(256).map((_, index) => {
  let crc = index;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = (crc & 1) === 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return crc >>> 0;
});

function assertDevelopmentEnvironment() {
  if (process.env.CONFIRM_DEVELOPMENT_SEED !== "yes") {
    throw new Error(
      "Refusing to seed without CONFIRM_DEVELOPMENT_SEED=yes. Use make db-seed-development.",
    );
  }

  for (const key of ["BETTER_AUTH_URL", "NEXT_PUBLIC_SITE_URL"] as const) {
    const value = process.env[key];
    if (!value) throw new Error(`${key} is required.`);
    const hostname = new URL(value).hostname;
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      throw new Error(
        `Refusing to seed because ${key} does not point to localhost.`,
      );
    }
  }
}

function stableUuid(value: string) {
  const bytes = Buffer.from(
    createHash("sha256").update(value).digest().subarray(0, 16),
  );
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function crc32(data: Buffer) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer) {
  const typeBuffer = Buffer.from(type, "ascii");
  const chunk = Buffer.alloc(data.length + 12);
  chunk.writeUInt32BE(data.length, 0);
  typeBuffer.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(
    crc32(Buffer.concat([typeBuffer, data])),
    data.length + 8,
  );
  return chunk;
}

function createProjectCover(projectIndex: number, imageIndex = 0) {
  const width = 1200;
  const height = 750;
  const raw = Buffer.alloc((width * 3 + 1) * height);
  const [start, end] = palettes[(projectIndex + imageIndex) % palettes.length];
  let offset = 0;

  for (let y = 0; y < height; y += 1) {
    raw[offset] = 0;
    offset += 1;
    for (let x = 0; x < width; x += 1) {
      const horizontal = x / (width - 1);
      const vertical = y / (height - 1);
      const blend = horizontal * 0.7 + vertical * 0.3;
      const accent =
        (x + y + projectIndex * 31 + imageIndex * 67) % 260 < 16 ||
        (x - y + projectIndex * 47 + imageIndex * 83 + 1200) % 340 < 10
          ? 22
          : 0;

      for (let channel = 0; channel < 3; channel += 1) {
        raw[offset] = Math.min(
          255,
          Math.round(start[channel] * (1 - blend) + end[channel] * blend) +
            accent,
        );
        offset += 1;
      }
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function createSeedData(now: Date, approverId: string) {
  const users = Array.from({ length: USER_COUNT }, (_, userIndex) => {
    const number = String(userIndex + 1).padStart(2, "0");
    return {
      id: `${SEED_PREFIX}-user-${number}`,
      name: `模拟创作者 ${number}`,
      email: `demo-builder-${number}@example.com`,
      emailVerified: true,
      image: DEFAULT_AVATAR_URL,
      username: `demo_builder_${number}`,
      displayUsername: `demo_builder_${number}`,
      role: "user",
      banned: false,
      onboardingCompleted: true,
      contactEmail: `demo-builder-${number}@example.com`,
      createdAt: new Date(now.getTime() - (USER_COUNT - userIndex) * 86400000),
      updatedAt: now,
    };
  });

  let projectIndex = 0;
  const seededProjects = users.flatMap((owner, userIndex) =>
    Array.from({ length: PROJECT_COUNTS[userIndex] }, () => {
      const currentIndex = projectIndex;
      projectIndex += 1;
      const number = String(currentIndex + 1).padStart(2, "0");
      const slug = `${SEED_PREFIX}-ai-product-${number}`;
      const publishedAt = new Date(
        now.getTime() - currentIndex * 6 * 60 * 60 * 1000,
      );
      const linkMode = currentIndex % 3;
      const imageCount = currentIndex === 0 ? 3 : 1;

      return {
        id: stableUuid(`${SEED_PREFIX}-project-${number}`),
        ownerId: owner.id,
        name: projectNames[currentIndex],
        slug,
        description:
          projectDescriptions[currentIndex] ??
          `${projectNames[currentIndex]} 是用于 Development 环境的模拟 AI 产品，帮助验证产品列表、搜索、排序、分页和创作者主页。`,
        websiteUrl:
          linkMode === 2 ? null : `https://example.com/products/${slug}`,
        githubUrl:
          linkMode === 1 ? null : `https://github.com/zihai-dev/${slug}`,
        status: "approved" as const,
        rejectionReason: null,
        submittedAt: new Date(publishedAt.getTime() - 2 * 60 * 60 * 1000),
        approvedAt: new Date(publishedAt.getTime() - 60 * 60 * 1000),
        approvedBy: approverId,
        publishedAt,
        createdAt: new Date(publishedAt.getTime() - 24 * 60 * 60 * 1000),
        updatedAt: publishedAt,
        imagePathnames: Array.from({ length: imageCount }, (_, imageIndex) =>
          imageIndex === 0
            ? `${SEED_PREFIX}/projects/${slug}/cover.png`
            : `${SEED_PREFIX}/projects/${slug}/detail-${String(imageIndex + 1).padStart(2, "0")}.png`,
        ),
        projectIndex: currentIndex,
      };
    }),
  );

  return { users, projects: seededProjects };
}

async function main() {
  assertDevelopmentEnvironment();

  const databaseUrl = process.env.DATABASE_URL;
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");
  if (!blobToken) throw new Error("BLOB_READ_WRITE_TOKEN is required.");

  const db = drizzle(databaseUrl);
  const sql = neon(databaseUrl);
  const seedUserIds = Array.from(
    { length: USER_COUNT },
    (_, index) => `${SEED_PREFIX}-user-${String(index + 1).padStart(2, "0")}`,
  );
  const [existingAdmin] = await db
    .select({ id: user.id })
    .from(user)
    .where(and(eq(user.role, "admin"), notInArray(user.id, seedUserIds)))
    .limit(1);
  const seedAdminId = seedUserIds[0];
  const approverId = existingAdmin?.id ?? seedAdminId;
  const now = new Date();
  const seed = createSeedData(now, approverId);

  if (!existingAdmin) seed.users[0].role = "admin";

  const imagePathnames = seed.projects.flatMap(
    (project) => project.imagePathnames,
  );
  const existingImages = await db
    .select({
      pathname: projectImages.blobPathname,
      url: projectImages.blobUrl,
      sizeBytes: projectImages.sizeBytes,
    })
    .from(projectImages)
    .where(inArray(projectImages.blobPathname, imagePathnames));
  const imageByPathname = new Map(
    existingImages.map((image) => [image.pathname, image]),
  );
  const uploadedPathnames: string[] = [];

  try {
    for (const project of seed.projects) {
      for (const [imageIndex, pathname] of project.imagePathnames.entries()) {
        if (imageByPathname.has(pathname)) continue;
        const cover = createProjectCover(project.projectIndex, imageIndex);
        const blob = await put(pathname, cover, {
          access: "public",
          addRandomSuffix: false,
          allowOverwrite: true,
          contentType: "image/png",
          token: blobToken,
        });
        uploadedPathnames.push(blob.pathname);
        imageByPathname.set(blob.pathname, {
          pathname: blob.pathname,
          url: blob.url,
          sizeBytes: cover.byteLength,
        });
      }
    }

    const images = seed.projects.flatMap((project) =>
      project.imagePathnames.map((pathname, sortOrder) => {
        const image = imageByPathname.get(pathname);
        if (!image)
          throw new Error(`Missing uploaded image for ${project.slug}.`);
        return { projectId: project.id, sortOrder, ...image };
      }),
    );

    await sql.transaction((transaction) => [
      ...seed.users.map(
        (seededUser) => transaction`
          INSERT INTO "user" (
            "id", "name", "email", "email_verified", "image", "created_at",
            "updated_at", "username", "display_username", "role", "banned",
            "onboarding_completed", "contact_email"
          ) VALUES (
            ${seededUser.id}, ${seededUser.name}, ${seededUser.email},
            ${seededUser.emailVerified}, ${seededUser.image},
            ${seededUser.createdAt.toISOString()}, ${seededUser.updatedAt.toISOString()},
            ${seededUser.username}, ${seededUser.displayUsername}, ${seededUser.role},
            ${seededUser.banned}, ${seededUser.onboardingCompleted},
            ${seededUser.contactEmail}
          )
          ON CONFLICT ("id") DO NOTHING
        `,
      ),
      ...(existingAdmin
        ? []
        : [
            transaction`
              UPDATE "user"
              SET "role" = 'admin', "updated_at" = ${now.toISOString()}
              WHERE "id" = ${seedAdminId}
            `,
          ]),
      ...seed.projects.map(
        (project) => transaction`
          INSERT INTO "projects" (
            "id", "owner_id", "name", "slug", "description", "website_url",
            "github_url", "status", "rejection_reason", "submitted_at",
            "approved_at", "approved_by", "published_at", "created_at", "updated_at"
          ) VALUES (
            ${project.id}, ${project.ownerId}, ${project.name}, ${project.slug},
            ${project.description}, ${project.websiteUrl}, ${project.githubUrl},
            ${project.status}, ${project.rejectionReason},
            ${project.submittedAt.toISOString()}, ${project.approvedAt.toISOString()},
            ${project.approvedBy}, ${project.publishedAt.toISOString()},
            ${project.createdAt.toISOString()}, ${project.updatedAt.toISOString()}
          )
          ON CONFLICT ("id") DO UPDATE SET
            "description" = EXCLUDED."description",
            "status" = EXCLUDED."status",
            "rejection_reason" = EXCLUDED."rejection_reason",
            "submitted_at" = EXCLUDED."submitted_at",
            "approved_at" = EXCLUDED."approved_at",
            "approved_by" = EXCLUDED."approved_by",
            "published_at" = EXCLUDED."published_at",
            "updated_at" = EXCLUDED."updated_at"
        `,
      ),
      ...images.map(
        (image) => transaction`
          INSERT INTO "project_images" (
            "project_id", "blob_url", "blob_pathname", "mime_type",
            "size_bytes", "sort_order"
          ) VALUES (
            ${image.projectId}, ${image.url}, ${image.pathname}, 'image/png',
            ${image.sizeBytes}, ${image.sortOrder}
          )
          ON CONFLICT ("blob_pathname") DO NOTHING
        `,
      ),
    ]);
  } catch (error) {
    if (uploadedPathnames.length > 0) {
      await del(uploadedPathnames, { token: blobToken }).catch(
        (cleanupError) => {
          console.error(
            "Failed to clean up newly uploaded seed images.",
            cleanupError,
          );
        },
      );
    }
    throw error;
  }

  const [seededUserCount] = await db
    .select({ count: count() })
    .from(user)
    .where(inArray(user.id, seedUserIds));
  const seededProjectCounts = await db
    .select({ ownerId: projects.ownerId, count: count() })
    .from(projects)
    .where(inArray(projects.ownerId, seedUserIds))
    .groupBy(projects.ownerId);
  const counts = new Map(
    seededProjectCounts.map((row) => [row.ownerId, Number(row.count)]),
  );

  console.log(`Seeded Development with ${seededUserCount?.count ?? 0} users.`);
  for (const seededUser of seed.users) {
    console.log(
      `@${seededUser.username}: ${counts.get(seededUser.id) ?? 0} projects`,
    );
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
