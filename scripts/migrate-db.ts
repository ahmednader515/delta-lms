/**
 * Copy data from OLD_DIRECT_DATABASE_URL → DIRECT_DATABASE_URL.
 * Use direct URLs only (not prisma+postgres / Accelerate) for bulk reads/writes.
 *
 * Prereqs: new database has `prisma migrate deploy` applied (same schema as old).
 * Safe to re-run with skipDuplicates when IDs already exist.
 *
 *   npx tsx scripts/migrate-db.ts
 *   npx tsx scripts/migrate-db.ts --dry-run
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

const BATCH = 250;

function loadEnvFromDotenv() {
  const p = resolve(process.cwd(), ".env");
  if (!existsSync(p)) return;
  const text = readFileSync(p, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

loadEnvFromDotenv();

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const oldUrl = process.env.OLD_DIRECT_DATABASE_URL;
  const newUrl = process.env.DIRECT_DATABASE_URL;

  if (!oldUrl || !newUrl) {
    console.error(
      "Missing OLD_DIRECT_DATABASE_URL or DIRECT_DATABASE_URL in environment or .env",
    );
    process.exit(1);
  }

  const oldDb = new PrismaClient({
    datasources: { db: { url: oldUrl } },
  });
  const newDb = new PrismaClient({
    datasources: { db: { url: newUrl } },
  });

  try {
    if (dryRun) {
      const [
        users,
        courses,
        attachments,
        chapters,
        chapterAttachments,
        userProgress,
        purchaseCodes,
        purchases,
        balanceTransactions,
        quizzes,
        questions,
        quizResults,
        quizAnswers,
      ] = await Promise.all([
        oldDb.user.count(),
        oldDb.course.count(),
        oldDb.attachment.count(),
        oldDb.chapter.count(),
        oldDb.chapterAttachment.count(),
        oldDb.userProgress.count(),
        oldDb.purchaseCode.count(),
        oldDb.purchase.count(),
        oldDb.balanceTransaction.count(),
        oldDb.quiz.count(),
        oldDb.question.count(),
        oldDb.quizResult.count(),
        oldDb.quizAnswer.count(),
      ]);
      console.log("Dry run — row counts on OLD database:");
      console.table({
        User: users,
        Course: courses,
        Attachment: attachments,
        Chapter: chapters,
        ChapterAttachment: chapterAttachments,
        UserProgress: userProgress,
        PurchaseCode: purchaseCodes,
        Purchase: purchases,
        BalanceTransaction: balanceTransactions,
        Quiz: quizzes,
        Question: questions,
        QuizResult: quizResults,
        QuizAnswer: quizAnswers,
      });
      return;
    }

    const copyMany = async (
      label: string,
      rows: unknown[],
      insert: (batch: unknown[]) => Promise<{ count: number }>,
    ) => {
      if (rows.length === 0) {
        console.log(`${label}: 0 (skipped)`);
        return;
      }
      let copied = 0;
      for (const batch of chunk(rows, BATCH)) {
        const r = await insert(batch);
        copied += r.count;
      }
      console.log(`${label}: ${rows.length} read, ${copied} inserted (new rows only with skipDuplicates)`);
    }

    const users = await oldDb.user.findMany();
    await copyMany("User", users, (batch) =>
      newDb.user.createMany({
        data: batch as Parameters<typeof newDb.user.createMany>[0]["data"],
        skipDuplicates: true,
      }),
    );

    const courses = await oldDb.course.findMany();
    await copyMany("Course", courses, (batch) =>
      newDb.course.createMany({
        data: batch as Parameters<typeof newDb.course.createMany>[0]["data"],
        skipDuplicates: true,
      }),
    );

    const attachments = await oldDb.attachment.findMany();
    await copyMany("Attachment", attachments, (batch) =>
      newDb.attachment.createMany({
        data: batch as Parameters<typeof newDb.attachment.createMany>[0]["data"],
        skipDuplicates: true,
      }),
    );

    const chapters = await oldDb.chapter.findMany();
    await copyMany("Chapter", chapters, (batch) =>
      newDb.chapter.createMany({
        data: batch as Parameters<typeof newDb.chapter.createMany>[0]["data"],
        skipDuplicates: true,
      }),
    );

    const chapterAttachments = await oldDb.chapterAttachment.findMany();
    await copyMany("ChapterAttachment", chapterAttachments, (batch) =>
      newDb.chapterAttachment.createMany({
        data: batch as Parameters<
          typeof newDb.chapterAttachment.createMany
        >[0]["data"],
        skipDuplicates: true,
      }),
    );

    const quizzes = await oldDb.quiz.findMany();
    await copyMany("Quiz", quizzes, (batch) =>
      newDb.quiz.createMany({
        data: batch as Parameters<typeof newDb.quiz.createMany>[0]["data"],
        skipDuplicates: true,
      }),
    );

    const questions = await oldDb.question.findMany();
    await copyMany("Question", questions, (batch) =>
      newDb.question.createMany({
        data: batch as Parameters<typeof newDb.question.createMany>[0]["data"],
        skipDuplicates: true,
      }),
    );

    const purchaseCodes = await oldDb.purchaseCode.findMany();
    await copyMany("PurchaseCode", purchaseCodes, (batch) =>
      newDb.purchaseCode.createMany({
        data: batch as Parameters<typeof newDb.purchaseCode.createMany>[0]["data"],
        skipDuplicates: true,
      }),
    );

    const purchases = await oldDb.purchase.findMany();
    await copyMany("Purchase", purchases, (batch) =>
      newDb.purchase.createMany({
        data: batch as Parameters<typeof newDb.purchase.createMany>[0]["data"],
        skipDuplicates: true,
      }),
    );

    const userProgress = await oldDb.userProgress.findMany();
    await copyMany("UserProgress", userProgress, (batch) =>
      newDb.userProgress.createMany({
        data: batch as Parameters<typeof newDb.userProgress.createMany>[0]["data"],
        skipDuplicates: true,
      }),
    );

    const balanceTransactions = await oldDb.balanceTransaction.findMany();
    await copyMany("BalanceTransaction", balanceTransactions, (batch) =>
      newDb.balanceTransaction.createMany({
        data: batch as Parameters<
          typeof newDb.balanceTransaction.createMany
        >[0]["data"],
        skipDuplicates: true,
      }),
    );

    const quizResults = await oldDb.quizResult.findMany();
    await copyMany("QuizResult", quizResults, (batch) =>
      newDb.quizResult.createMany({
        data: batch as Parameters<typeof newDb.quizResult.createMany>[0]["data"],
        skipDuplicates: true,
      }),
    );

    const quizAnswers = await oldDb.quizAnswer.findMany();
    await copyMany("QuizAnswer", quizAnswers, (batch) =>
      newDb.quizAnswer.createMany({
        data: batch as Parameters<typeof newDb.quizAnswer.createMany>[0]["data"],
        skipDuplicates: true,
      }),
    );

    console.log("\nDone. Verify with Prisma Studio on the new DIRECT URL if needed.");
  } finally {
    await oldDb.$disconnect();
    await newDb.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
