import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getCountryConfig } from '../config/countries/index.js';
import { makeCurrencyFormatter, makeDateFormatter } from '../lib/format.js';
import { useAuth } from './AuthContext';

const CACHE_KEY = 'mipos_country_config';

const CountryContext = createContext(null);

export const CountryProvider = ({ children }) => {
  const { owner_id } = useAuth();

  const [countryName, setCountryName] = useState(() => {
    try { return localStorage.getItem(CACHE_KEY) || 'Argentina'; } catch { return 'Argentina'; }
  });

  const fetchCountry = async (ownerId) => {
    if (!ownerId) return;
    const { data, error } = await supabase
      .from('store_settings')
      .select('country')
      .eq('user_id', ownerId)
      .order('created_at', { ascending: false })
      .limit(1);
    if (error) return;
    const name = data?.[0]?.country || 'Argentina';
    setCountryName(name);
    try { localStorage.setItem(CACHE_KEY, name); } catch { /* ignore */ }
  };

  useEffect(() => { fetchCountry(owner_id); }, [owner_id]);

  const countryConfig = useMemo(() => getCountryConfig(countryName), [countryName]);

  const formatters = useMemo(() => {
    const curr = makeCurrencyFormatter(countryConfig.locale, countryConfig.currency.code);
    const dates = makeDateFormatter(countryConfig.locale);
    return { ...curr, ...dates };
  }, [countryConfig]);

  const value = useMemo(() => ({
    countryConfig,
    countryName,
    locale: countryConfig.locale,
    formatCurrency: formatters.format,
    formatCurrencyFull: formatters.formatFull,
    formatCurrencyCents: formatters.formatCents,
    formatDate: formatters.formatDate,
    formatDateShort: formatters.formatDateShort,
    formatDateTime: formatters.formatDateTime,
    formatTime: formatters.formatTime,
    refreshCountry: () => fetchCountry(owner_id),
  }), [countryConfig, countryName, formatters, owner_id]);

  return (
    <CountryContext.Provider value={value}>
      {children}
    </CountryContext.Provider>
  );
};

export const useCountry = () => {
  const ctx = useContext(CountryContext);
  if (!ctx) throw new Error('useCountry must be used within CountryProvider');
  return ctx;
};
