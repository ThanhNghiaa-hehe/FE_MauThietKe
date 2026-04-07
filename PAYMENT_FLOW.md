# 💳 Luồng Thanh Toán PayOS - Course Platform

## 📋 Tổng quan
Hệ thống thanh toán tích hợp PayOS cho phép người dùng **thanh toán trực tiếp** khi xem chi tiết khóa học. Sau khi thanh toán thành công, khóa học tự động được thêm vào My Courses.

**Luồng đơn giản:** 
```
Xem khóa học → Thanh toán ngay → Học luôn
```

**❌ Không có giỏ hàng** - User thanh toán từng khóa học một cách nhanh chóng.

---

## 🔄 Luồng hoạt động

### 1️⃣ **Người dùng xem khóa học**
- Vào trang `/course/:courseId`
- Xem thông tin chi tiết khóa học (title, price, duration, chapters, lessons)
- Kiểm tra trạng thái: Đã mua chưa?

### 2️⃣ **Click "Thanh toán ngay"**
**File:** `CourseDetail.jsx`

```javascript
const handlePayment = async () => {
  // 1. Tạo orderInfo
  const orderInfo = `Thanh toan khoa hoc ${course?.title}`;
  
  // 2. Gọi API tạo thanh toán PayOS
  const response = await PaymentAPI.createPayOSPayment({
    courseIds: [courseId],
    orderInfo
  });

  // 3. Lưu paymentId để trang return có thể poll status
  localStorage.setItem('pendingPaymentId', response.data.data.paymentId);

  // 4. Redirect sang PayOS
  window.location.href = response.data.data.paymentUrl;
}
```

### 3️⃣ **Backend tạo Payment URL**
**API:** `POST /api/payment/payos/create`

**Request Body:**
```json
{
  "courseIds": ["abc123"],
  "orderInfo": "Thanh toan khoa hoc Java Spring Boot"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "paymentUrl": "https://pay.payos.vn/web/....",
    "paymentId": "PAYMENT_123456",
    "amount": 1800000
  }
}
```

### 4️⃣ **User thanh toán tại PayOS**
- User thực hiện thanh toán trên trang PayOS
- PayOS xử lý giao dịch

### 5️⃣ **PayOS redirect về Frontend + Webhook về Backend**

- **PayOS redirect về FE**: `/payment/return` hoặc `/payment/cancel` (tuỳ thành công/hủy)
- **PayOS gọi webhook về BE** (server-to-server) để xác nhận thanh toán

**File FE:** `PaymentReturn.jsx` (poll trạng thái)

```javascript
// FE không tự gọi webhook.
// FE chỉ poll status bằng paymentId đã lưu lúc tạo payment.
await PaymentAPI.getPaymentStatus(paymentId)
```

### 6️⃣ **Backend xử lý Enrollment (sau webhook PayOS)**

Backend sẽ cập nhật `PaymentStatus.SUCCESS` khi webhook hợp lệ, sau đó tự enroll các khoá học đã mua.

### 7️⃣ **User học khóa học**
- Vào `/my-courses` → thấy khóa học vừa mua
- Click "Tiếp tục học" → chuyển sang `/course/:courseId/learn`
- Xem video, làm quiz, track progress

---

## 📁 Cấu trúc File

```
src/
├── api/
│   ├── paymentAPI.jsx          ✅ NEW - API thanh toán
│   └── progressAPI.jsx         ✅ Đã có - API enrollment & progress
│
├── pages/
│   ├── CourseDetail.jsx        ✅ UPDATED - Thêm handlePayment()
│   ├── PaymentReturn.jsx       ✅ NEW - Xử lý return từ PayOS + poll status
│   ├── PaymentCancel.jsx       ✅ NEW - Trang hủy thanh toán
│   └── MyCourses.jsx           ✅ Đã có - Hiển thị khóa học đã mua
│
└── App.jsx                     ✅ UPDATED - Thêm route /payment/return + /payment/cancel
```

---

## 🧪 Test Flow

### Test thanh toán thành công:
```
1. Login vào tài khoản user
2. Vào /course/:courseId
3. Click "Thanh toán ngay"
4. Thanh toán trên PayOS
5. Được redirect về /payment/return
6. FE poll `GET /api/payment/{paymentId}/status`
7. Hiện "Thanh toán thành công"
8. Vào /my-courses và thấy khóa học vừa mua
```

### Test thanh toán thất bại:
```
1-3. Giống trên
4. Tại PayOS, hủy thanh toán
5. Được redirect về /payment/cancel
6. Hiện "Bạn đã hủy thanh toán"
```

---

## ⚙️ Cấu hình Backend (Lưu ý cho Dev Backend)

Backend cần cấu hình PayOS (keys + return/cancel/webhook URLs) và các endpoint:

- `POST /api/payment/payos/create` - Tạo payment URL
- `POST /api/payment/payos/webhook` - PayOS gọi vào backend
- `GET /api/payment/:paymentId/status` - FE poll trạng thái (optional)

---

## 🎯 Checklist hoàn thành

- [x] Tạo `paymentAPI.jsx`
- [x] Tạo `PaymentReturn.jsx`
- [x] Tạo `PaymentCancel.jsx`
- [x] Update `CourseDetail.jsx` - thêm `handlePayment()`
- [x] Update `App.jsx` - thêm route `/payment/return` + `/payment/cancel`
- [x] Update button text: "Đăng ký ngay" → "Thanh toán ngay"
- [x] Poll status sau return (optional)
- [x] Auto enroll sau thanh toán thành công (backend qua webhook)
- [x] Redirect đến My Courses
- [x] Toast notifications

---

## 🚀 Luồng hoàn chỉnh (Summary)

```
[User] → View Course Detail
   ↓
[Click] "Thanh toán ngay"
   ↓
[Frontend] Call PaymentAPI.createPayOSPayment()
  ↓
[Backend] Generate PayOS payment URL
  ↓
[Redirect] User → PayOS Website
  ↓
[PayOS] Process payment
  ↓
[Redirect] PayOS → /payment/return hoặc /payment/cancel
  ↓
[Webhook] PayOS → Backend /api/payment/payos/webhook
  ↓
[Frontend] Poll /api/payment/{paymentId}/status (optional)
  ↓
[Frontend] PaymentReturn.jsx xử lý:
  - Đọc `pendingPaymentId` từ localStorage hoặc query params
  - Poll `GET /api/payment/{paymentId}/status` vài giây
  - Nếu SUCCESS: toast + điều hướng `/my-courses`
  - Nếu FAILED/CANCELLED: hiển thị thông báo tương ứng
```

---

## 📝 Notes

1. **Webhook là nguồn sự thật:** Enrollment nên được backend thực hiện sau webhook PayOS hợp lệ.
2. **Poll status (optional):** Webhook có thể đến chậm → FE poll status vài giây để cập nhật UI.
3. **pendingPaymentId:** Lưu `paymentId` lúc tạo payment để trang `/payment/return` có thể xác nhận.
4. **Toast notifications:** Thông báo rõ ràng cho user.

---

✅ **Hệ thống thanh toán đã hoàn chỉnh và sẵn sàng sử dụng!**
