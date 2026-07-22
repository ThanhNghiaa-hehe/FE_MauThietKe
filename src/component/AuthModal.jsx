import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { signInWithGoogle } from "../config/firebaseConfig.jsx";
import AuthAPI from "../api/authAPI.jsx";
import toast from "../utils/toast.js";
import SuccessModal from "./SuccessModal.jsx";

function SixDigitOtpInput({ length = 6, value = "", onChange, onComplete, disabled }) {
  const inputRefs = React.useRef([]);

  const handleChange = (e, index) => {
    const val = e.target.value;
    if (!/^\d*$/.test(val)) return;

    if (val.length > 1) {
      const digits = val.slice(0, length).split("");
      const newOtp = digits.join("").slice(0, length);
      onChange(newOtp);
      const focusIndex = Math.min(digits.length, length - 1);
      if (inputRefs.current[focusIndex]) {
        inputRefs.current[focusIndex].focus();
      }
      if (newOtp.length === length && onComplete) {
        onComplete(newOtp);
      }
      return;
    }

    const currentDigits = (value || "").split("");
    currentDigits[index] = val;
    const newOtp = currentDigits.join("");
    onChange(newOtp);

    if (val && index < length - 1 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus();
    }

    if (newOtp.length === length && onComplete) {
      setTimeout(() => onComplete(newOtp), 50);
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (!value[index] && index > 0 && inputRefs.current[index - 1]) {
        inputRefs.current[index - 1].focus();
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").trim();
    if (/^\d+$/.test(pasteData)) {
      const pastedDigits = pasteData.slice(0, length);
      onChange(pastedDigits);
      if (pastedDigits.length === length && onComplete) {
        setTimeout(() => onComplete(pastedDigits), 50);
      }
      const focusIdx = Math.min(pastedDigits.length, length - 1);
      if (inputRefs.current[focusIdx]) {
        inputRefs.current[focusIdx].focus();
      }
    }
  };

  return (
    <div className="flex justify-between gap-2 my-4">
      {Array.from({ length }).map((_, idx) => (
        <input
          key={idx}
          ref={(el) => (inputRefs.current[idx] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[idx] || ""}
          onChange={(e) => handleChange(e, idx)}
          onKeyDown={(e) => handleKeyDown(e, idx)}
          onPaste={handlePaste}
          disabled={disabled}
          className="w-11 h-13 text-center text-xl font-bold rounded-xl bg-gray-900 border border-gray-700 text-white focus:border-purple-500 focus:bg-gray-800 focus:outline-none transition shadow-inner"
        />
      ))}
    </div>
  );
}

export default function AuthModal() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("register");
  
  // Success Modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Register state
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [step, setStep] = useState("register");
  

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Forgot Password state
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordToken, setForgotPasswordToken] = useState("");
  const [forgotPasswordOtp, setForgotPasswordOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [forgotPasswordStep, setForgotPasswordStep] = useState("email"); // email, verify-otp, reset-password
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // UI toggles
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Loading states
  const [registerLoading, setRegisterLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);

  const apiBase = "http://localhost:8080/api/auth";

  const safeJson = async (res) => {
    try { return await res.json(); } catch { return {}; }
  };

  // Register
  const register = async () => {
    try {
      setRegisterLoading(true);
      const res = await AuthAPI.register({
        fullname: fullName,
        email: registerEmail,
        password: registerPassword,
        phoneNumber,
      });

      const token = res.data?.data?.token;

      if (res.data.success && token) {
        sessionStorage.setItem("pendingOtpToken", token);
        setOtpToken(token);
        setStep("verify-otp");
        toast.success("Gửi OTP thành công! Vui lòng kiểm tra email của bạn.");
      } else {
        toast.error(res.data.message || "Register failed");
      }
    } catch (e) {
      toast.error(e.response?.data?.message || "Error");
    } finally {
      setRegisterLoading(false);
    }
  };


  const isVerifyingRef = React.useRef(false);

  // Verify OTP & Auto-login
 const verifyOtp = async (overrideCode) => {
  const code = typeof overrideCode === "string" ? overrideCode : otpCode;
  if (!code || code.length < 6 || isVerifyingRef.current) return;

  const targetToken = otpToken || sessionStorage.getItem("pendingOtpToken");
  if (!targetToken) {
    toast.error("Không tìm thấy mã phiên OTP. Vui lòng thử đăng ký lại!");
    return;
  }

  try {
    isVerifyingRef.current = true;
    setOtpLoading(true);

    console.log("👉 Running verifyOtp...");
    console.log("Token gửi lên:", targetToken);
    console.log("OTP gửi lên:", code);

    const res = await AuthAPI.verifyOtp({
      token: targetToken,
      otp: code,
    });

    console.log("👉 VERIFY RESPONSE:", res.data);

    if (res.data?.success) {
      sessionStorage.removeItem("pendingOtpToken");
      const accessToken = res.data?.data?.accessToken;
      const userObj = res.data?.data?.user;
      
      if (accessToken) {
        // Tự động đăng nhập
        const decoded = jwtDecode(accessToken);
        let userRole = decoded.role || decoded.authorities?.[0] || decoded.scope || userObj?.role || "USER";
        if (userRole && userRole.startsWith("ROLE_")) {
          userRole = userRole.substring(5);
        }

        const enrolledCourses = localStorage.getItem("enrolledCourses");
        const favoriteCourses = localStorage.getItem("favoriteCourses");

        localStorage.clear();

        if (enrolledCourses) localStorage.setItem("enrolledCourses", enrolledCourses);
        if (favoriteCourses) localStorage.setItem("favoriteCourses", favoriteCourses);

        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("userEmail", userObj?.email || registerEmail || decoded.sub || "");
        localStorage.setItem("userFullname", userObj?.fullname || fullName || "User");
        localStorage.setItem("userRole", userRole);

        setSuccessMessage("Đăng ký & Đăng nhập thành công! Đang chuyển trang...");
        setShowSuccessModal(true);

        setTimeout(() => {
          setShowSuccessModal(false);
          window.location.href = (userRole === "ADMIN" || userRole === "ROLE_ADMIN") ? "/admin/dashboard" : "/home";
        }, 1000);
      } else {
        // Fallback chuyển tab login nếu server không trả accessToken
        setSuccessMessage("Đăng ký tài khoản thành công! Hãy đăng nhập để tiếp tục.");
        setShowSuccessModal(true);
        setTimeout(() => {
          setActiveTab("login");
          setShowSuccessModal(false);
        }, 1200);
      }
    } else {
      console.warn("Server báo lỗi:", res.data?.message);
      toast.error(res.data?.message || "Mã OTP không chính xác");
    }

  } catch (e) {
    console.error("❌ VERIFY ERROR:", e);
    console.error("❌ RESPONSE ERROR:", e.response?.data);
    toast.error(e.response?.data?.message || "Xác thực OTP thất bại");
  } finally {
    setOtpLoading(false);
    isVerifyingRef.current = false;
  }
};




  // Login
  const login = async () => {
    try {
      setLoginLoading(true);
      const res = await AuthAPI.login({
        email: loginEmail,
        password: loginPassword,
      });

      console.log("🔍 LOGIN RESPONSE:", res.data);

      const accessToken = res.data?.data?.accessToken;

      if (res.data.success && accessToken) {
        // Decode JWT token để lấy role
        const decoded = jwtDecode(accessToken);
        console.log("🔓 Decoded Token:", decoded);
        
        let userRole = decoded.role || decoded.authorities?.[0] || decoded.scope;
        
        // Remove ROLE_ prefix if exists (Spring Security adds it)
        if (userRole && userRole.startsWith("ROLE_")) {
          userRole = userRole.substring(5); // "ROLE_ADMIN" -> "ADMIN"
        }
        
        console.log("👤 User Role:", userRole);

        // Backup enrolled courses và favorites trước khi clear
        const enrolledCourses = localStorage.getItem("enrolledCourses");
        const favoriteCourses = localStorage.getItem("favoriteCourses");

        // Clear old auth data
        localStorage.clear();
        
        // Restore user data
        if (enrolledCourses) {
          localStorage.setItem("enrolledCourses", enrolledCourses);
        }
        if (favoriteCourses) {
          localStorage.setItem("favoriteCourses", favoriteCourses);
        }
        
        // Set new auth data
        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("userEmail", loginEmail);
        if (decoded.fullname || decoded.name) {
          localStorage.setItem("userFullname", decoded.fullname || decoded.name);
        }
        if (userRole) {
          localStorage.setItem("userRole", userRole);
        }
        
        console.log("✅ Auth data saved to localStorage");
        
        // Show success modal
        setSuccessMessage("Đăng nhập thành công! Đang chuyển trang...");
        setShowSuccessModal(true);
        
        // Tự động redirect dựa vào role sau 2 giây
        setTimeout(() => {
          if (userRole === "ADMIN" || userRole === "ROLE_ADMIN") {
            console.log("🔴 Redirecting to ADMIN dashboard");
            navigate("/admin/dashboard", { replace: true });
          } else {
            console.log("🟢 Redirecting to USER home");
            navigate("/home", { replace: true });
          }
        }, 2000);
      } else {
        toast.error(res.data.message || "Login failed");
      }
    } catch (e) {
      console.error("❌ Login error:", e);
      toast.error(e.response?.data?.message || "Login error");
    } finally {
      setLoginLoading(false);
    }
  };


  // Firebase Google Sign-In
  const googleSignIn = async () => {
    try {
      setGoogleLoading(true);

      const idToken = await signInWithGoogle();

      const res = await AuthAPI.googleLogin(idToken);

      if (res.data.success) {
        const token = res.data.data?.accessToken;
        
        // Decode JWT token để lấy role
        const decoded = jwtDecode(token);
        let userRole = decoded.role || decoded.authorities?.[0] || decoded.scope;
        const userEmail = decoded.email || decoded.sub;
        
        // Remove ROLE_ prefix if exists (Spring Security adds it)
        if (userRole && userRole.startsWith("ROLE_")) {
          userRole = userRole.substring(5); // "ROLE_ADMIN" -> "ADMIN"
        }
        
        // Backup enrolled courses và favorites trước khi clear
        const enrolledCourses = localStorage.getItem("enrolledCourses");
        const favoriteCourses = localStorage.getItem("favoriteCourses");
        
        // Clear old data first
        localStorage.clear();
        
        // Restore user data
        if (enrolledCourses) {
          localStorage.setItem("enrolledCourses", enrolledCourses);
        }
        if (favoriteCourses) {
          localStorage.setItem("favoriteCourses", favoriteCourses);
        }
        
        // Set new auth data
        localStorage.setItem("accessToken", token);
        if (userEmail) {
          localStorage.setItem("userEmail", userEmail);
        }
        if (userRole) {
          localStorage.setItem("userRole", userRole);
        }
        
        // Tự động redirect dựa vào role
        if (userRole === "ADMIN" || userRole === "ROLE_ADMIN") {
          navigate("/admin/dashboard", { replace: true });
        } else {
          navigate("/home", { replace: true });
        }
      } else {
        toast.error(res.data.message || "Google login failed");
      }
    } catch (e) {
      toast.error(e.response?.data?.message || "Google login error");
    } finally {
      setGoogleLoading(false);
    }
  };

  // Forgot Password - Step 1: Send OTP to email
  const sendForgotPasswordOtp = async () => {
    try {
      setForgotPasswordLoading(true);
      const res = await AuthAPI.forgotPassword(forgotPasswordEmail);

      if (res.data.success) {
        setForgotPasswordToken(res.data.data?.token);
        setForgotPasswordStep("verify-otp");
        toast.success("OTP đã được gửi đến email của bạn!");
      } else {
        toast.error(res.data.message || "Gửi OTP thất bại");
      }
    } catch (e) {
      toast.error(e.response?.data?.message || "Email không tồn tại");
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  // Forgot Password - Step 2: Verify OTP
  const verifyForgotPasswordOtp = async (overrideCode) => {
    const code = typeof overrideCode === "string" ? overrideCode : forgotPasswordOtp;
    if (!code || code.length < 6) return;
    try {
      setForgotPasswordLoading(true);
      const res = await AuthAPI.verifyOtpPassword({
        token: forgotPasswordToken,
        otp: code,
      });

      if (res.data.success) {
        setForgotPasswordStep("reset-password");
        toast.success("Xác thực OTP thành công!");
      } else {
        toast.error(res.data.message || "OTP không đúng");
      }
    } catch (e) {
      toast.error(e.response?.data?.message || "Xác thực OTP thất bại");
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  // Forgot Password - Step 3: Reset Password
  const resetPassword = async () => {
    try {
      setForgotPasswordLoading(true);
      const res = await AuthAPI.resetPassword({
        email: forgotPasswordEmail,
        token: forgotPasswordToken,
        newPassword: newPassword,
      });

      if (res.data.success) {
        toast.success("Đặt lại mật khẩu thành công!");
        // Reset states
        setShowForgotPassword(false);
        setForgotPasswordStep("email");
        setForgotPasswordEmail("");
        setForgotPasswordOtp("");
        setNewPassword("");
        setActiveTab("login");
      } else {
        toast.error(res.data.message || "Đặt lại mật khẩu thất bại");
      }
    } catch (e) {
      toast.error(e.response?.data?.message || "Đặt lại mật khẩu thất bại");
    } finally {
      setForgotPasswordLoading(false);
    }
  };


  const Spinner = () => (
    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" className="opacity-25" />
      <path d="M4 12a8 8 0 018-8" className="opacity-75" />
    </svg>
  );

  const tabBase = "flex flex-1 flex-col items-center justify-center border-b-[3px] pb-3 pt-2";
  const registerTabClass = `${tabBase} ${activeTab === "register" ? "border-b-primary text-white" : "border-b-transparent text-gray-500"}`;
  const loginTabClass = `${tabBase} ${activeTab === "login" ? "border-b-primary text-white" : "border-b-transparent text-gray-500"}`;

  return (
    <div className="font-display bg-background-light dark:bg-background-dark">
      <div className="relative flex h-screen w-full flex-col items-center justify-center bg-black/50 p-4">
        <div className="absolute inset-0 z-[-1]">
          <img
            alt="Background"
            className="h-full w-full object-cover opacity-30"
            src="/assets/LoginAndRegister.png"
          />
        </div>
        <div className="w-full max-w-md rounded-lg bg-[#0A0A0A] p-8 shadow-2xl">
          <div className="mb-6 flex border-b border-gray-800">
            <button type="button" className={registerTabClass} onClick={() => setActiveTab("register")}>
              <p className="text-sm font-bold tracking-wider">Register</p>
            </button>
            <button type="button" className={loginTabClass} onClick={() => setActiveTab("login")}>
              <p className="text-sm font-bold tracking-wider">Login</p>
            </button>
          </div>

          {activeTab === "register" ? (
  <div className="flex flex-col gap-4">
    {step === "register" ? (
      <>
        <input placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="form-input" />
        <input placeholder="Phone Number" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="form-input" />
        <input placeholder="Email" value={registerEmail} onChange={(e) => setRegisterEmail(e.target.value)} className="form-input" />
        <input
          placeholder="Password"
          type={showRegisterPassword ? "text" : "password"}
          value={registerPassword}
          onChange={(e) => setRegisterPassword(e.target.value)}
          className="form-input"
        />
        <button onClick={() => setShowRegisterPassword((s) => !s)} className="text-sm text-gray-400">
          {showRegisterPassword ? "Hide Password" : "Show Password"}
        </button>
        <button onClick={register} disabled={registerLoading || !fullName || !registerEmail || !registerPassword || !phoneNumber} className="bg-primary text-white py-2 rounded">
          {registerLoading ? <Spinner /> : "Create Account"}
        </button>
      </>
    ) : (
      <div className="flex flex-col gap-3">
        <div className="text-center">
          <p className="text-white font-bold text-base">Xác thực mã OTP</p>
          <p className="text-gray-400 text-xs mt-1">
            Mã OTP 6 chữ số đã được gửi đến: <br />
            <span className="text-purple-400 font-semibold">{registerEmail}</span>
          </p>
        </div>

        <SixDigitOtpInput
          value={otpCode}
          onChange={setOtpCode}
          onComplete={(code) => verifyOtp(code)}
          disabled={otpLoading}
        />

        <button
          onClick={() => verifyOtp()}
          disabled={otpLoading || otpCode.length < 6}
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-3 rounded-xl disabled:opacity-50 transition shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
        >
          {otpLoading ? <Spinner /> : "Xác thực & Đăng nhập"}
        </button>

        <button onClick={() => setStep("register")} className="text-xs text-gray-400 hover:text-white text-center mt-1">
          ← Quay lại chỉnh sửa thông tin
        </button>
      </div>
    )}
    <div className="my-2 text-center text-gray-500">OR</div>
    <button onClick={googleSignIn} disabled={googleLoading} className="border border-gray-600 text-white py-2 rounded">
      {googleLoading ? <Spinner /> : "Continue with Google"}
    </button>
  </div>
) :  (
            <div className="flex flex-col gap-4">
              <input placeholder="Email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="form-input" />
              <input
                placeholder="Password"
                type={showLoginPassword ? "text" : "password"}
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="form-input"
              />
              <button onClick={() => setShowLoginPassword((s) => !s)} className="text-sm text-gray-400">
                {showLoginPassword ? "Hide Password" : "Show Password"}
              </button>
              
              {/* Forgot Password Link */}
              <button 
                onClick={() => setShowForgotPassword(true)} 
                className="text-sm text-primary hover:underline text-right"
              >
                Quên mật khẩu?
              </button>

              <button onClick={login} disabled={loginLoading || !loginEmail || !loginPassword} className="bg-primary text-white py-2 rounded disabled:opacity-50">
                {loginLoading ? <Spinner /> : "Login"}
              </button>
              
              <div className="my-2 text-center text-gray-500">OR</div>
              
              <button onClick={googleSignIn} disabled={googleLoading} className="border border-gray-600 text-white py-2 rounded">
                {googleLoading ? <Spinner /> : "Continue with Google"}
              </button>

              <div className="mt-4 pt-4 border-t border-gray-800 text-center">
                <button
                  type="button"
                  onClick={() => navigate("/my-invoices")}
                  className="text-sm text-purple-400 hover:text-purple-300 flex items-center justify-center gap-1 mx-auto"
                >
                  <span className="material-symbols-outlined text-sm">receipt_long</span>
                  Tra cứu hóa đơn qua SĐT (Không cần đăng nhập)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Forgot Password Modal */}
        {showForgotPassword && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-md rounded-lg bg-[#0A0A0A] p-8 shadow-2xl border border-gray-800">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Quên mật khẩu</h2>
                <button 
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotPasswordStep("email");
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {forgotPasswordStep === "email" && (
                <div className="flex flex-col gap-4">
                  <p className="text-gray-400 text-sm">Nhập email của bạn để nhận mã OTP</p>
                  <input 
                    placeholder="Email" 
                    type="email"
                    value={forgotPasswordEmail} 
                    onChange={(e) => setForgotPasswordEmail(e.target.value)} 
                    className="form-input bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded focus:border-primary"
                  />
                  <button 
                    onClick={sendForgotPasswordOtp} 
                    disabled={forgotPasswordLoading || !forgotPasswordEmail}
                    className="bg-primary text-white py-2 rounded disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {forgotPasswordLoading ? <Spinner /> : "Gửi OTP"}
                  </button>
                </div>
              )}

              {forgotPasswordStep === "verify-otp" && (
                <div className="flex flex-col gap-3">
                  <div className="text-center">
                    <p className="text-white font-bold text-base">Xác thực OTP Quên mật khẩu</p>
                    <p className="text-gray-400 text-xs mt-1">
                      Mã 6 chữ số đã được gửi đến: <span className="text-purple-400 font-semibold">{forgotPasswordEmail}</span>
                    </p>
                  </div>

                  <SixDigitOtpInput
                    value={forgotPasswordOtp}
                    onChange={setForgotPasswordOtp}
                    onComplete={(code) => verifyForgotPasswordOtp(code)}
                    disabled={forgotPasswordLoading}
                  />

                  <button 
                    onClick={() => verifyForgotPasswordOtp()} 
                    disabled={forgotPasswordLoading || forgotPasswordOtp.length < 6}
                    className="bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2 transition"
                  >
                    {forgotPasswordLoading ? <Spinner /> : "Xác nhận OTP"}
                  </button>
                  <button 
                    onClick={() => setForgotPasswordStep("email")}
                    className="text-xs text-gray-400 hover:text-white text-center"
                  >
                    ← Quay lại
                  </button>
                </div>
              )}

              {forgotPasswordStep === "reset-password" && (
                <div className="flex flex-col gap-4">
                  <p className="text-gray-400 text-sm">Nhập mật khẩu mới của bạn</p>
                  <input 
                    placeholder="Mật khẩu mới (tối thiểu 6 ký tự)" 
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    className="form-input bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded focus:border-primary"
                  />
                  <button 
                    onClick={() => setShowNewPassword(!showNewPassword)} 
                    className="text-sm text-gray-400 hover:text-white text-left"
                  >
                    {showNewPassword ? "🙈 Ẩn mật khẩu" : "👁️ Hiện mật khẩu"}
                  </button>
                  <button 
                    onClick={resetPassword} 
                    disabled={forgotPasswordLoading || !newPassword || newPassword.length < 6}
                    className="bg-primary text-white py-2 rounded disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {forgotPasswordLoading ? <Spinner /> : "Đặt lại mật khẩu"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Success Modal */}
      <SuccessModal 
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        message={successMessage}
        autoCloseDelay={2000}
      />
    </div>
  );
}
