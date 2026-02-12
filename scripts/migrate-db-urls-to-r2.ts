import "dotenv/config";
import { db } from "../lib/db";
import * as fs from "fs";
import * as path from "path";

interface MappingEntry {
  uploadthingUrl: string;
  r2Url: string;
  r2Key: string;
}

async function migrateDatabaseUrls() {
  try {
    console.log("🔄 Starting database URL migration to R2...");

    // Load mapping file
    const mappingFile = path.join(process.cwd(), "uploadthing-to-r2-mapping.json");
    if (!fs.existsSync(mappingFile)) {
      throw new Error(`Mapping file not found: ${mappingFile}\nPlease run upload-to-r2 script first.`);
    }

    const mapping: MappingEntry[] = JSON.parse(fs.readFileSync(mappingFile, "utf-8"));
    console.log(`📋 Loaded ${mapping.length} URL mappings`);

    // Create lookup maps
    const urlMap = new Map<string, string>();
    const keyMap = new Map<string, string>();

    mapping.forEach((entry) => {
      urlMap.set(entry.uploadthingUrl, entry.r2Url);
      // Extract key from R2 URL for key-based matching
      const key = entry.r2Url.split("/").pop() || "";
      if (key) {
        keyMap.set(entry.uploadthingUrl, key);
      }
    });

    let updatedCount = 0;

    // Update User images
    console.log("👤 Updating user images...");
    const users = await db.user.findMany({
      where: {
        image: {
          not: null,
        },
      },
    });

    for (const user of users) {
      if (user.image) {
        const newUrl = urlMap.get(user.image);
        if (newUrl) {
          await db.user.update({
            where: { id: user.id },
            data: { image: newUrl },
          });
          updatedCount++;
        }
      }
    }
    console.log(`   Updated ${updatedCount} user images`);

    // Update Course images
    console.log("📚 Updating course images...");
    let courseCount = 0;
    const courses = await db.course.findMany({
      where: {
        imageUrl: {
          not: null,
        },
      },
    });

    for (const course of courses) {
      if (course.imageUrl) {
        const newUrl = urlMap.get(course.imageUrl);
        if (newUrl) {
          await db.course.update({
            where: { id: course.id },
            data: { imageUrl: newUrl },
          });
          courseCount++;
        }
      }
    }
    console.log(`   Updated ${courseCount} course images`);
    updatedCount += courseCount;

    // Update Chapter videos
    console.log("🎥 Updating chapter videos...");
    let chapterCount = 0;
    const chapters = await db.chapter.findMany({
      where: {
        videoUrl: {
          not: null,
        },
      },
    });

    for (const chapter of chapters) {
      if (chapter.videoUrl) {
        const newUrl = urlMap.get(chapter.videoUrl);
        if (newUrl) {
          await db.chapter.update({
            where: { id: chapter.id },
            data: { videoUrl: newUrl },
          });
          chapterCount++;
        }
      }
    }
    console.log(`   Updated ${chapterCount} chapter videos`);
    updatedCount += chapterCount;

    // Update Chapter Attachments
    console.log("📎 Updating chapter attachments...");
    let attachmentCount = 0;
    const attachments = await db.chapterAttachment.findMany();

    for (const attachment of attachments) {
      const newUrl = urlMap.get(attachment.url);
      if (newUrl) {
        await db.chapterAttachment.update({
          where: { id: attachment.id },
          data: { url: newUrl },
        });
        attachmentCount++;
      }
    }
    console.log(`   Updated ${attachmentCount} attachments`);
    updatedCount += attachmentCount;

    console.log(`\n✅ Migration complete! Updated ${updatedCount} records.`);
  } catch (error: any) {
    console.error("❌ Error migrating database URLs:", error.message);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

migrateDatabaseUrls();

