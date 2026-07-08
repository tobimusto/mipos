import ar from './ar.js';
import uy from './uy.js';

const registry = {
  Argentina: ar,
  Uruguay: uy,
  AR: ar,
  UY: uy,
};

export function getCountryConfig(countryNameOrCode) {
  return registry[countryNameOrCode] ?? ar;
}

export { ar, uy };
export const SUPPORTED_COUNTRIES = [ar, uy];
