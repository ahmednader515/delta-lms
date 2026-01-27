import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

const CreatePage = async () => {
    const { userId } = await auth();

    if (!userId) {
        return redirect("/");
    }

    // Note: This will be translated on the client side when the course edit page loads
    const course = await db.course.create({
        data: {
            userId,
            title: "Untitled Course", // This will be replaced with translation in the edit form
        }
    });

    return redirect(`/dashboard/teacher/courses/${course.id}`);
};

export default CreatePage; 