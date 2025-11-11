"use client";

import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface UseSubscriptionSettingsReturn {
  pixValue: number;
  loading: boolean;
  error: string | null;
  refreshSettings: () => void;
}

export function useSubscriptionSettings(): UseSubscriptionSettingsReturn {
  const [pixValue, setPixValue] = useState<number>(99.00);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refreshSettings = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  useEffect(() => {
    if (!db) {
      setError('Firebase não está configurado');
      setLoading(false);
      return;
    }

    const settingsRef = doc(db, 'admin', 'profileSettings');

    
    // Use onSnapshot for real-time updates
    const unsubscribe = onSnapshot(
      settingsRef,
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();

          const paymentSettings = data.paymentSettings;


          
          if (paymentSettings && typeof paymentSettings.pixValue === 'number' && paymentSettings.pixValue > 0) {

            setPixValue(paymentSettings.pixValue);
          } else if (paymentSettings && paymentSettings.pixValue === 0) {

            setPixValue(99.00);
          } else {

            setPixValue(99.00);
          }
        } else {

          setPixValue(99.00);
        }
        setError(null);
        setLoading(false);
      },
      (error) => {

        setError('Erro ao carregar configurações de assinatura');
        setPixValue(99.00); // Fallback value
        setLoading(false);
      }
    );

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [refreshTrigger]);

  return {
    pixValue,
    loading,
    error,
    refreshSettings
  };
}
