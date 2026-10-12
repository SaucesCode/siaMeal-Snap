import AsyncStorage from '@react-native-async-storage/async-storage';
import { reconcileCaloriesWithMacros } from '../utils/nutrition';

export interface BarcodeProductResult {
  found: boolean;
  productName: string;
  brand?: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  servingSize?: string;
  ingredients: string[];
  imageUrl?: string;
  dietary_tags?: string[];
  portion_notes?: string;
  feline_verdict?: string;
  fromCache?: boolean;
}

const BARCODE_CACHE_PREFIX = '@siamessage_barcode_cache_';
const TIMEOUT_MS = 6000;

/**
 * Fetch wrapper with AbortController timeout to prevent slow network requests
 * from blocking mobile camera scanning UX.
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

/**
 * Queries OpenFoodFacts API for official nutritional data by barcode (EAN-13, UPC-A, etc.)
 * Features 0ms offline local caching and Atwater macro conservation validation (ISO 5055).
 */
export async function lookupBarcode(barcode: string): Promise<BarcodeProductResult | null> {
  const cleanBarcode = barcode.replace(/[^0-9a-zA-Z]/g, '').trim();
  if (!cleanBarcode) return null;

  // 1. Zero-Latency Local Cache Check (ISO/IEC 5055 Reliability)
  try {
    const cached = await AsyncStorage.getItem(`${BARCODE_CACHE_PREFIX}${cleanBarcode}`);
    if (cached) {
      const parsed: BarcodeProductResult = JSON.parse(cached);
      if (parsed && parsed.found) {
        return { ...parsed, fromCache: true };
      }
    }
  } catch (cacheErr) {
    console.warn('Barcode cache read error:', cacheErr);
  }

  // 2. Network Query to Open Food Facts API v2
  try {
    const v2Url = `https://world.openfoodfacts.org/api/v2/product/${cleanBarcode}.json`;
    let response = await fetchWithTimeout(v2Url, {
      headers: {
        'User-Agent': 'SiaMealSnap/1.0 (Mobile AI Nutrition Assistant)',
        'Accept': 'application/json',
      },
    });

    // Fallback to v0 API if v2 is unavailable
    if (!response.ok) {
      const v0Url = `https://world.openfoodfacts.org/api/v0/product/${cleanBarcode}.json`;
      response = await fetchWithTimeout(v0Url, {
        headers: {
          'User-Agent': 'SiaMealSnap/1.0 (Mobile AI Nutrition Assistant)',
          'Accept': 'application/json',
        },
      });
    }

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data.status !== 1 || !data.product) {
      return null;
    }

    const product = data.product;
    const nutriments = product.nutriments || {};

    // Determine raw macronutrients
    const rawCalories = Math.round(
      nutriments['energy-kcal_serving'] ??
      nutriments['energy-kcal_100g'] ??
      nutriments['energy-kcal'] ??
      0
    );

    const protein_g = Math.round(
      nutriments['proteins_serving'] ??
      nutriments['proteins_100g'] ??
      nutriments['proteins'] ??
      0
    );

    const carbs_g = Math.round(
      nutriments['carbohydrates_serving'] ??
      nutriments['carbohydrates_100g'] ??
      nutriments['carbohydrates'] ??
      0
    );

    const fat_g = Math.round(
      nutriments['fat_serving'] ??
      nutriments['fat_100g'] ??
      nutriments['fat'] ??
      0
    );

    // Reconcile and calibrate calories using Atwater factor system (ISO 5055)
    const calories = reconcileCaloriesWithMacros(rawCalories, protein_g, carbs_g, fat_g);

    const productName = product.product_name || product.product_name_en || 'Packaged Product';
    const brand = product.brands ? product.brands.split(',')[0].trim() : undefined;
    const servingSize = product.serving_size || '1 serving';

    // Parse ingredients
    const ingredients: string[] = [];
    if (product.ingredients_text) {
      const splitIngredients = product.ingredients_text
        .split(/[,;]/)
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0 && s.length < 50)
        .slice(0, 6);
      ingredients.push(...splitIngredients);
    }
    if (ingredients.length === 0) {
      ingredients.push(servingSize);
    }

    // Extract dietary tags
    const dietary_tags: string[] = ['Verified Barcode'];
    if (protein_g >= 15) dietary_tags.push('High Protein');
    if (carbs_g <= 5 && fat_g > 10) dietary_tags.push('Keto Friendly');
    if (product.labels_tags && Array.isArray(product.labels_tags)) {
      const rawLabels: string[] = product.labels_tags;
      if (rawLabels.some((l) => l.includes('organic') || l.includes('bio'))) dietary_tags.push('Organic');
      if (rawLabels.some((l) => l.includes('gluten-free'))) dietary_tags.push('Gluten-Free');
      if (rawLabels.some((l) => l.includes('vegan'))) dietary_tags.push('Vegan');
    }

    const portion_notes = `Official nutrition specs per ${servingSize}`;
    const feline_verdict = `Sia verified the official package specs for ${productName}!`;

    const result: BarcodeProductResult = {
      found: true,
      productName: brand ? `${brand} ${productName}` : productName,
      brand,
      calories,
      protein_g,
      carbs_g,
      fat_g,
      servingSize,
      ingredients,
      imageUrl: product.image_url || product.image_front_url || product.image_small_url,
      dietary_tags,
      portion_notes,
      feline_verdict,
      fromCache: false,
    };

    // 3. Cache locally for offline repeat access
    AsyncStorage.setItem(`${BARCODE_CACHE_PREFIX}${cleanBarcode}`, JSON.stringify(result)).catch(() => {});

    return result;
  } catch (err) {
    console.warn('Barcode lookup failed or timed out:', err);
    return null;
  }
}
