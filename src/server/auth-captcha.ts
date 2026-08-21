import "server-only";

import {
  createHmac,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { deflateSync } from "node:zlib";

import { and, eq, like, lte } from "drizzle-orm";

import { getDb } from "@/db";
import { verification } from "@/db/schema";
import { authCaptchaVerificationSchema } from "@/lib/auth-captcha";
import { getServerEnv } from "@/lib/env";

const CAPTCHA_IDENTIFIER_PREFIX = "auth-captcha:";
const CAPTCHA_TTL_MS = 5 * 60 * 1000;
const CAPTCHA_DIGITS = "23456789";
const CAPTCHA_LENGTH = 5;

const digitGlyphs: Record<string, readonly string[]> = {
  "2": ["11111", "00001", "00001", "11111", "10000", "10000", "11111"],
  "3": ["11111", "00001", "00001", "01111", "00001", "00001", "11111"],
  "4": ["10001", "10001", "10001", "11111", "00001", "00001", "00001"],
  "5": ["11111", "10000", "10000", "11111", "00001", "00001", "11111"],
  "6": ["11111", "10000", "10000", "11111", "10001", "10001", "11111"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["11111", "10001", "10001", "11111", "10001", "10001", "11111"],
  "9": ["11111", "10001", "10001", "11111", "00001", "00001", "11111"],
};

type CaptchaColor = readonly [number, number, number, number];
type RandomInteger = (maximum: number) => number;

function setPixel(
  pixels: Buffer,
  width: number,
  height: number,
  x: number,
  y: number,
  color: CaptchaColor,
) {
  if (x < 0 || y < 0 || x >= width || y >= height) return;
  const offset = (y * width + x) * 4;
  pixels[offset] = color[0];
  pixels[offset + 1] = color[1];
  pixels[offset + 2] = color[2];
  pixels[offset + 3] = color[3];
}

function fillRectangle(
  pixels: Buffer,
  width: number,
  height: number,
  x: number,
  y: number,
  rectangleWidth: number,
  rectangleHeight: number,
  color: CaptchaColor,
) {
  for (let offsetY = 0; offsetY < rectangleHeight; offsetY += 1) {
    for (let offsetX = 0; offsetX < rectangleWidth; offsetX += 1) {
      setPixel(pixels, width, height, x + offsetX, y + offsetY, color);
    }
  }
}

function drawLine(
  pixels: Buffer,
  width: number,
  height: number,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  color: CaptchaColor,
) {
  let x = startX;
  let y = startY;
  const deltaX = Math.abs(endX - startX);
  const stepX = startX < endX ? 1 : -1;
  const deltaY = -Math.abs(endY - startY);
  const stepY = startY < endY ? 1 : -1;
  let error = deltaX + deltaY;

  while (true) {
    setPixel(pixels, width, height, x, y, color);
    if (x === endX && y === endY) break;
    const doubledError = error * 2;
    if (doubledError >= deltaY) {
      error += deltaY;
      x += stepX;
    }
    if (doubledError <= deltaX) {
      error += deltaX;
      y += stepY;
    }
  }
}

function crc32(data: Buffer) {
  let checksum = 0xffffffff;
  for (const byte of data) {
    checksum ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      checksum = (checksum >>> 1) ^ (checksum & 1 ? 0xedb88320 : 0);
    }
  }
  return (checksum ^ 0xffffffff) >>> 0;
}

function createPngChunk(type: string, data: Buffer) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, checksum]);
}

