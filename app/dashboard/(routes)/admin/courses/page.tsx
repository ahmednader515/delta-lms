import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminCoursesContent } from "./_components/admin-courses-content";

const AdminCoursesPage = async () => {
  const { userId, user } = await auth();
  if (!userId) return redirect("/");

  // Only admin can access
  if (user?.role !== "ADMIN") {
    return redirect("/dashboard");
  }

  const courses = await db.course.findMany({
    include: {
      chapters: {
        select: {
          id: true,
          isPublished: true,
        }
      },
      quizzes: {
        select: {
          id: true,
          isPublished: true,
        }
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  }).then(courses => courses.map(course => ({
    ...course,
    price: course.price || 0,
    publishedChaptersCount: course.chapters.filter(ch => ch.isPublished).length,
    publishedQuizzesCount: course.quizzes.filter(q => q.isPublished).length,
  })));

  const unpublishedCourses = courses.filter(course => !course.isPublished);
  const hasUnpublishedCourses = unpublishedCourses.length > 0;

  return (
    <AdminCoursesContent courses={courses} hasUnpublishedCourses={hasUnpublishedCourses} />
  );
};

export default AdminCoursesPage;


