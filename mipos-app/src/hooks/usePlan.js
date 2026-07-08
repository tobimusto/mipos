import { useAuth } from '../context/AuthContext';

const PLAN_FEATURES = {
  basico: {
    name: 'Plan Básico',
    maxProducts: 3500,
    maxUsers: 2,
    hasCatalog: false,
    hasBalanza: false,
    hasSmartScanner: false,
    hasLowRotationAlerts: false,
  },
  esencial: {
    name: 'Plan Esencial',
    maxProducts: 10000,
    maxUsers: 5,
    hasCatalog: true,
    hasBalanza: false,
    hasSmartScanner: false,
    hasLowRotationAlerts: false,
  },
  pro: {
    name: 'Plan Pro',
    maxProducts: 15000,
    maxUsers: 15,
    hasCatalog: true,
    hasBalanza: true,
    hasSmartScanner: true,
    hasLowRotationAlerts: true,
  }
};

export const usePlan = () => {
  const { profile } = useAuth();
  
  // Determine current plan ID (now defaults to 'esencial' for new users based on DB)
  const planId = (profile?.plan || 'esencial').toLowerCase();
  
  // Get features
  const planFeatures = PLAN_FEATURES[planId] || PLAN_FEATURES['basico'];
  
  return {
    planId,
    ...planFeatures,
    // Helper to check if a feature is available
    canAddProduct: (currentCount) => currentCount < planFeatures.maxProducts,
    canAddUser: (currentCount) => currentCount < planFeatures.maxUsers,
  };
};
