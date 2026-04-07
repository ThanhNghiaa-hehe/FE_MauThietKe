# 📝 Quiz Feature Implementation Guide

## Tổng quan

Tính năng Quiz đã được triển khai đầy đủ cho cả **User** và **Admin** theo luồng:

1. **User**: Học xong tất cả lessons trong chapter → Làm quiz → Pass quiz → Unlock chapter tiếp theo
2. **Admin**: CRUD quản lý Quiz cho từng chapter của course

---

## 🎯 Luồng User (Học viên)

### 1. Điều kiện hiển thị Quiz

Quiz button sẽ hiển thị trong sidebar khi:
- ✅ Hoàn thành HẾT lessons trong chapter hiện tại
- ✅ Chapter đó có Quiz (do Admin tạo)

### 2. Trạng thái Quiz Button

**Chưa làm/chưa pass:**
```
📝 Làm Quiz để mở Chapter tiếp theo
   Bắt buộc để tiếp tục
```
- Màu vàng (bg-yellow-100)
- Có thể click để làm quiz

**Đã pass:**
```
✅ Quiz đã hoàn thành
```
- Màu xanh (bg-green-100)
- Có thể xem lại quiz

### 3. Điều kiện unlock Chapter tiếp theo

Để mở chapter tiếp theo, học viên phải:
1. ✅ Hoàn thành 100% lessons của chapter trước
2. ✅ Pass quiz của chapter trước (nếu chapter đó có quiz)

**Logic kiểm tra:**
```javascript
// Chapter đầu tiên luôn mở
// Chapter tiếp theo kiểm tra:
if (prevChapterHasQuiz) {
  canAccess = prevChapterLessonsCompleted && prevChapterQuizPassed
} else {
  canAccess = prevChapterLessonsCompleted
}
```

### 4. Làm Quiz

**Giao diện Quiz:**
- Hiển thị: Tổng câu hỏi, điểm qua, số lần làm tối đa
- Timer đếm ngược (nếu có giới hạn thời gian)
- Hỗ trợ 3 loại câu hỏi:
  - SINGLE_CHOICE: Chọn 1 đáp án
  - MULTIPLE_CHOICE: Chọn nhiều đáp án
  - TRUE_FALSE: Đúng/Sai

**Tính năng:**
- ✅ Save progress tạm (câu đã chọn)
- ✅ Cảnh báo nếu chưa trả lời hết
- ✅ Auto submit khi hết giờ
- ✅ Hiển thị kết quả chi tiết sau khi nộp

**Kết quả:**
- Điểm số, số câu đúng/tổng, thời gian làm bài
- Chi tiết từng câu: đúng/sai, giải thích
- Nút "Làm lại" nếu chưa pass (và còn lượt)
- Auto close modal sau 2s nếu pass

---

## 🔧 Luồng Admin

### 1. Truy cập Quiz Management

Từ trang Admin Courses:
```
Admin Courses → [Course] → Manage Quizzes
```

Route: `/admin/courses/:courseId/quizzes`

### 2. Tạo Quiz Mới

**Bước 1: Thông tin cơ bản**
- Chapter: Chọn chapter để gắn quiz (Required)
- Tiêu đề: Tên quiz (Required)
- Mô tả: Mô tả ngắn về quiz
- Điểm qua: % để pass (0-100), mặc định 70%
- Thời gian: Giây (null = không giới hạn)
- Số lần làm: null = không giới hạn

**Bước 2: Thêm câu hỏi**
- Click "Thêm câu hỏi"
- Nhập nội dung câu hỏi
- Chọn loại: SINGLE_CHOICE / MULTIPLE_CHOICE / TRUE_FALSE
- Thêm các đáp án (tối thiểu 2)
- Đánh dấu đáp án đúng (checkbox/radio)
- Thêm giải thích (optional, hiển thị khi user trả lời sai)

**Bước 3: Lưu**
- Validate: Chapter, Title, Questions, Correct answers
- Gửi API create quiz

### 3. Chỉnh sửa Quiz

- Click "Sửa" trên quiz card
- Load full quiz data (bao gồm correct answers)
- Chỉnh sửa và save

### 4. Xóa Quiz

- Click "Xóa" → Confirm
- Xóa vĩnh viễn quiz

---

## 📡 API Endpoints

### User APIs

```javascript
// 1. Lấy quiz (không có đáp án đúng)
GET /api/quizzes/{quizId}

// 2. Nộp bài quiz
POST /api/quizzes/submit
Body: {
  quizId: string,
  answers: [{ questionId, selectedOptions: [optionId] }],
  timeSpent: number,
  startedAt: ISO string
}

// 3. Lịch sử làm quiz
GET /api/quizzes/{quizId}/attempts

// 4. Kiểm tra đã pass chưa
GET /api/quizzes/{quizId}/passed
```

### Admin APIs

