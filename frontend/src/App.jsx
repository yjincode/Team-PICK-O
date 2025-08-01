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

function App() {
  return (
    <Router>
      <Routes>
        {/* 로그인 페이지는 레이아웃 없이 */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* 나머지 페이지들은 메인 레이아웃 적용 */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={
          <MainLayout>
            <Dashboard />
          </MainLayout>
        } />
        
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
        
        {/* 404 페이지 */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App; 