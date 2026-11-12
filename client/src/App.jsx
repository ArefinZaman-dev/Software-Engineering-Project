import { Route, Routes } from 'react-router-dom';
import AppLayout from './layouts/AppLayout.jsx';
import PublicLayout from './layouts/PublicLayout.jsx';
import AboutPage from './pages/AboutPage.jsx';
import ApplyJobPage from './pages/ApplyJobPage.jsx';
import BrowseJobsPage from './pages/BrowseJobsPage.jsx';
import ConversationPage from './pages/ConversationPage.jsx';
import HomePage from './pages/HomePage.jsx';
import JobDetailsPage from './pages/JobDetailsPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import MessagesPage from './pages/MessagesPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import PublicProfilePage from './pages/PublicProfilePage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import ReviewJobPage from './pages/ReviewJobPage.jsx';
import AdminCategoriesPage from './pages/admin/AdminCategoriesPage.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import AdminJobsPage from './pages/admin/AdminJobsPage.jsx';
import AdminReportsPage from './pages/admin/AdminReportsPage.jsx';
import AdminReviewsPage from './pages/admin/AdminReviewsPage.jsx';
import AdminUsersPage from './pages/admin/AdminUsersPage.jsx';
import CreateJobPage from './pages/poster/CreateJobPage.jsx';
import EditJobPage from './pages/poster/EditJobPage.jsx';
import JobApplicantsPage from './pages/poster/JobApplicantsPage.jsx';
import MyJobsPage from './pages/poster/MyJobsPage.jsx';
import PosterDashboard from './pages/poster/PosterDashboard.jsx';
import PosterProfilePage from './pages/poster/PosterProfilePage.jsx';
import MyApplicationsPage from './pages/student/MyApplicationsPage.jsx';
import StudentDashboard from './pages/student/StudentDashboard.jsx';
import StudentProfilePage from './pages/student/StudentProfilePage.jsx';
import GuestRoute from './routes/GuestRoute.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import { ROLES } from './utils/constants.js';

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="about" element={<AboutPage />} />
        {/* Public per the project brief: anyone can browse jobs and view job details. */}
        <Route path="jobs" element={<BrowseJobsPage />} />
        <Route path="jobs/:id" element={<JobDetailsPage />} />
        <Route element={<GuestRoute />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Any logged-in user may view another person's public profile. */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="students/:id" element={<PublicProfilePage role={ROLES.STUDENT} />} />
          <Route path="posters/:id" element={<PublicProfilePage role={ROLES.POSTER} />} />
        </Route>
      </Route>

      {/* Messaging and reviews are shared by the two roles that take part in a job. */}
      <Route element={<ProtectedRoute roles={[ROLES.STUDENT, ROLES.POSTER]} />}>
        <Route element={<AppLayout />}>
          <Route path="messages" element={<MessagesPage />} />
          <Route path="messages/:id" element={<ConversationPage />} />
          <Route path="jobs/:id/review" element={<ReviewJobPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={[ROLES.STUDENT]} />}>
        <Route element={<AppLayout />}>
          <Route path="student" element={<StudentDashboard />} />
          <Route path="student/profile" element={<StudentProfilePage />} />
          <Route path="student/applications" element={<MyApplicationsPage />} />
          <Route path="jobs/:id/apply" element={<ApplyJobPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={[ROLES.POSTER]} />}>
        <Route element={<AppLayout />}>
          <Route path="poster" element={<PosterDashboard />} />
          <Route path="poster/profile" element={<PosterProfilePage />} />
          <Route path="poster/jobs" element={<MyJobsPage />} />
          <Route path="poster/jobs/new" element={<CreateJobPage />} />
          <Route path="poster/jobs/:id/edit" element={<EditJobPage />} />
          <Route path="poster/jobs/:id/applicants" element={<JobApplicantsPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={[ROLES.ADMIN]} />}>
        <Route element={<AppLayout />}>
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="admin/users" element={<AdminUsersPage />} />
          <Route path="admin/jobs" element={<AdminJobsPage />} />
          <Route path="admin/reviews" element={<AdminReviewsPage />} />
          <Route path="admin/reports" element={<AdminReportsPage />} />
          <Route path="admin/categories" element={<AdminCategoriesPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
