import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import UserAPI from "../api/userAPI";
import toast from "../utils/toast";

export default function UserProfile() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("profile"); // profile, change-password
  const [loading, setLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);

  // User Data
  const [user, setUser] = useState(null);
  const [fullname, setFullname] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("MALE");
  const [street, setStreet] = useState("");
  const [ward, setWard] = useState("");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");

  // Change Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const res = await UserAPI.getCurrentUser();

      if (res.data.success) {
        const userData = res.data.data;
        setUser(userData);
        setFullname(userData.fullname || "");
        setPhoneNumber(userData.phoneNumber || "");
        setDateOfBirth(userData.dateOfBirth || "");
        setGender(userData.gender || "MALE");
        setAvatarPreview(userData.avatar || "");

        // Address
        if (userData.address) {
          setStreet(userData.address.street || "");
          setWard(userData.address.ward || "");
          setDistrict(userData.address.district || "");
          setCity(userData.address.city || "");
        }
      } else {
        toast.error("Không thể tải thông tin người dùng");
        navigate("/auth");
      }
    } catch (e) {
      console.error("Error fetching user:", e);
      toast.error(e.response?.data?.message || "Phiên đăng nhập hết hạn");
      navigate("/auth");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setUpdateLoading(true);

      const formData = new FormData();

      // Create request object
      const requestData = {
        fullname,
        phoneNumber,
        dateOfBirth,
        gender,
        address: {
          street,
          ward,
          district,
          city,
        },
      };

      // Add request as JSON string
      formData.append("request", JSON.stringify(requestData));

      // Add avatar file if selected
      if (avatarFile) {
        formData.append("avatarFile", avatarFile);
      }

      const res = await UserAPI.updateUser(formData);

      if (res.data.success) {
        toast.success("Cập nhật thông tin thành công!");
        if (fullname) {
          localStorage.setItem("userFullname", fullname);
        }
        fetchUserProfile(); // Refresh data
        setAvatarFile(null); // Clear file input
      } else {
        toast.error(res.data.message || "Cập nhật thất bại");
      }
    } catch (e) {
      console.error("Update error:", e);
      toast.error(e.response?.data?.message || "Lỗi cập nhật thông tin");
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.warning("Mật khẩu mới không khớp!");
      return;
    }

    if (newPassword.length < 6) {
      toast.warning("Mật khẩu mới phải có ít nhất 6 ký tự!");
      return;
    }

    try {
      setUpdateLoading(true);

      const res = await UserAPI.changePassword({
        password: currentPassword,
        newPassword: newPassword,
      });

      if (res.data.success) {
        toast.success("Đổi mật khẩu thành công!");
        // Reset form
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast.error(res.data.message || "Đổi mật khẩu thất bại");
      }
    } catch (e) {
      console.error("Change password error:", e);
      toast.error(e.response?.data?.message || "Mật khẩu cũ không đúng!");
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirm = window.confirm(
      "⚠️ BẠN CÓ CHẮC MUỐN XÓA TÀI KHOẢN?\n\nHành động này không thể hoàn tác!"
    );

    if (!confirm) return;

    try {
      const res = await UserAPI.deleteUser(user.id);

      if (res.data.success) {
        toast.success("Xóa tài khoản thành công!");
        // Khi xóa tài khoản thì xóa hết data là hợp lý
        setTimeout(() => {
          localStorage.clear();
          navigate("/auth");
        }, 1500);
      } else {
        toast.error(res.data.message || "Xóa tài khoản thất bại");
      }
    } catch (e) {
      console.error("Delete account error:", e);
      toast.error(e.response?.data?.message || "Lỗi xóa tài khoản");
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <div className="text-white">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/home")}
            className="text-gray-400 hover:text-white mb-4"
          >
            ← Quay lại trang chủ
          </button>
          <h1 className="text-3xl font-bold">Thông tin cá nhân</h1>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700 mb-6">
          <button
            onClick={() => setActiveTab("profile")}
            className={`px-6 py-3 font-medium ${
              activeTab === "profile"
                ? "border-b-2 border-primary text-primary"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Thông tin tài khoản
          </button>
          <button
            onClick={() => setActiveTab("change-password")}
            className={`px-6 py-3 font-medium ${
              activeTab === "change-password"
                ? "border-b-2 border-primary text-primary"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Đổi mật khẩu
          </button>
        </div>

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="bg-gray-800 rounded-lg p-6">
            {/* Avatar Section */}
            <div className="flex items-center gap-6 mb-8 pb-6 border-b border-gray-700">
              <div className="relative">
                <img
                  src={avatarPreview || "/assets/default-avatar.png"}
                  alt="Avatar"
                  className="w-24 h-24 rounded-full object-cover border-2 border-primary"
                />
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 bg-primary p-2 rounded-full cursor-pointer hover:bg-primary/80"
                >
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>
              <div>
                <h2 className="text-xl font-bold">{user?.fullname}</h2>
                <p className="text-gray-400">{user?.email}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Role: <span className="text-primary">{user?.role}</span>
                </p>
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Họ và tên
                </label>
                <input
                  type="text"
                  value={fullname}
                  onChange={(e) => setFullname(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Số điện thoại
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Ngày sinh
                </label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Giới tính
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 focus:border-primary focus:outline-none"
                >
                  <option value="MALE">Nam</option>
                  <option value="FEMALE">Nữ</option>
                  <option value="OTHER">Khác</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">
                  Địa chỉ (Số nhà, đường)
                </label>
                <input
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="123 Nguyễn Văn A"
                  className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Phường/Xã
                </label>
                <input
                  type="text"
                  value={ward}
                  onChange={(e) => setWard(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Quận/Huyện
                </label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Tỉnh/Thành phố
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-700">
              <button
                onClick={handleDeleteAccount}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded text-white"
              >
                Xóa tài khoản
              </button>
              <button
                onClick={handleUpdateProfile}
                disabled={updateLoading}
                className="px-6 py-2 bg-primary hover:bg-primary/80 rounded text-white disabled:opacity-50"
              >
                {updateLoading ? "Đang cập nhật..." : "Cập nhật thông tin"}
              </button>
            </div>
          </div>
        )}

        {/* Change Password Tab */}
        {activeTab === "change-password" && (
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="max-w-md mx-auto space-y-6">
              {/* Current Password */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Mật khẩu hiện tại
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 pr-10 focus:border-primary focus:outline-none"
                  />
                  <button
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showCurrentPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Mật khẩu mới
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 pr-10 focus:border-primary focus:outline-none"
                  />
                  <button
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showNewPassword ? "🙈" : "👁️"}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Tối thiểu 6 ký tự
                </p>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Xác nhận mật khẩu mới
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 pr-10 focus:border-primary focus:outline-none"
                  />
                  <button
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showConfirmPassword ? "🙈" : "👁️"}
                  </button>
                </div>
                {newPassword && confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">
                    Mật khẩu không khớp
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                onClick={handleChangePassword}
                disabled={
                  updateLoading ||
                  !currentPassword ||
                  !newPassword ||
                  !confirmPassword ||
                  newPassword !== confirmPassword
                }
                className="w-full px-6 py-3 bg-primary hover:bg-primary/80 rounded text-white disabled:opacity-50"
              >
                {updateLoading ? "Đang đổi mật khẩu..." : "Đổi mật khẩu"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
