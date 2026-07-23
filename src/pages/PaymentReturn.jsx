import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PaymentAPI from "../api/paymentAPI.jsx";
import ProgressAPI from "../api/progressAPI.jsx";
import toast from "../utils/toast";

const POLL_INTERVAL_MS = 1500;
const MAX_POLLS = 12;
const AUTO_REDIRECT_DELAY_MS = 1800;

function normalizePaymentStatus(raw) {
  if (!raw) return "PENDING";
  const status = String(raw).trim().toUpperCase();

  if (status.includes("SUCCESS") || status.includes("PAID") || status === "00") return "SUCCESS";
  if (status.includes("CANCEL") || status.includes("CANCELED") || status.includes("CANCELLED")) return "CANCELLED";
  if (status.includes("FAIL") || status.includes("ERROR") || status.includes("FAILED")) return "FAILED";
  if (status.includes("PENDING") || status.includes("PROCESS") || status.includes("WAIT")) return "PENDING";

  return status;
}

function normalizeCancelFlag(raw) {
  if (raw == null) return false;
  const value = String(raw).trim().toLowerCase();
  return value === "true" || value === "1" || value === "yes";
}

function getPaymentId(payment) {
  return String(
    payment?.paymentId || payment?.id || payment?.transactionId || ""
  );
}

function getOrderCode(payment) {
  return String(
    payment?.providerOrderCode || payment?.orderCode || ""
  );
}

function extractCourseIdsFromPayment(payment) {
  const ids = [];

  if (payment?.courseId) ids.push(String(payment.courseId));
  if (Array.isArray(payment?.courseIds)) ids.push(...payment.courseIds.map((id) => String(id)));
  if (Array.isArray(payment?.purchasedCourseIds)) ids.push(...payment.purchasedCourseIds.map((id) => String(id)));

  if (Array.isArray(payment?.items)) {
    payment.items.forEach((item) => {
      if (item?.courseId) ids.push(String(item.courseId));
      if (item?.course?.id) ids.push(String(item.course.id));
    });
  }

  if (Array.isArray(payment?.courses)) {
    payment.courses.forEach((course) => {
      if (course?.id) ids.push(String(course.id));
      if (course?.courseId) ids.push(String(course.courseId));
    });
  }

  return [...new Set(ids)];
}

function findRelatedSuccessPayment(payments, pendingCourseIds, targetOrderCode, targetPaymentId) {
  if (!Array.isArray(payments) || payments.length === 0) return null;

  if (targetOrderCode) {
    const byOrderCode = payments.find((payment) => getOrderCode(payment) === String(targetOrderCode));
    if (byOrderCode) return byOrderCode;
  }

  if (targetPaymentId) {
    const byPaymentId = payments.find((payment) => getPaymentId(payment) === String(targetPaymentId));
    if (byPaymentId) return byPaymentId;
  }

  if (!pendingCourseIds.length) return payments[0];

  return (
    payments.find((payment) => {
      const paidCourseIds = new Set(extractCourseIdsFromPayment(payment));
      return pendingCourseIds.every((courseId) => paidCourseIds.has(String(courseId)));
    }) || null
  );
}

