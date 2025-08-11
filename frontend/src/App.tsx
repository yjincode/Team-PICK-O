/**
 * 메인 애플리케이션 컴포넌트
 * React Router를 사용한 라우팅 설정과 전체 애플리케이션 구조를 정의합니다
 */
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { PrivateRoute, PublicRoute } from './components/auth/PrivateRoute';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/dashboard/Dashboard';
import BusinessList from './pages/business/BusinessList';
import UnpaidList from './pages/business/UnpaidList';
import SettlementForm from './pages/business/SettlementForm';
import OrderList from './pages/orders/OrderList';
import AiLogList from './pages/orders/AiLogList';
import FishStockList from './pages/inventory/FishStockList';
import FishItemForm from './pages/inventory/FishItemForm';
import SalesList from './pages/sales/SalesList';
import SalesChart from './pages/sales/SalesChart';
import AuctionPredictionChart from './pages/sales/AuctionPredictionChart';
import LoginPage from './pages/login/LoginPage';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* 로그인 페이지는 레이아웃 없이 */}
          <Route 
            path="/login" 
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            } 
          />
        
        {/* 나머지 페이지들은 메인 레이아웃과 인증 보호 적용 */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route 
          path="/dashboard" 
          element={
            <PrivateRoute>
              <MainLayout>
                <Dashboard />
              </MainLayout>
            </PrivateRoute>
          } 
        />
        
        <Route 
          path="/business" 
          element={
            <PrivateRoute>
              <MainLayout>
                <BusinessList />
              </MainLayout>
            </PrivateRoute>
          } 
        />
        <Route 
          path="/business/unpaid" 
          element={
            <PrivateRoute>
              <MainLayout>
                <UnpaidList />
              </MainLayout>
            </PrivateRoute>
          } 
        />
        <Route 
          path="/business/settlement" 
          element={
            <PrivateRoute>
              <MainLayout>
                <SettlementForm />
              </MainLayout>
            </PrivateRoute>
          } 
        />
        
        <Route 
          path="/orders" 
          element={
            <PrivateRoute>
              <MainLayout>
                <OrderList />
              </MainLayout>
            </PrivateRoute>
          } 
        />
        <Route 
          path="/orders/ai-logs" 
          element={
            <PrivateRoute>
              <MainLayout>
                <AiLogList />
              </MainLayout>
            </PrivateRoute>
          } 
        />
        
        <Route 
          path="/inventory" 
          element={
            <PrivateRoute>
              <MainLayout>
                <FishStockList />
              </MainLayout>
            </PrivateRoute>
          } 
        />
        <Route 
          path="/inventory/fish-form" 
          element={
            <PrivateRoute>
              <MainLayout>
                <FishItemForm />
              </MainLayout>
            </PrivateRoute>
          } 
        />
        
        <Route 
          path="/sales" 
          element={
            <PrivateRoute>
              <MainLayout>
                <SalesList />
              </MainLayout>
            </PrivateRoute>
          } 
        />
        <Route 
          path="/sales/chart" 
          element={
            <PrivateRoute>
              <MainLayout>
                <SalesChart />
              </MainLayout>
            </PrivateRoute>
          } 
        />
        <Route 
          path="/sales/prediction" 
          element={
            <PrivateRoute>
              <MainLayout>
                <AuctionPredictionChart />
              </MainLayout>
            </PrivateRoute>
          } 
        />

        
        {/* 404 페이지 - 대시보드로 리다이렉트 */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App; 