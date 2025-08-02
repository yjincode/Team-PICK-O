/**
 * 메인 애플리케이션 컴포넌트
 * React Router를 사용한 라우팅 설정과 전체 애플리케이션 구조를 정의합니다
 */
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import LoginPage from './pages/login/LoginPage';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* 로그인 페이지는 레이아웃 없이 독립적으로 렌더링 */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* 루트 경로를 대시보드로 리다이렉트 */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* 대시보드 - 메인 페이지 */}
        <Route path="/dashboard" element={
          <MainLayout>
            <Dashboard />
          </MainLayout>
        } />
        
        {/* 고객 관리 섹션 */}
        <Route path="/customers" element={
          <MainLayout>
            <CustomerList />
          </MainLayout>
        } />
        <Route path="/customers/unpaid" element={
          <MainLayout>
            <UnpaidList />
          </MainLayout>
        } />
        <Route path="/customers/settlement" element={
          <MainLayout>
            <SettlementForm />
          </MainLayout>
        } />
        
        {/* 주문 관리 섹션 */}
        <Route path="/orders" element={
          <MainLayout>
            <OrderList />
          </MainLayout>
        } />
        <Route path="/orders/ai-logs" element={
          <MainLayout>
            <AiLogList />
          </MainLayout>
        } />
        
        {/* 재고 관리 섹션 */}
        <Route path="/inventory" element={
          <MainLayout>
            <FishStockList />
          </MainLayout>
        } />
        <Route path="/inventory/fish-form" element={
          <MainLayout>
            <FishItemForm />
          </MainLayout>
        } />
        
        {/* 판매 관리 섹션 */}
        <Route path="/sales" element={
          <MainLayout>
            <SalesList />
          </MainLayout>
        } />
        <Route path="/sales/chart" element={
          <MainLayout>
            <SalesChart />
          </MainLayout>
        } />
        <Route path="/sales/prediction" element={
          <MainLayout>
            <AuctionPredictionChart />
          </MainLayout>
        } />
        
        {/* 404 페이지 - 대시보드로 리다이렉트 */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
};

export default App; 