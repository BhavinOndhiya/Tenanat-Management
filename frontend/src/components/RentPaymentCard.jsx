import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../utils/api";
import { showToast } from "../utils/toast";
import Card from "./ui/Card";
import Button from "./ui/Button";
import Loader from "./ui/Loader";

export default function RentPaymentCard() {
  const { user } = useAuth();
  const [nextDue, setNextDue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (user?.role === "PG_TENANT") {
      loadNextDue();
    }
  }, [user]);

  const loadNextDue = async () => {
    try {
      setLoading(true);
      const data = await api.getNextRentDue();
      setNextDue(data);
    } catch (error) {
      showToast.error(error.message || "Failed to load payment details");
    } finally {
      setLoading(false);
    }
  };

  const loadRazorpayScript = () =>
    new Promise((resolve, reject) => {
      if (typeof window === "undefined") {
        reject(new Error("Razorpay is not available"));
        return;
      }

      if (window.Razorpay) {
        resolve();
        return;
      }

      const scriptId = "razorpay-checkout-js";
      const existingScript = document.getElementById(scriptId);
      if (existingScript) {
        existingScript.addEventListener("load", resolve, { once: true });
        existingScript.addEventListener("error", () =>
          reject(new Error("Failed to load Razorpay"))
        );
        return;
      }

      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Unable to load Razorpay"));
      document.body.appendChild(script);
    });

  const handlePayNow = async () => {
    if (!nextDue?.hasDue || paying) return;

    setPaying(true);
    try {
      const order = await api.createRentPaymentOrder(nextDue.paymentId);
      await loadRazorpayScript();

      if (!window.Razorpay) {
        throw new Error("Unable to initialize Razorpay");
      }

      const keyId =
        order.razorpayKeyId || import.meta.env.VITE_RAZORPAY_KEY_ID || "";

      if (!keyId) {
        throw new Error("Payment gateway is not configured");
      }

      let amountInPaise = order.amountInPaise || Math.round(order.amount * 100);

      // Check if this is a test payment (amount reduced for testing)
      const isTestPayment =
        order.notes?.isTestPayment ||
        (amountInPaise < Math.round((nextDue.totalAmount || 0) * 100) &&
          amountInPaise === 10000); // ₹100 test amount

      if (isTestPayment) {
        console.log(
          "[Payment] ⚠️ Test mode: Using reduced amount for Razorpay test account limits"
        );
        showToast.info(
          "Test mode: Using ₹100 for payment testing (actual amount will be recorded correctly)"
        );
      }

      const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];
      const periodLabel = `${monthNames[nextDue.periodMonth - 1]} ${
        nextDue.periodYear
      }`;

      const checkout = new window.Razorpay({
        key: keyId,
        amount: amountInPaise,
        currency: order.currency || "INR",
        name: "PG Rent Payment",
        description: `Rent payment for ${periodLabel}`,
        order_id: order.orderId,
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
        },
        theme: {
          color: "#2563eb",
        },
        handler: async (response) => {
          console.log(
            "[Payment] Razorpay payment response received:",
            response
          );
          setPaying(false);

          // Wait a moment for Razorpay to process
          await new Promise((resolve) => setTimeout(resolve, 2000));

          try {
            // Verify payment (fallback if webhook is delayed)
            console.log(`[Payment] Verifying payment ${nextDue.paymentId}...`);
            let verifyResult;
            let retries = 0;
            const maxRetries = 3;

            while (retries < maxRetries) {
              try {
                verifyResult = await api.verifyRentPayment(nextDue.paymentId);
                console.log(
                  `[Payment] Verify attempt ${retries + 1} result:`,
                  verifyResult
                );

                if (verifyResult.verified && verifyResult.status === "PAID") {
                  showToast.success(
                    "Payment successful! Invoice will be available shortly."
                  );
                  await loadNextDue();
                  return;
                }

                // If not verified yet, wait and retry
                if (retries < maxRetries - 1) {
                  console.log(
                    `[Payment] Payment not yet verified, retrying in 2 seconds...`
                  );
                  await new Promise((resolve) => setTimeout(resolve, 2000));
                }
                retries++;
              } catch (verifyError) {
                console.error(
                  `[Payment] Verification error (attempt ${retries + 1}):`,
                  verifyError
                );
                if (retries < maxRetries - 1) {
                  await new Promise((resolve) => setTimeout(resolve, 2000));
                }
                retries++;
              }
            }

            // If we get here, verification didn't succeed after retries
            if (verifyResult && !verifyResult.verified) {
              showToast.success(
                "Payment successful! Your payment is being processed. Please refresh in a moment."
              );
            } else {
              showToast.success(
                "Payment successful! Your payment is being processed. Please refresh in a moment."
              );
            }

            // Reload after delay to check status
            setTimeout(() => {
              loadNextDue();
            }, 3000);
          } catch (error) {
            console.error("[Payment] Handler error:", error);
            showToast.success(
              "Payment successful! Your payment is being processed. Please refresh in a moment."
            );
            // Still reload after delay
            setTimeout(() => {
              loadNextDue();
            }, 5000);
          }
        },
        modal: {
          ondismiss: () => {
            setPaying(false);
            showToast.info("Payment window closed");
          },
        },
      });

      checkout.on("payment.failed", (response) => {
        console.error("Payment failed:", response);
        setPaying(false);
        showToast.error(
          response.error?.description || "Payment failed. Please try again."
        );
      });

      // Add error handler
      checkout.on("payment.error", (response) => {
        console.error("Payment error:", response);
        setPaying(false);
        showToast.error(
          response.error?.description || "An error occurred during payment."
        );
      });

      checkout.open();
    } catch (error) {
      setPaying(false);
      showToast.error(error.message || "Unable to initiate payment");
    }
  };

  if (loading) {
    return (
      <Card padding="lg">
        <div className="flex items-center justify-center py-8">
          <Loader />
        </div>
      </Card>
    );
  }

  if (!nextDue?.hasDue) {
    return (
      <Card padding="lg">
        <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2">
          Rent Payment
        </h2>
        <p className="text-[var(--color-text-secondary)]">
          No pending payments at this time.
        </p>
      </Card>
    );
  }

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const periodLabel = `${monthNames[nextDue.periodMonth - 1]} ${
    nextDue.periodYear
  }`;

  return (
    <Card padding="lg" className="border-2 border-[var(--color-primary)]">
      <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
        Next Rent Due
      </h2>

      <div className="space-y-3">
        <div>
          <p className="text-sm text-[var(--color-text-secondary)]">Property</p>
          <p className="font-medium text-[var(--color-text-primary)]">
            {nextDue.property.name}
          </p>
          {nextDue.property.address && (
            <p className="text-xs text-[var(--color-text-tertiary)]">
              {nextDue.property.address}
            </p>
          )}
        </div>

        <div>
          <p className="text-sm text-[var(--color-text-secondary)]">Period</p>
          <p className="font-medium text-[var(--color-text-primary)]">
            {periodLabel}
          </p>
        </div>

        <div className="space-y-3 py-2 border-t border-b border-[var(--color-border)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Base Rent
              </p>
              <p className="text-lg font-bold text-[var(--color-text-primary)]">
                ₹
                {(nextDue.baseAmount || nextDue.amount).toLocaleString("en-IN")}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-[var(--color-text-secondary)]">
                Due Date
              </p>
              <p
                className={`font-medium ${
                  nextDue.isOverdue
                    ? "text-[var(--color-error)]"
                    : "text-[var(--color-text-primary)]"
                }`}
              >
                1st (Grace till {nextDue.billingGraceLastDay || 5}th)
              </p>
              {nextDue.isOverdue && (
                <p className="text-xs text-[var(--color-error)]">OVERDUE</p>
              )}
            </div>
          </div>
          {nextDue.lateFeeAmount > 0 && (
            <div className="pt-2 border-t border-[var(--color-border)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    Late Fee
                  </p>
                  <p className="text-sm text-[var(--color-error)]">
                    ₹{nextDue.lateFeeAmount.toLocaleString("en-IN")} (₹
                    {nextDue.lateFeePerDay || 50}/day after{" "}
                    {nextDue.billingGraceLastDay || 5}th)
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className="pt-2 border-t border-[var(--color-border)]">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                Total Amount
              </p>
              <p className="text-xl font-bold text-[var(--color-text-primary)]">
                ₹{nextDue.totalAmount.toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        </div>

        <Button
          onClick={handlePayNow}
          loading={paying}
          disabled={paying}
          className="w-full"
        >
          Pay Now
        </Button>
      </div>
    </Card>
  );
}
