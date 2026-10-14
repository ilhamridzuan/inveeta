import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DashboardOverviewPage } from '@/pages/dashboard/DashboardOverviewPage';
import { WizardPage } from '@/pages/wizard/WizardPage';
import { GuestListPage } from '@/features/guests';
import { WishesModerationPage } from '@/features/wishes';
import { EventAnalyticsPage } from '@/features/analytics';

export const App: React.FC = () => {
  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected Host Dashboard Routes */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardOverviewPage />} />
        <Route path="/wizard" element={<WizardPage />} />
        <Route path="/guests" element={<GuestListPage />} />
        <Route path="/events/:eventId/guests" element={<GuestListPage />} />
        <Route path="/wishes" element={<WishesModerationPage />} />
        <Route path="/events/:eventId/wishes" element={<WishesModerationPage />} />
        <Route path="/analytics" element={<EventAnalyticsPage />} />
        <Route path="/events/:eventId/analytics" element={<EventAnalyticsPage />} />
      </Route>

      {/* Fallback Root Navigation */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default App;
