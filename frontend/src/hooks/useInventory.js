import { useState, useEffect } from 'react';
import { inventoryAPI } from '../lib/api';

export const useInventory = () => {
  const [fishItems, setFishItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchFishStock = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await inventoryAPI.getFishStock();
      setFishItems(response.data);
    } catch (err) {
      setError('재고 목록을 불러오는데 실패했습니다.');
      console.error('Error fetching fish stock:', err);
    } finally {
      setLoading(false);
    }
  };

  const createFishItem = async (fishData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await inventoryAPI.createFishItem(fishData);
      setFishItems(prev => [...prev, response.data]);
      return response.data;
    } catch (err) {
      setError('어종 정보 생성에 실패했습니다.');
      console.error('Error creating fish item:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateFishItem = async (id, fishData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await inventoryAPI.updateFishItem(id, fishData);
      setFishItems(prev => prev.map(item => 
        item.id === id ? response.data : item
      ));
      return response.data;
    } catch (err) {
      setError('어종 정보 수정에 실패했습니다.');
      console.error('Error updating fish item:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteFishItem = async (id) => {
    setLoading(true);
    setError(null);
    try {
      await inventoryAPI.deleteFishItem(id);
      setFishItems(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      setError('어종 정보 삭제에 실패했습니다.');
      console.error('Error deleting fish item:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFishStock();
  }, []);

  return {
    fishItems,
    loading,
    error,
    fetchFishStock,
    createFishItem,
    updateFishItem,
    deleteFishItem,
  };
}; 