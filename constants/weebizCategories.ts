// Categorías WeeBiz — subcategorías las crea el usuario libremente
export interface WeeBizCategory {
  id: string;
  label: string;
  icon: string; // Ionicons name
  color: string;
}

// Las primeras 8 son las principales (visibles al inicio)
export const WEEBIZ_CATEGORIES: WeeBizCategory[] = [
  // === PRINCIPALES ===
  { id: 'servicios-profesionales', label: 'Servicios', icon: 'briefcase-outline', color: '#3B82F6' },
  { id: 'tiendas', label: 'Tiendas', icon: 'bag-outline', color: '#F59E0B' },
  { id: 'comida-restaurantes', label: 'Comida', icon: 'restaurant-outline', color: '#EF4444' },
  { id: 'belleza-estetica', label: 'Belleza', icon: 'sparkles-outline', color: '#EC4899' },
  { id: 'salud-bienestar', label: 'Salud', icon: 'heart-outline', color: '#10B981' },
  { id: 'creadores-influencers', label: 'Creadores', icon: 'videocam-outline', color: '#8B5CF6' },
  { id: 'hogar-inmobiliaria', label: 'Hogar', icon: 'home-outline', color: '#F97316' },
  { id: 'tecnologia-digital', label: 'Tecnología', icon: 'code-slash-outline', color: '#06B6D4' },
  // === EXPANDIDAS ("Ver más") ===
  { id: 'servicios-tecnicos', label: 'Servicios Técnicos', icon: 'hammer-outline', color: '#78716C' },
  { id: 'creativos-freelancers', label: 'Creativos', icon: 'color-palette-outline', color: '#D946EF' },
  { id: 'empresas-corporativo', label: 'Empresas', icon: 'business-outline', color: '#475569' },
  { id: 'automotriz', label: 'Automotriz', icon: 'car-outline', color: '#64748B' },
  { id: 'educacion', label: 'Educación', icon: 'school-outline', color: '#0EA5E9' },
  { id: 'viajes-turismo', label: 'Viajes', icon: 'airplane-outline', color: '#14B8A6' },
  { id: 'mascotas', label: 'Mascotas', icon: 'paw-outline', color: '#A16207' },
  { id: 'eventos-entretenimiento', label: 'Eventos', icon: 'musical-notes-outline', color: '#E11D48' },
  { id: 'finanzas', label: 'Finanzas', icon: 'cash-outline', color: '#059669' },
  { id: 'legal', label: 'Legal', icon: 'shield-checkmark-outline', color: '#1E40AF' },
  { id: 'espiritualidad', label: 'Espiritualidad', icon: 'leaf-outline', color: '#7C3AED' },
  { id: 'otros', label: 'Otros', icon: 'ellipsis-horizontal-outline', color: '#9CA3AF' },
];

export const WEEBIZ_MAIN_CATEGORIES = WEEBIZ_CATEGORIES.slice(0, 8);
export const WEEBIZ_EXTRA_CATEGORIES = WEEBIZ_CATEGORIES.slice(8);

export const getCategoryById = (id: string): WeeBizCategory | undefined =>
  WEEBIZ_CATEGORIES.find(c => c.id === id);
