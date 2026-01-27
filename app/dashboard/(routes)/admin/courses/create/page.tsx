import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

const AdminCreateCoursePage = async () => {
  const { userId } = await auth();

  if (!userId) {
    return redirect("/");
  }

  const course = await db.course.create({
    data: {
      userId,
      title: "Untitled Course", // This will be replaced with translation in the edit form
    },
  });

  // Redirect to admin course edit page
  return redirect(`/dashboard/admin/courses/${course.id}`);
};

export default AdminCreateCoursePage;


