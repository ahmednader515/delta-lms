"use client";

import { useSession, signOut } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LogOut, GraduationCap } from "lucide-react";
import { handleLogout } from "@/lib/utils";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/contexts/language-context";

export const UserButton = () => {
  const { data: session, update } = useSession();
  const { t } = useLanguage();
  const [isGradeDialogOpen, setIsGradeDialogOpen] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<string | undefined>(undefined);
  const [isUpdating, setIsUpdating] = useState(false);

  // Map Arabic grade to select value
  const getGradeSelectValue = (arabicGrade: string | null | undefined): string | undefined => {
    if (!arabicGrade) return undefined;
    const gradeMap: Record<string, string> = {
      "الصف الأول الثانوي": "9",
      "الصف الثاني الثانوي": "10",
      "الصف الثالث الثانوي": "11"
    };
    return gradeMap[arabicGrade] || undefined;
  };

  // Map select value to Arabic grade
  const getArabicGrade = (selectValue: string): string => {
    const gradeMap: Record<string, string> = {
      "9": "الصف الأول الثانوي",
      "10": "الصف الثاني الثانوي",
      "11": "الصف الثالث الثانوي"
    };
    return gradeMap[selectValue] || selectValue;
  };

  // Load current grade when dialog opens
  useEffect(() => {
    if (isGradeDialogOpen && session?.user) {
      // Fetch current user data to get grade
      fetch("/api/user/profile")
        .then(res => {
          if (res.ok) {
            return res.json();
          }
          throw new Error("Failed to fetch profile");
        })
        .then(userData => {
          setSelectedGrade(getGradeSelectValue(userData.grade));
        })
        .catch((error) => {
          console.error("Error fetching user profile:", error);
          setSelectedGrade(undefined);
        });
    }
  }, [isGradeDialogOpen, session]);

  const handleLogoutClick = async () => {
    await handleLogout();
    await signOut();
  };

  const handleUpdateGrade = async () => {
    if (!selectedGrade) {
      toast.error(t("auth.errors.selectGradeError"));
      return;
    }

    setIsUpdating(true);
    try {
      const arabicGrade = getArabicGrade(selectedGrade);
      const response = await fetch("/api/user/grade", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ grade: arabicGrade }),
      });

      if (response.ok) {
        toast.success(t("user.grade.updateSuccess"));
        setIsGradeDialogOpen(false);
        // Update session to reflect new grade
        await update();
      } else {
        const error = await response.text();
        toast.error(error || t("user.grade.updateError"));
      }
    } catch (error) {
      console.error("Error updating grade:", error);
      toast.error(t("user.grade.updateError"));
    } finally {
      setIsUpdating(false);
    }
  };

  if (!session?.user) {
    return null;
  }

  const isStudent = session.user.role === "USER";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Avatar>
            <AvatarImage src={session.user.image || ""} />
            <AvatarFallback>
              {session.user.name?.charAt(0) || session.user.email?.charAt(0)}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isStudent && (
            <DropdownMenuItem
              onClick={() => setIsGradeDialogOpen(true)}
              className="cursor-pointer"
            >
              <GraduationCap className="h-4 w-4 mr-2" />
              {t("user.grade.changeGrade")}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={handleLogoutClick}
            className="text-red-600 cursor-pointer"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {t("navigation.logout")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Change Grade Dialog */}
      <Dialog open={isGradeDialogOpen} onOpenChange={(open) => {
        setIsGradeDialogOpen(open);
        if (!open) {
          // Reset grade selection when dialog closes
          setSelectedGrade(undefined);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("user.grade.title")}</DialogTitle>
            <DialogDescription>
              {t("user.grade.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="grade" className="text-right">
                {t("auth.grade")}
              </Label>
              <Select
                value={selectedGrade || undefined}
                onValueChange={(value) => setSelectedGrade(value)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder={t("auth.selectGrade")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="9">{t("auth.grade9")}</SelectItem>
                  <SelectItem value="10">{t("auth.grade10")}</SelectItem>
                  <SelectItem value="11">{t("auth.grade11")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsGradeDialogOpen(false)}
              disabled={isUpdating}
            >
              {t("common.cancel")}
            </Button>
            <Button onClick={handleUpdateGrade} disabled={isUpdating}>
              {isUpdating ? t("common.loading") : t("user.grade.saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
 