export function renderAuthCaptchaImage(
  answer: string,
  randomInteger: RandomInteger = randomInt,
) {
  const width = 220;
  const height = 72;
  const pixels = Buffer.alloc(width * height * 4);
  const background: CaptchaColor = [247, 248, 242, 255];

  fillRectangle(pixels, width, height, 0, 0, width, height, background);

  const noiseColors: CaptchaColor[] = [
    [191, 205, 194, 255],
    [210, 196, 173, 255],
    [181, 202, 210, 255],
  ];
  for (let index = 0; index < 180; index += 1) {
    setPixel(
      pixels,
      width,
      height,
      randomInteger(width),
      randomInteger(height),
      noiseColors[randomInteger(noiseColors.length)],
    );
  }

  const characterColors: CaptchaColor[] = [
    [28, 74, 54, 255],
    [55, 58, 99, 255],
    [102, 54, 43, 255],
  ];
  const scale = 7;
  const glyphWidth = 5 * scale;
  const spacing = 3;
  const startX = Math.floor(
    (width - (glyphWidth * answer.length + spacing * (answer.length - 1))) / 2,
  );

  for (const [characterIndex, character] of [...answer].entries()) {
    const glyph = digitGlyphs[character];
    if (!glyph) continue;
    const originX = startX + characterIndex * (glyphWidth + spacing);
    const originY = 10 + randomInteger(7);
    const slant = randomInteger(3) - 1;
    const color = characterColors[randomInteger(characterColors.length)];

    for (const [rowIndex, row] of glyph.entries()) {
      const rowOffset = (rowIndex - 3) * slant;
      for (const [columnIndex, pixel] of [...row].entries()) {
        if (pixel !== "1") continue;
        fillRectangle(
          pixels,
          width,
          height,
          originX + columnIndex * scale + rowOffset,
          originY + rowIndex * scale,
          scale,
          scale,
          color,
        );
      }
    }
  }

  for (let index = 0; index < 4; index += 1) {
    drawLine(
      pixels,
      width,
      height,
      0,
      randomInteger(height),
      width - 1,
      randomInteger(height),
      noiseColors[randomInteger(noiseColors.length)],
    );
  }

  const scanlineLength = width * 4 + 1;
  const scanlines = Buffer.alloc(scanlineLength * height);
  for (let y = 0; y < height; y += 1) {
    const destinationOffset = y * scanlineLength;
    scanlines[destinationOffset] = 0;
    pixels.copy(
      scanlines,
      destinationOffset + 1,
      y * width * 4,
      (y + 1) * width * 4,
    );
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;

  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    createPngChunk("IHDR", header),
    createPngChunk("IDAT", deflateSync(scanlines)),
    createPngChunk("IEND", Buffer.alloc(0)),
  ]);

  return `data:image/png;base64,${png.toString("base64")}`;
}

export function hashAuthCaptchaAnswer({
  challengeId,
  email,
  answer,
  secret,
}: {
  challengeId: string;
  email: string;
  answer: string;
  secret: string;
}) {
  return createHmac("sha256", secret)
    .update(
      [challengeId, email.trim().toLowerCase(), answer.trim()].join("\u0000"),
    )
    .digest("hex");
}

function generateCaptchaAnswer() {
  return Array.from(
    { length: CAPTCHA_LENGTH },
    () => CAPTCHA_DIGITS[randomInt(CAPTCHA_DIGITS.length)],
  ).join("");
}

export async function createAuthCaptcha(email: string) {
  const challengeId = randomUUID();
  const answer = generateCaptchaAnswer();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CAPTCHA_TTL_MS);
  const database = getDb();

  await database
    .delete(verification)
    .where(
      and(
        like(verification.identifier, `${CAPTCHA_IDENTIFIER_PREFIX}%`),
        lte(verification.expiresAt, now),
      ),
    );
  await database.insert(verification).values({
    id: randomUUID(),
    identifier: `${CAPTCHA_IDENTIFIER_PREFIX}${challengeId}`,
    value: hashAuthCaptchaAnswer({
      challengeId,
      email,
      answer,
      secret: getServerEnv().BETTER_AUTH_SECRET,
    }),
    expiresAt,
  });

  return {
    id: challengeId,
    image: renderAuthCaptchaImage(answer),
  };
}

export async function verifyAndConsumeAuthCaptcha(input: {
  challengeId: string;
  answer: string;
  email: string;
}) {
  const parsed = authCaptchaVerificationSchema.safeParse(input);
  if (!parsed.success) return false;

  const [storedChallenge] = await getDb()
    .delete(verification)
    .where(
      eq(
        verification.identifier,
        `${CAPTCHA_IDENTIFIER_PREFIX}${parsed.data.challengeId}`,
      ),
    )
    .returning({
      value: verification.value,
      expiresAt: verification.expiresAt,
    });

  if (!storedChallenge || storedChallenge.expiresAt <= new Date()) return false;

  const submittedHash = Buffer.from(
    hashAuthCaptchaAnswer({
      ...parsed.data,
      secret: getServerEnv().BETTER_AUTH_SECRET,
    }),
    "hex",
  );
  const storedHash = Buffer.from(storedChallenge.value, "hex");

  return (
    submittedHash.length === storedHash.length &&
    timingSafeEqual(submittedHash, storedHash)
  );
}
