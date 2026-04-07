import React from "react";
import { useNavigate } from "react-router-dom";

export default function PaymentCancel() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <div className="text-center p-12 bg-gray-800 rounded-2xl shadow-2xl border border-gray-700">
          <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-full bg-yellow-500/20">
            <svg className="w-12 h-12 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold mb-4 text-yellow-500">Bạn đã hủy thanh toán</h2>
          <p className="mb-8 text-gray-300 text-lg">Bạn có thể quay lại khóa học và thử thanh toán lại bất cứ lúc nào.</p>

          <div className="flex gap-4 justify-center">
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-lg"
            >
              Quay lại
            </button>
            <button
              onClick={() => navigate("/home", { replace: true })}
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
