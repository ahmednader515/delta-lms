"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Eye, EyeOff, UserPlus, ArrowLeft, CheckCircle } from "lucide-react";
import Link from "next/link";
import axios, { AxiosError } from "axios";
import { useLanguage } from "@/lib/contexts/language-context";

interface CreatedUser {
  id: string;
  fullName: string;
  phoneNumber: string;
  role: string;
}

export default function CreateAccountPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [createdUser, setCreatedUser] = useState<CreatedUser | null>(null);
  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    parentPhoneNumber: "",
    password: "",
    confirmPassword: "",
    grade: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validatePasswords = () => {
    return {
      match: formData.password === formData.confirmPassword,
      isValid: formData.password === formData.confirmPassword && formData.password.length > 0,
    };
  };

  const passwordChecks = validatePasswords();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    if (!passwordChecks.isValid) {
      toast.error(t("teacher.createAccount.errors.passwordsNotMatch"));
      setIsLoading(false);
      return;
    }

    if (!formData.grade) {
      toast.error(t("auth.errors.selectGradeError"));
      setIsLoading(false);
      return;
    }

    const gradeMap: Record<string, string> = {
      "9": "الصف الأول الثانوي",
      "10": "الصف الثاني الثانوي",
      "11": "الصف الثالث الثانوي"
    };

    try {
      const response = await axios.post("/api/teacher/create-account", {
        ...formData,
        grade: gradeMap[formData.grade] || formData.grade,
      });
      
      if (response.data.success) {
        setCreatedUser(response.data.user);
        toast.success(t("teacher.createAccount.errors.createSuccess"));
        // Reset form
        setFormData({
          fullName: "",
          phoneNumber: "",
          parentPhoneNumber: "",
          password: "",
          confirmPassword: "",
          grade: "",
        });
      }
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 400) {
        const errorMessage = axiosError.response.data as string;
        if (errorMessage.includes("Phone number already exists")) {
          toast.error(t("teacher.createAccount.errors.phoneExists"));
        } else if (errorMessage.includes("Parent phone number already exists")) {
          toast.error(t("teacher.createAccount.errors.parentPhoneExists"));
        } else if (errorMessage.includes("Phone number cannot be the same as parent phone number")) {
          toast.error(t("teacher.createAccount.errors.samePhone"));
        } else if (errorMessage.includes("Passwords do not match")) {
          toast.error(t("teacher.createAccount.errors.passwordsNotMatch"));
        } else {
          toast.error(t("teacher.createAccount.errors.createError"));
        }
      } else {
        toast.error(t("teacher.createAccount.errors.createError"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      fullName: "",
      phoneNumber: "",
      parentPhoneNumber: "",
      password: "",
      confirmPassword: "",
      grade: "",
    });
    setCreatedUser(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/teacher/courses">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("teacher.createAccount.back")}
            </Link>
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t("teacher.createAccount.title")}
          </h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {createdUser ? (
          <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <CheckCircle className="h-5 w-5" />
                {t("teacher.createAccount.success.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-green-700 dark:text-green-300">{t("auth.fullName")}</Label>
                  <p className="text-green-800 dark:text-green-200 font-semibold">{createdUser.fullName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-green-700 dark:text-green-300">{t("auth.phoneNumber")}</Label>
                  <p className="text-green-800 dark:text-green-200 font-semibold">{createdUser.phoneNumber}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <Button onClick={resetForm} className="bg-green-600 hover:bg-green-700 text-white">
                  {t("teacher.createAccount.success.createAnother")}
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/dashboard/teacher/courses">
                    {t("teacher.createAccount.success.backToCourses")}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                {t("teacher.createAccount.form.title")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">{t("teacher.createAccount.form.fullName")}</Label>
                    <Input
                      id="fullName"
                      name="fullName"
                      type="text"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      placeholder={t("teacher.createAccount.form.fullNamePlaceholder")}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">{t("teacher.createAccount.form.phoneNumber")}</Label>
                    <Input
                      id="phoneNumber"
                      name="phoneNumber"
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      placeholder={t("teacher.createAccount.form.phoneNumberPlaceholder")}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="parentPhoneNumber">{t("teacher.createAccount.form.parentPhoneNumber")}</Label>
                  <Input
                    id="parentPhoneNumber"
                    name="parentPhoneNumber"
                    type="tel"
                    value={formData.parentPhoneNumber}
                    onChange={handleInputChange}
                    placeholder={t("teacher.createAccount.form.parentPhoneNumberPlaceholder")}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="grade">{t("auth.grade")}</Label>
                  <Select value={formData.grade} onValueChange={(value) => setFormData(prev => ({ ...prev, grade: value }))} disabled={isLoading}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("auth.selectGrade")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="9">{t("auth.grade9")}</SelectItem>
                      <SelectItem value="10">{t("auth.grade10")}</SelectItem>
                      <SelectItem value="11">{t("auth.grade11")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">{t("teacher.createAccount.form.password")}</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={handleInputChange}
                        placeholder={t("teacher.createAccount.form.passwordPlaceholder")}
                        className="rtl:pr-10 ltr:pl-10"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent rtl:right-0 ltr:left-0"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">{t("teacher.createAccount.form.confirmPassword")}</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        placeholder={t("teacher.createAccount.form.confirmPasswordPlaceholder")}
                        className="rtl:pr-10 ltr:pl-10"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent rtl:right-0 ltr:left-0"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {formData.password && formData.confirmPassword && (
                  <div className={`text-sm ${passwordChecks.match ? 'text-green-600' : 'text-red-600'}`}>
                    {passwordChecks.match ? (
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                        {t("auth.passwordsMatch")}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-red-600 rounded-full"></span>
                        {t("auth.passwordsNotMatch")}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex gap-4">
                  <Button
                    type="submit"
                    disabled={isLoading || !passwordChecks.isValid || !formData.grade}
                    className="flex-1 bg-brand hover:bg-brand/90 text-white"
                  >
                    {isLoading ? t("teacher.createAccount.form.creating") : t("teacher.createAccount.form.createAccount")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                  >
                    {t("teacher.createAccount.form.reset")}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 