```javascript
// 1. Tạo quiz
POST /admin/quizzes/create
Body: {
  courseId, chapterId, title, description,
  passingScore, timeLimit, maxAttempts,
  questions: [...]
}

// 2. Lấy quiz (có đáp án đúng)
GET /admin/quizzes/{quizId}

// 3. Cập nhật quiz
PUT /admin/quizzes/{quizId}
Body: { ... }

// 4. Xóa quiz
DELETE /admin/quizzes/{quizId}

// 5. Lấy quizzes theo course
GET /admin/quizzes/course/{courseId}

// 6. Lấy quizzes theo chapter
GET /admin/quizzes/chapter/{chapterId}
```

---

## 💾 Data Storage

### localStorage

**Passed Quizzes:**
```javascript
Key: `passed_quizzes_{userId}_{courseId}`
Value: ["quizId1", "quizId2", ...]
```

**Video Progress:**
```javascript
Key: `progress_{userId}_{courseId}`
Value: {
  completedLessons: ["lessonId1", "lessonId2", ...]
}
```

---

## 🎨 Components

### 1. QuizTaking.jsx

Component chính cho user làm quiz.

**Props:**
- `quizId`: ID của quiz
- `onComplete`: Callback khi hoàn thành (pass/fail)
- `onClose`: Callback khi đóng modal

**State:**
- `quiz`: Quiz data
- `answers`: User answers { questionId: [optionIds] }
- `timeLeft`: Thời gian còn lại
- `result`: Kết quả sau khi submit

### 2. AdminQuizManagement.jsx

Page admin để quản lý quizzes.

**Features:**
- List all quizzes của course
- Create/Edit/Delete quiz
- Form validation
- Dynamic questions/options

### 3. CourseContent.jsx

Đã tích hợp Quiz:

**New State:**
```javascript
const [showQuiz, setShowQuiz] = useState(false);
const [currentQuiz, setCurrentQuiz] = useState(null);
const [chapterQuizzes, setChapterQuizzes] = useState({});
const [passedQuizzes, setPassedQuizzes] = useState(new Set());
```

**New Functions:**
- `isChapterLessonsCompleted()`
- `hasChapterQuiz()`
- `hasPassedChapterQuiz()`
- `loadChapterQuiz()`
- `openChapterQuiz()`
- `handleQuizComplete()`
- `canAccessNextChapter()`

**Updated Logic:**
- `canAccessLesson()`: Kiểm tra quiz requirement
- Render quiz button in sidebar
- Quiz modal overlay

---

## 🔒 Security & Validation

### Frontend

1. **Quiz Data:**
   - User API không trả về `isCorrect` của options
   - Admin API mới trả về đầy đủ

2. **Validation:**
   - Chapter required
   - Title required
   - Ít nhất 1 câu hỏi
   - Mỗi câu ít nhất 2 đáp án
   - Phải có ít nhất 1 đáp án đúng

3. **Attempt Limits:**
   - Check `maxAttempts` trước khi cho làm lại
   - Disable "Làm lại" nếu hết lượt

### Backend

1. **Authorization:**
   - Admin APIs: Require admin role
   - User APIs: Require authenticated user

2. **Business Logic:**
   - Calculate score server-side
   - Validate answers
   - Store attempt history

---

## 🚀 Testing Checklist

### User Flow

- [ ] Hoàn thành hết lessons → Quiz button hiện
- [ ] Click Quiz button → Modal mở
- [ ] Chọn đáp án → Highlight đúng
- [ ] Submit → Hiển thị kết quả
- [ ] Pass quiz → Chapter tiếp theo unlock
- [ ] Fail quiz → Có thể làm lại
- [ ] Hết lượt → Không cho làm lại
- [ ] Timer → Auto submit khi hết giờ

### Admin Flow

- [ ] Tạo quiz mới → Save thành công
- [ ] Edit quiz → Load data đúng
- [ ] Delete quiz → Xóa thành công
- [ ] Validate form → Các trường hợp lỗi
- [ ] Dynamic questions → Add/Remove
- [ ] Dynamic options → Add/Remove
- [ ] Single choice → Chỉ 1 đáp án đúng
- [ ] Multiple choice → Nhiều đáp án đúng

---

## 🐛 Troubleshooting

### Quiz không hiện trong sidebar

**Check:**
1. Tất cả lessons đã completed chưa?
2. Admin đã tạo quiz cho chapter chưa?
3. Check console: `chapterQuizzes` state

### Chapter tiếp theo không unlock

**Check:**
1. Quiz đã pass chưa?
2. Check localStorage: `passed_quizzes_{userId}_{courseId}`
3. Check `canAccessLesson()` logic

### Quiz data không load

**Check:**
1. Backend API có trả về đúng format không?
2. Check network tab: Status code, response
3. Quiz ID đúng chưa?

---

## 📝 TODO / Future Enhancements

- [ ] Backend API `/api/quizzes/chapter/{chapterId}` để load quiz nhanh hơn
- [ ] Thống kê quiz: Pass rate, average score
- [ ] Export quiz results to Excel
- [ ] Quiz question bank để tái sử dụng
- [ ] Randomize question order
- [ ] Randomize option order
- [ ] Time per question (not just total time)
- [ ] Show correct answer immediately (optional setting)

---

## 📞 Support

Nếu gặp vấn đề, check:
1. Console logs (Browser DevTools)
2. Network tab (API responses)
3. Backend logs (Server console)
4. localStorage data

**Contact:** Backend team for API issues
