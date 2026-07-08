import { createClient } from '@supabase/supabase-js';

// Reemplaza estos valores temporalmente con los de tu proyecto
// O ejecuta el script así: VITE_SUPABASE_URL=x SUPABASE_SERVICE_ROLE_KEY=y node sync_off.js
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://rtstyvtdkfedmawslkdi.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0c3R5dnRka2ZlZG1hd3Nsa2RpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDc1OTMwMywiZXhwIjoyMDk2MzM1MzAzfQ.NzgMaPLkHTFi7W9DIkMDwoP3jY26vIEvRyouTmS2_5Y';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const countries = ['ar', 'uy', 'es'];
const PAGE_SIZE = 1000;

async function syncCountry(country) {
  console.log(`\n========================================`);
  console.log(`🔄 Iniciando sincronización para ${country.toUpperCase()}...`);
  console.log(`========================================\n`);
  
  let page = 1;
  let hasMore = true;
  let totalInserted = 0;

  while (hasMore) {
    try {
      console.log(`📡 Solicitando página ${page} para ${country}...`);
      const url = `https://${country}.openfoodfacts.org/cgi/search.pl?search_simple=1&action=process&json=1&page_size=${PAGE_SIZE}&page=${page}`;
      
      const res = await fetch(url, {
        headers: { 'User-Agent': 'mipos-App-Sync - Node - Version 1.0' }
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      const products = data.products || [];
      
      if (products.length === 0) {
        console.log(`✅ No hay más productos para ${country}.`);
        hasMore = false;
        break;
      }

      // Filtramos y mapeamos solo los datos que nos interesan
      const formattedProducts = products
        .filter(p => p.code && (p.product_name || p.product_name_es)) // Asegurarnos de que tenga código y nombre
        .map(p => ({
          barcode: p.code,
          product_name: p.product_name_es || p.product_name || '',
          image_url: p.image_front_thumb_url || p.image_thumb_url || '',
          brands: p.brands || '',
          country: country
        }));

      if (formattedProducts.length > 0) {
        // Upsert ignora si ya existe el código de barras y actualiza la data
        const { error } = await supabase
          .from('off_products')
          .upsert(formattedProducts, { onConflict: 'barcode' });

        if (error) {
          console.error(`❌ Error insertando página ${page} en Supabase:`, error.message);
        } else {
          totalInserted += formattedProducts.length;
          console.log(`✅ Página ${page} guardada (${formattedProducts.length} ítems). Total parcial: ${totalInserted}`);
        }
      }

      page++;
      
      // Esperamos 1 segundo entre páginas para no saturar la API de Open Food Facts
      await new Promise(r => setTimeout(r, 1000));
      
    } catch (e) {
      console.error(`⚠️ Error en la página ${page} para ${country}:`, e.message);
      console.log(`⏳ Reintentando la siguiente página en 5 segundos...`);
      await new Promise(r => setTimeout(r, 5000));
      page++;
    }
  }
  
  console.log(`\n🎉 Finalizado ${country}. Total insertado: ${totalInserted} productos.\n`);
}

async function main() {
  if (SUPABASE_URL.includes('REEMPLAZAR')) {
    console.error('❌ Por favor, edita el archivo y reemplaza SUPABASE_URL y SUPABASE_SERVICE_KEY con tus credenciales.');
    return;
  }
  
  for (const country of countries) {
    await syncCountry(country);
  }
  
  console.log('🏁 Sincronización completa de todos los países. Ya puedes usar tu propia base de datos!');
}

main();