export default function PaymentReturn() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [uiState, setUiState] = useState("loading"); // loading | success | failed | cancelled | error
  const [details, setDetails] = useState(null);

  const returnData = useMemo(() => {
    const status = normalizePaymentStatus(
      searchParams.get("status") ||
        searchParams.get("paymentStatus") ||
        searchParams.get("code") ||
        searchParams.get("resultCode")
    );

    return {
      status,
      cancel: normalizeCancelFlag(searchParams.get("cancel")),
      orderCode: searchParams.get("orderCode") || searchParams.get("providerOrderCode") || null,
      paymentId: searchParams.get("paymentId") || searchParams.get("id") || null,
    };
  }, [searchParams]);

  const pendingCourseIds = useMemo(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem("pendingCourseIds") || "[]");
      return Array.isArray(parsed) ? parsed.map((id) => String(id)) : [];
    } catch {
      return [];
    }
  }, []);

  const pendingPaymentId = useMemo(() => {
    const raw = localStorage.getItem("pendingPaymentId");
    return raw ? String(raw) : null;
  }, []);

  const pendingOrderCode = useMemo(() => {
    const raw = localStorage.getItem("pendingOrderCode");
    return raw ? String(raw) : null;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const clearPendingPaymentData = () => {
      localStorage.removeItem("pendingCourseIds");
      localStorage.removeItem("pendingPaymentId");
      localStorage.removeItem("pendingOrderCode");
    };

    const verifyPayment = async () => {
      if (returnData.cancel || returnData.status === "CANCELLED") {
        clearPendingPaymentData();
        setUiState("cancelled");
        setDetails({ message: "Bạn đã hủy thanh toán." });
        toast.info("Thanh toán đã bị hủy.");
        return;
      }

      // ⚡ OPTIMIZATION: If URL status is already SUCCESS, display success UI instantly!
      if (returnData.status === "SUCCESS") {
        clearPendingPaymentData();
        setUiState("success");
        setDetails({
          orderCode: returnData.orderCode || pendingOrderCode || null,
          paymentId: returnData.paymentId || pendingPaymentId || null,
          message: "Thanh toán thành công!",
        });
        toast.success("Thanh toán thành công!");

        // Background fetch to enrich amount & exact payment details
        try {
          const successRes = await PaymentAPI.getMySuccessfulPayments();
          const payments = successRes?.data?.data || successRes?.data?.data?.items || [];
          if (Array.isArray(payments) && payments.length > 0) {
            const targetOrderCode = returnData.orderCode || pendingOrderCode;
            const targetPaymentId = returnData.paymentId || pendingPaymentId;
            const matched = findRelatedSuccessPayment(payments, pendingCourseIds, targetOrderCode, targetPaymentId) || payments[0];
            if (matched) {
              const amount = Number(matched?.amount ?? matched?.totalAmount ?? matched?.paidAmount);
              setDetails((prev) => ({
                ...prev,
                paymentId: getPaymentId(matched) || prev?.paymentId,
                orderCode: getOrderCode(matched) || prev?.orderCode,
                amount: Number.isFinite(amount) ? amount : prev?.amount,
                raw: matched,
              }));
            }
          }
        } catch (bgErr) {
          console.warn("Background payment detail fetch warning:", bgErr);
        }
        return;
      }

      try {
        setUiState("loading");

        for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
          if (cancelled) return;

          const successRes = await PaymentAPI.getMySuccessfulPayments();
          const payload = successRes?.data;

          if (!payload?.success) {
            await sleep(500);
            continue;
          }

          const payments = Array.isArray(payload?.data)
            ? payload.data
            : Array.isArray(payload?.data?.items)
              ? payload.data.items
              : [];

          const targetOrderCode = returnData.orderCode || pendingOrderCode;
          const targetPaymentId = returnData.paymentId || pendingPaymentId;

          const matchedPayment = findRelatedSuccessPayment(
            payments,
            pendingCourseIds,
            targetOrderCode,
            targetPaymentId
          );
          const fallbackPayment = !pendingCourseIds.length && payments.length ? payments[0] : null;
          const confirmedPayment = matchedPayment || fallbackPayment;

          if (confirmedPayment) {
            clearPendingPaymentData();

            const amount = Number(
              confirmedPayment?.amount ?? confirmedPayment?.totalAmount ?? confirmedPayment?.paidAmount
            );

            setUiState("success");
            setDetails({
              paymentId: getPaymentId(confirmedPayment) || null,
              orderCode: getOrderCode(confirmedPayment) || targetOrderCode || null,
              amount: Number.isFinite(amount) ? amount : undefined,
              message: payload?.message || "Thanh toán thành công",
              raw: confirmedPayment,
            });

            toast.success("Thanh toán thành công!");
            return;
          }

          // Chờ webhook/đồng bộ payment history
          await sleep(500);
        }

        if (!cancelled) {
          if (returnData.status === "SUCCESS" || pendingPaymentId || pendingOrderCode) {
            clearPendingPaymentData();

            setUiState("success");
            setDetails({
              paymentId: returnData.paymentId || pendingPaymentId || null,
              orderCode: returnData.orderCode || pendingOrderCode || null,
              message: "Thanh toán đã hoàn tất. Hệ thống đang đồng bộ giao dịch, bạn có thể vào My Courses ngay.",
            });
            toast.success("Thanh toán thành công!");
            return;
          }

          setUiState("error");
          setDetails({
            message:
              "Chưa ghi nhận thanh toán thành công. Vui lòng tải lại trang sau vài giây hoặc kiểm tra lại trong My Courses.",
          });
        }
      } catch (err) {
        if (cancelled) return;
        console.error("❌ Error verifying payment:", err);
        setUiState("error");
        setDetails({
          message: err?.response?.data?.message || err.message || "Có lỗi xảy ra khi xác nhận thanh toán.",
        });
      }
    };

    verifyPayment();

    return () => {
      cancelled = true;
    };
  }, [pendingCourseIds, pendingOrderCode, pendingPaymentId, returnData]);

  const handleGoToCourses = () => navigate("/my-courses", { replace: true });
  const handleGoHome = () => navigate("/home", { replace: true });

  useEffect(() => {
    if (uiState !== "success") return;

    const timer = setTimeout(() => {
      navigate("/my-courses", { replace: true });
    }, AUTO_REDIRECT_DELAY_MS);

    return () => clearTimeout(timer);
  }, [navigate, uiState]);

  if (uiState === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-6">
        <div className="text-center p-12 bg-gray-800 rounded-2xl shadow-2xl border border-gray-700">
          <div className="mb-6 inline-block h-16 w-16 animate-spin rounded-full border-4 border-purple-500/20 border-t-purple-500"></div>
          <h2 className="text-2xl font-bold mb-2 text-white">Đang xác nhận thanh toán...</h2>
          <p className="text-gray-400">Vui lòng đợi trong giây lát.</p>
        </div>
      </div>
    );
  }

  if (uiState === "success" && details) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center p-8 bg-gradient-to-r from-green-600 to-green-700 rounded-2xl shadow-2xl">
            <div className="mb-4 inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">Thanh toán thành công!</h1>
            <p className="text-green-100 text-lg">{details.message}</p>
          </div>

          <div className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">
            <div className="bg-gray-900 px-6 py-4 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">Chi tiết giao dịch</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-gray-700">
                <span className="text-gray-400 font-medium">Mã giao dịch:</span>
                <span className="text-white font-bold">{details.paymentId || "N/A"}</span>
              </div>
              {details.orderCode && (
                <div className="flex justify-between items-center py-3 border-b border-gray-700">
                  <span className="text-gray-400 font-medium">Order code:</span>
                  <span className="text-white font-bold">{details.orderCode}</span>
                </div>
              )}
              {typeof details.amount === "number" && (
                <div className="flex justify-between items-center py-3 border-b border-gray-700">
                  <span className="text-gray-400 font-medium">Số tiền:</span>
                  <span className="text-green-400 font-bold text-xl">{details.amount.toLocaleString("vi-VN")} VNĐ</span>
                </div>
              )}
              <div className="flex gap-4 justify-center pt-4">
                <button
                  onClick={handleGoToCourses}
                  className="px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-lg font-bold rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Vào học ngay
                </button>
                <button
                  onClick={handleGoHome}
                  className="px-8 py-4 bg-gray-700 text-white text-lg font-semibold rounded-xl hover:bg-gray-600 transition-all duration-200"
                >
                  Về trang chủ
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if ((uiState === "failed" || uiState === "cancelled") && details) {
    const title = uiState === "cancelled" ? "Bạn đã hủy thanh toán" : "Thanh toán thất bại";
    const titleColor = uiState === "cancelled" ? "text-yellow-500" : "text-red-500";

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          <div className="text-center p-12 bg-gray-800 rounded-2xl shadow-2xl border border-gray-700">
            <h2 className={`text-3xl font-bold mb-4 ${titleColor}`}>{title}</h2>
            <p className="mb-6 text-gray-300 text-lg">{details.message}</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => navigate(-1)}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-lg"
              >
                Quay lại
              </button>
              <button
                onClick={handleGoHome}
                className="px-6 py-3 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 transition-all duration-200"
              >
                Về trang chủ
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <div className="text-center p-12 bg-gray-800 rounded-2xl shadow-2xl border border-gray-700">
          <h2 className="text-3xl font-bold mb-4 text-yellow-500">Có lỗi xảy ra</h2>
          <p className="mb-6 text-gray-300 text-lg">{details?.message || "Không thể xử lý thanh toán"}</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleGoToCourses}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-lg"
            >
              Xem My Courses
            </button>
            <button
              onClick={handleGoHome}
              className="px-6 py-3 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 transition-all duration-200"
            >
              Về trang chủ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
