"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Edit, Eye, Trash2 } from "lucide-react";
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
    course: {
        title: string;
    };
    questions: Question[];
    createdAt: string;
    updatedAt: string;
}

interface Question {
    id: string;
    text: string;
    imageUrl?: string;
    type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER";
    options?: string[];
    correctAnswer: string;
    points: number;
}

const QuizzesPage = () => {
    const { t } = useLanguage();
    const router = useNavigationRouter();
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    useEffect(() => {
        fetchQuizzes();
    }, []);

    const fetchQuizzes = async () => {
        try {
            const response = await fetch("/api/teacher/quizzes");
            if (response.ok) {
                const data = await response.json();
                setQuizzes(data);
            }
        } catch (error) {
            console.error("Error fetching quizzes:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteQuiz = async (quiz: Quiz) => {
        if (!confirm(t("teacher.quizzes.deleteConfirm"))) {
            return;
        }

        setIsDeleting(quiz.id);
        try {
            const response = await fetch(`/api/courses/${quiz.courseId}/quizzes/${quiz.id}`, {
                method: "DELETE",
            });

            if (response.ok) {
                toast.success(t("teacher.quizzes.deleteSuccess"));
                fetchQuizzes();
            } else {
                toast.error(t("teacher.quizzes.deleteError"));
            }
        } catch (error) {
            console.error("Error deleting quiz:", error);
            toast.error(t("teacher.quizzes.deleteError"));
        } finally {
            setIsDeleting(null);
        }
    };

    const handleViewQuiz = (quiz: Quiz) => {
        router.push(`/dashboard/teacher/quizzes/${quiz.id}`);
    };

    const filteredQuizzes = quizzes.filter(quiz =>
        quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quiz.course.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {t("teacher.quizzes.title")}
                </h1>
                <Button onClick={() => router.push("/dashboard/teacher/quizzes/create")} className="bg-brand hover:bg-brand/90 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    {t("teacher.quizzes.createNew")}
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t("sidebar.teacher.quizzes")}</CardTitle>
                    <div className="flex items-center space-x-2">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={t("teacher.quizzes.searchPlaceholder")}
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
                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.quizzes.table.quizTitle")}</TableHead>
                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.quizzes.table.course")}</TableHead>
                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.quizzes.table.position")}</TableHead>
                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.quizzes.table.status")}</TableHead>
                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.quizzes.table.questionsCount")}</TableHead>
                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.quizzes.table.createdAt")}</TableHead>
                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.quizzes.table.actions")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredQuizzes.map((quiz) => (
                                <TableRow key={quiz.id}>
                                    <TableCell className="font-medium">
                                        {quiz.title}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">
                                            {quiz.course.title}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">
                                            {quiz.position}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={quiz.isPublished ? "default" : "secondary"}>
                                            {quiz.isPublished ? t("teacher.quizzes.status.published") : t("teacher.quizzes.status.draft")}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">
                                            {quiz.questions.length} {t("homepage.quiz")}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {new Date(quiz.createdAt).toLocaleDateString("ar-EG")}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center space-x-2">
                                            <Button 
                                                size="sm" 
                                                className="bg-brand hover:bg-brand/90 text-white"
                                                onClick={() => handleViewQuiz(quiz)}
                                            >
                                                <Eye className="h-4 w-4" />
                                                {t("teacher.quizzes.actions.view")}
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                className="bg-brand hover:bg-brand/90 text-white"
                                                onClick={() => router.push(`/dashboard/teacher/quizzes/${quiz.id}/edit`)}
                                            >
                                                <Edit className="h-4 w-4" />
                                                {t("teacher.quizzes.actions.edit")}
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                variant={quiz.isPublished ? "destructive" : "default"}
                                                className={!quiz.isPublished ? "bg-brand hover:bg-brand/90 text-white" : ""}
                                                onClick={async () => {
                                                    try {
                                                        const response = await fetch(`/api/teacher/quizzes/${quiz.id}/publish`, {
                                                            method: "PATCH",
                                                            headers: {
                                                                "Content-Type": "application/json",
                                                            },
                                                            body: JSON.stringify({
                                                                isPublished: !quiz.isPublished
                                                            }),
                                                        });
                                                        if (response.ok) {
                                                            toast.success(quiz.isPublished ? t("teacher.quizzes.unpublishSuccess") : t("teacher.quizzes.publishSuccess"));
                                                            fetchQuizzes();
                                                        }
                                                    } catch (error) {
                                                        toast.error(t("teacher.quizzes.publishError"));
                                                    }
                                                }}
                                            >
                                                {quiz.isPublished ? t("teacher.quizzes.actions.unpublish") : t("teacher.quizzes.actions.publish")}
                                            </Button>

                                            <Button 
                                                size="sm" 
                                                variant="destructive"
                                                onClick={() => handleDeleteQuiz(quiz)}
                                                disabled={isDeleting === quiz.id}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                {isDeleting === quiz.id ? t("teacher.quizzes.actions.deleting") : t("teacher.quizzes.actions.delete")}
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default QuizzesPage; 