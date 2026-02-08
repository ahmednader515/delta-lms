"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { Wallet, Plus, History, ArrowUpRight, MessageCircle, Copy, Check } from "lucide-react";
import { useLanguage } from "@/lib/contexts/language-context";

interface BalanceTransaction {
  id: string;
  amount: number;
  type: "DEPOSIT" | "PURCHASE";
  description: string;
  createdAt: string;
}

export default function BalancePage() {
  const { data: session } = useSession();
  const { t } = useLanguage();
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [transactions, setTransactions] = useState<BalanceTransaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [copiedOrangeCash, setCopiedOrangeCash] = useState(false);
  const [copiedInstapay, setCopiedInstapay] = useState(false);

  // Check if user is a student (USER role)
  const isStudent = session?.user?.role === "USER";
  
  const orangeCashNumber = "01224913239";
  const instapayNumber = "01147424972";
  const whatsappLink = `https://wa.me/201284495266`;

  useEffect(() => {
    fetchBalance();
    fetchTransactions();
  }, []);

  const fetchBalance = async () => {
    try {
      const response = await fetch("/api/user/balance");
      if (response.ok) {
        const data = await response.json();
        setBalance(data.balance);
      }
    } catch (error) {
      console.error("Error fetching balance:", error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await fetch("/api/balance/transactions");
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  const handleAddBalance = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error(t("balance.errors.invalidAmount"));
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/balance/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount: parseFloat(amount) }),
      });

      if (response.ok) {
        const data = await response.json();
        setBalance(data.newBalance);
        setAmount("");
        toast.success(t("balance.errors.addSuccess"));
        fetchTransactions(); // Refresh transactions
      } else {
        const error = await response.text();
        toast.error(error || t("balance.errors.addError"));
      }
    } catch (error) {
      console.error("Error adding balance:", error);
      toast.error(t("balance.errors.addError"));
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const copyToClipboard = (text: string, setCopiedState: (value: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopiedState(true);
    toast.success(t("balance.errors.copySuccess"));
    setTimeout(() => setCopiedState(false), 2000);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("balance.title")}</h1>
          <p className="text-muted-foreground">
            {isStudent 
              ? t("balance.description")
              : t("balance.addBalanceDescription")
            }
          </p>
        </div>
      </div>

      {/* Balance Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            {t("balance.accountBalance")}
          </CardTitle>
          <CardDescription>
            {t("balance.availableBalance")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-brand">
            {balance.toFixed(2)} {t("dashboard.egp")}
          </div>
        </CardContent>
      </Card>

      {/* Add Balance Section - Only for non-students */}
      {!isStudent && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              {t("balance.addBalance")}
            </CardTitle>
            <CardDescription>
              {t("balance.addBalanceSubtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input
                type="number"
                placeholder={t("balance.enterAmount")}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.01"
                className="flex-1"
              />
              <Button 
                onClick={handleAddBalance}
                disabled={isLoading}
                className="bg-brand hover:bg-brand/90"
              >
                {isLoading ? t("balance.adding") : t("balance.addBalanceButton")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Deposit Section - Only for students */}
      {isStudent && (
        <Card className="border-brand/20 bg-brand/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-brand" />
              {t("balance.addViaVodafone")}
            </CardTitle>
            <CardDescription>
              {t("balance.transferInstructions")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-card rounded-lg p-4 border-2 border-brand/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t("balance.orangeCash")}</p>
                    <p className="text-2xl font-bold text-brand">{orangeCashNumber}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(orangeCashNumber, setCopiedOrangeCash)}
                    className="h-10 w-10"
                  >
                    {copiedOrangeCash ? (
                      <Check className="h-4 w-4 text-brand" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="bg-card rounded-lg p-4 border-2 border-brand/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t("balance.instapay")}</p>
                    <p className="text-2xl font-bold text-brand">{instapayNumber}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(instapayNumber, setCopiedInstapay)}
                    className="h-10 w-10"
                  >
                    {copiedInstapay ? (
                      <Check className="h-4 w-4 text-brand" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="font-semibold text-sm">{t("balance.depositSteps")}</p>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>{t("balance.step1")}</li>
                <li>{t("balance.step2")}</li>
                <li>{t("balance.step3")}</li>
                <li>{t("balance.step4")}</li>
              </ol>
            </div>

            <Button
              asChild
              className="w-full bg-brand hover:bg-brand/90 text-white"
              size="lg"
            >
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="h-5 w-5 ml-2" />
                {t("balance.sendReceipt")}
              </a>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {t("balance.transactionHistory")}
          </CardTitle>
          <CardDescription>
            {t("balance.transactionHistoryDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingTransactions ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand mx-auto"></div>
              <p className="mt-2 text-muted-foreground">{t("common.loading")}</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">{t("balance.noTransactions")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      transaction.type === "DEPOSIT" 
                        ? "bg-green-100 text-green-600" 
                        : "bg-red-100 text-red-600"
                    }`}>
                      {transaction.type === "DEPOSIT" ? (
                        <Plus className="h-4 w-4" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4" />
                      )}
                    </div>
                                         <div>
                       <p className="font-medium">
                         {transaction.description.includes("Added") && transaction.type === "DEPOSIT" 
                           ? t("balance.addedToBalance", { amount: transaction.description.match(/(\d+(?:\.\d+)?)/)?.[1] || "0" })
                           : transaction.description.includes("Purchased course:") && transaction.type === "PURCHASE"
                           ? t("balance.purchasedCourse", { course: transaction.description.replace(/Purchased course: (.+)/, "$1") })
                           : transaction.description
                         }
                       </p>
                       <p className="text-sm text-muted-foreground">
                         {formatDate(transaction.createdAt)}
                       </p>
                       <p className="text-xs text-muted-foreground">
                         {transaction.type === "DEPOSIT" ? t("balance.deposit") : t("balance.purchase")}
                       </p>
                     </div>
                  </div>
                  <div className={`font-bold ${
                    transaction.type === "DEPOSIT" ? "text-green-600" : "text-red-600"
                  }`}>
                    {transaction.type === "DEPOSIT" ? "+" : "-"}
                    {Math.abs(transaction.amount).toFixed(2)} {t("dashboard.egp")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 