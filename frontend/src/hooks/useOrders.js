import { useState, useEffect } from 'react';
import { orderAPI } from '../lib/api';

export const useOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await orderAPI.getOrders();
      setOrders(response.data);
    } catch (err) {
      setError('주문 목록을 불러오는데 실패했습니다.');
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const createOrder = async (orderData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await orderAPI.createOrder(orderData);
      setOrders(prev => [...prev, response.data]);
      return response.data;
    } catch (err) {
      setError('주문 생성에 실패했습니다.');
      console.error('Error creating order:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateOrder = async (id, orderData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await orderAPI.updateOrder(id, orderData);
      setOrders(prev => prev.map(order => 
        order.id === id ? response.data : order
      ));
      return response.data;
    } catch (err) {
      setError('주문 수정에 실패했습니다.');
      console.error('Error updating order:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteOrder = async (id) => {
    setLoading(true);
    setError(null);
    try {
      await orderAPI.deleteOrder(id);
      setOrders(prev => prev.filter(order => order.id !== id));
    } catch (err) {
      setError('주문 삭제에 실패했습니다.');
      console.error('Error deleting order:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  return {
    orders,
    loading,
    error,
    fetchOrders,
    createOrder,
    updateOrder,
    deleteOrder,
  };
}; 