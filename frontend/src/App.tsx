import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { PrivateRoute, PublicRoute } from './components/auth/PrivateRoute';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/dashboard/Dashboard';
import CustomerList from './pages/customers/CustomerList';
import UnpaidList from './pages/customers/UnpaidList';
import SettlementForm from './pages/customers/SettlementForm';
import OrderList from './pages/orders/OrderList';
import AiLogList from './pages/orders/AiLogList';
import FishStockList from './pages/inventory/FishStockList';
import FishItemForm from './pages/inventory/FishItemForm';
import SalesList from './pages/sales/SalesList';
import SalesChart from './pages/sales/SalesChart';
import AuctionPredictionChart from './pages/sales/AuctionPredictionChart';
import LoginPage from './pages/login/LoginPage.tsx';

function App(): JSX.Element {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* 공개 라우트 - 로그인 페이지 */}
          <Route 
            path="/login" 
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            } 
          />
          
          {/* 보호된 라우트들 - 인증 및 승인 필요 */}
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
          
          {/* 고객 관리 */}
          <Route 
            path="/customers" 
            element={
              <PrivateRoute>
                <MainLayout>
                  <CustomerList />
                </MainLayout>
              </PrivateRoute>
            } 
          />
          <Route 
            path="/customers/unpaid" 
            element={
              <PrivateRoute>
                <MainLayout>
                  <UnpaidList />
                </MainLayout>
              </PrivateRoute>
            } 
          />
          <Route 
            path="/customers/settlement" 
            element={
              <PrivateRoute>
                <MainLayout>
                  <SettlementForm />
                </MainLayout>
              </PrivateRoute>
            } 
          />
          
          {/* 주문 관리 */}
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
          
          {/* 재고 관리 */}
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
          
          {/* 매출 관리 */}
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
          
          {/* 404 페이지 - 인증된 사용자는 대시보드로, 미인증 사용자는 로그인으로 */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;