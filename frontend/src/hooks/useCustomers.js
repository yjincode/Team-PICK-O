import { useState, useEffect } from 'react';
import { customerAPI } from '../lib/api';

export const useCustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCustomers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await customerAPI.getCustomers();
      setCustomers(response.data);
    } catch (err) {
      setError('고객 목록을 불러오는데 실패했습니다.');
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const createCustomer = async (customerData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await customerAPI.createCustomer(customerData);
      setCustomers(prev => [...prev, response.data]);
      return response.data;
    } catch (err) {
      setError('고객 생성에 실패했습니다.');
      console.error('Error creating customer:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateCustomer = async (id, customerData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await customerAPI.updateCustomer(id, customerData);
      setCustomers(prev => prev.map(customer => 
        customer.id === id ? response.data : customer
      ));
      return response.data;
    } catch (err) {
      setError('고객 수정에 실패했습니다.');
      console.error('Error updating customer:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteCustomer = async (id) => {
    setLoading(true);
    setError(null);
    try {
      await customerAPI.deleteCustomer(id);
      setCustomers(prev => prev.filter(customer => customer.id !== id));
    } catch (err) {
      setError('고객 삭제에 실패했습니다.');
      console.error('Error deleting customer:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  return {
    customers,
    loading,
    error,
    fetchCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
  };
};

export const useUnpaidOrders = () => {
  const [unpaidOrders, setUnpaidOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchUnpaidOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await customerAPI.getUnpaidList();
      setUnpaidOrders(response.data);
    } catch (err) {
      setError('미수금 목록을 불러오는데 실패했습니다.');
      console.error('Error fetching unpaid orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnpaidOrders();
  }, []);

  return {
    unpaidOrders,
    loading,
    error,
    fetchUnpaidOrders,
  };
}; 