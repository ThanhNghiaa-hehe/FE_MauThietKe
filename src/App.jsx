import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./component/ProtectedRoute.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import Home from "./pages/Home.jsx";
import MyCourses from "./pages/MyCourses.jsx";
import CourseDetail from "./pages/CourseDetail.jsx";
import CourseContent from "./pages/CourseContent.jsx";
import UserProfile from "./pages/UserProfile.jsx";
import Favorites from "./pages/Favorites.jsx";
import PaymentReturn from "./pages/PaymentReturn.jsx";
import PaymentCancel from "./pages/PaymentCancel.jsx";
import MyInvoices from "./pages/MyInvoices.jsx";
import QuizPage from "./pages/QuizPage.jsx";
import QuizResult from "./pages/QuizResult.jsx";
import QuizAttempts from "./pages/QuizAttempts.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminCourses from "./pages/Admin.jsx";
import AdminCourseContent from "./pages/AdminCourseContent.jsx";
import AdminCategories from "./pages/AdminCategories.jsx";
import AdminUsers from "./pages/AdminUsers.jsx";
import AdminQuizzes from "./pages/AdminQuizzes.jsx";
import AdminCoupons from "./pages/AdminCoupons.jsx";
import AdminSupport from "./pages/AdminSupport.jsx";
import AuthModal from "./component/AuthModal.jsx";
import ChatWidget from "./component/ChatWidget.jsx";

function App() {

  return (
    <BrowserRouter>
      <ChatWidget />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthModal />} />
        <Route path="/my-invoices" element={<MyInvoices />} />
        <Route path="/lookup-invoice" element={<MyInvoices />} />
        
        {/* User Routes - Protected */}
        <Route path="/home" element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        } />
        <Route path="/my-courses" element={
          <ProtectedRoute>
            <MyCourses />
          </ProtectedRoute>
        } />
        <Route path="/course/:courseId" element={
          <ProtectedRoute>
            <CourseDetail />
          </ProtectedRoute>
        } />
        <Route path="/course/:courseId/learn" element={
          <ProtectedRoute>
            <CourseContent />
          </ProtectedRoute>
        } />
        <Route path="/course/:courseId/content" element={
          <ProtectedRoute>
            <CourseContent />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <UserProfile />
          </ProtectedRoute>
        } />
        <Route path="/favorites" element={
          <ProtectedRoute>
            <Favorites />
          </ProtectedRoute>
        } />
        
        {/* Quiz Routes */}
        <Route path="/course/:courseId/quiz/:quizId" element={
          <ProtectedRoute>
            <QuizPage />
          </ProtectedRoute>
        } />
        <Route path="/course/:courseId/quiz/:quizId/result" element={
          <ProtectedRoute>
            <QuizResult />
          </ProtectedRoute>
        } />
        <Route path="/course/:courseId/quiz/:quizId/attempts" element={
          <ProtectedRoute>
            <QuizAttempts />
          </ProtectedRoute>
        } />
        
        {/* Payment Routes - PayOS redirects here */}
        <Route path="/payment/return" element={
          <ProtectedRoute>
            <PaymentReturn />
          </ProtectedRoute>
        } />
        <Route path="/payment/cancel" element={
          <ProtectedRoute>
            <PaymentCancel />
          </ProtectedRoute>
        } />
        
        {/* Admin Routes - Protected & Require Admin Role */}
        <Route path="/admin/dashboard" element={
          <ProtectedRoute requireAdmin={true}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/courses" element={
          <ProtectedRoute requireAdmin={true}>
            <AdminCourses />
          </ProtectedRoute>
        } />
        <Route path="/admin/courses/:courseId/content" element={
          <ProtectedRoute requireAdmin={true}>
            <AdminCourseContent />
          </ProtectedRoute>
        } />
        <Route path="/admin/categories" element={
          <ProtectedRoute requireAdmin={true}>
            <AdminCategories />
          </ProtectedRoute>
        } />
        <Route path="/admin/users" element={
          <ProtectedRoute requireAdmin={true}>
            <AdminUsers />
          </ProtectedRoute>
        } />
        <Route path="/admin/quizzes" element={
          <ProtectedRoute requireAdmin={true}>
            <AdminQuizzes />
          </ProtectedRoute>
        } />
        <Route path="/admin/coupons" element={
          <ProtectedRoute requireAdmin={true}>
            <AdminCoupons />
          </ProtectedRoute>
        } />
        <Route path="/admin/support" element={
          <ProtectedRoute requireAdmin={true}>
            <AdminSupport />
          </ProtectedRoute>
        } />
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        
        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
  