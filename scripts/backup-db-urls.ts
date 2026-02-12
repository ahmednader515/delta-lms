import "dotenv/config";
import { db } from "../lib/db";
import * as fs from "fs";
import * as path from "path";

interface BackupData {
  timestamp: string;
  users: Array<{ id: string; image: string | null }>;
  courses: Array<{ id: string; imageUrl: string | null }>;
  chapters: Array<{ id: string; videoUrl: string | null }>;
  attachments: Array<{ id: string; url: string }>;
}

async function backupDatabaseUrls() {
  try {
    console.log("📦 Starting database URL backup...");

    const users = await db.user.findMany({
      select: {
        id: true,
        image: true,
      },
    });

    const courses = await db.course.findMany({
      select: {
        id: true,
        imageUrl: true,
      },
    });

    const chapters = await db.chapter.findMany({
      select: {
        id: true,
        videoUrl: true,
      },
    });

    const attachments = await db.chapterAttachment.findMany({
      select: {
        id: true,
        url: true,
      },
    });

    const backupData: BackupData = {
      timestamp: new Date().toISOString(),
      users,
      courses,
      chapters,
      attachments,
    };

    const backupDir = path.join(process.cwd(), "backups");
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const backupFile = path.join(backupDir, `db-urls-backup-${Date.now()}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));

    console.log(`✅ Backup saved to: ${backupFile}`);
    console.log(`   - Users: ${users.length}`);
    console.log(`   - Courses: ${courses.length}`);
    console.log(`   - Chapters: ${chapters.length}`);
    console.log(`   - Attachments: ${attachments.length}`);
  } catch (error: any) {
    console.error("❌ Error backing up database URLs:", error.message);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

backupDatabaseUrls();

