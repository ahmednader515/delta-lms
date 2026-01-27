"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Pencil, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { useNavigationRouter } from "@/lib/hooks/use-navigation-router";
import { useLanguage } from "@/lib/contexts/language-context";

interface Quiz {
  id: string;
  title: string;
  description: string;
  courseId: string;
  position: number;
  isPublished: boolean;
  course: { id: string; title: string };
  questions: { id: string }[];
  createdAt: string;
}

export default function AdminQuizzesPage() {
  const { t } = useLanguage();
  const router = useNavigationRouter();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const response = await fetch("/api/admin/quizzes");
        if (response.ok) {
          const data = await response.json();
          setQuizzes(data);
        } else {
          toast.error(t("admin.quizzes.errors.loadError"));
        }
      } catch (e) {
        toast.error(t("admin.quizzes.errors.loadErrorGeneric"));
      } finally {
        setLoading(false);
      }
    };
    fetchQuizzes();
  }, []);

  const filteredQuizzes = quizzes.filter((quiz) =>
    [quiz.title, quiz.course.title].some((value) =>
      value.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const handleViewQuiz = (quiz: Quiz) => {
    router.push(`/dashboard/teacher/quizzes/${quiz.id}`);
  };

  const handleTogglePublish = async (quiz: Quiz) => {
    setPublishingId(quiz.id);
    try {
      const response = await fetch(`/api/teacher/quizzes/${quiz.id}/publish`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isPublished: !quiz.isPublished }),
      });

      if (!response.ok) {
        throw new Error(t("admin.quizzes.errors.updateError"));
      }

      toast.success(quiz.isPublished ? t("admin.quizzes.errors.unpublishSuccess") : t("admin.quizzes.errors.publishSuccess"));
      setQuizzes((prev) =>
        prev.map((item) =>
          item.id === quiz.id ? { ...item, isPublished: !quiz.isPublished } : item
        )
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("admin.quizzes.errors.updateError"));
    } finally {
      setPublishingId(null);
    }
  };

  const handleDelete = async (quizId: string, quizTitle: string) => {
    const confirmed = window.confirm(t("admin.quizzes.errors.deleteConfirm", { title: quizTitle }));
    if (!confirmed) {
      return;
    }

    setDeletingId(quizId);
    try {
      const response = await fetch(`/api/admin/quizzes/${quizId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || t("admin.quizzes.errors.deleteError"));
      }

      setQuizzes((previous) => previous.filter((quiz) => quiz.id !== quizId));
      toast.success(t("admin.quizzes.errors.deleteSuccess"));
    } catch (error) {
      console.error("[ADMIN_DELETE_QUIZ]", error);
      toast.error(error instanceof Error ? error.message : t("admin.quizzes.errors.deleteError"));
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">{t("common.loading")}</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("admin.quizzes.title")}</h1>
        <Button onClick={() => router.push("/dashboard/admin/quizzes/create")} className="bg-brand hover:bg-brand/90 text-white">
          <Plus className="h-4 w-4" />
          {t("admin.quizzes.createNew")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("admin.quizzes.quizzesTitle")}</CardTitle>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("admin.quizzes.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="rtl:text-right ltr:text-left">{t("admin.quizzes.table.quizTitle")}</TableHead>
                <TableHead className="rtl:text-right ltr:text-left">{t("admin.quizzes.table.course")}</TableHead>
                <TableHead className="rtl:text-right ltr:text-left">{t("admin.quizzes.table.position")}</TableHead>
                <TableHead className="rtl:text-right ltr:text-left">{t("admin.quizzes.table.status")}</TableHead>
                <TableHead className="rtl:text-right ltr:text-left">{t("admin.quizzes.table.questionsCount")}</TableHead>
                <TableHead className="rtl:text-right ltr:text-left">{t("admin.quizzes.table.createdAt")}</TableHead>
                <TableHead className="rtl:text-right ltr:text-left">{t("admin.quizzes.table.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuizzes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    {t("admin.quizzes.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                filteredQuizzes.map((quiz) => (
                  <TableRow key={quiz.id}>
                    <TableCell className="font-medium">{quiz.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{quiz.course.title}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{quiz.position}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={quiz.isPublished ? "default" : "secondary"}>
                        {quiz.isPublished ? t("admin.quizzes.status.published") : t("admin.quizzes.status.draft")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{quiz.questions.length} {t("admin.quizzes.question")}</Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(quiz.createdAt).toLocaleDateString("ar-EG")}
                    </TableCell>
                    <TableCell className="flex flex-wrap items-center justify-end gap-2">
                      <Button
                        className="bg-brand hover:bg-brand/90 text-white"
                        size="sm"
                        onClick={() => handleViewQuiz(quiz)}
                      >
                        <Eye className="h-4 w-4" />
                        {t("admin.quizzes.actions.view")}
                      </Button>
                      <Button
                        className="bg-brand hover:bg-brand/90 text-white"
                        size="sm"
                        onClick={() => router.push(`/dashboard/admin/quizzes/${quiz.id}/edit`)}
                      >
                        <Pencil className="h-4 w-4" />
                        {t("admin.quizzes.actions.edit")}
                      </Button>
                      <Button
                        variant={quiz.isPublished ? "destructive" : "default"}
                        className={!quiz.isPublished ? "bg-brand hover:bg-brand/90 text-white" : ""}
                        size="sm"
                        disabled={publishingId === quiz.id}
                        onClick={() => handleTogglePublish(quiz)}
                      >
                        {publishingId === quiz.id
                          ? t("admin.quizzes.actions.updating")
                          : quiz.isPublished
                          ? t("admin.quizzes.actions.unpublish")
                          : t("admin.quizzes.actions.publish")}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={deletingId === quiz.id}
                        onClick={() => handleDelete(quiz.id, quiz.title)}
                      >
                        <Trash2 className="h-4 w-4" />
                        {deletingId === quiz.id ? t("admin.quizzes.actions.deleting") : t("admin.quizzes.actions.delete")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}


