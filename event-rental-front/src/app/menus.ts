export const MENUS = [
  {
    path: '/tableau-de-bord',
    title: 'Tableau de bord',
    icon: 'dashboard',
    description: 'Toute votre activité, en un coup d’œil.',
    action: 'Voir mon activité',
    theme: 'dashboard',
    number: '01',
    empty: 'Votre activité prend vie ici',
    detail:
      'Retrouvez bientôt une vue d’ensemble de vos locations, de vos disponibilités et de vos prochains événements.',
  },
  {
    path: '/locations',
    title: 'Locations',
    icon: 'calendar',
    description: 'De la réservation au dernier retour.',
    action: 'Gérer les locations',
    theme: 'rentals',
    number: '02',
    empty: 'Place aux prochains événements',
    detail:
      'Cet espace accueillera vos réservations, les dates de mise à disposition et le suivi des retours de matériel.',
  },
  {
    path: '/materiels',
    title: 'Matériels',
    icon: 'box',
    description: 'Tout pour des événements bien équipés.',
    action: 'Explorer le catalogue',
    theme: 'equipment',
    number: '03',
    empty: 'Un catalogue pour toutes les occasions',
    detail:
      'Chaises, tables, chapiteaux, couverts, chauffe-plats et bougeoirs : votre matériel et ses disponibilités seront réunis ici.',
  },
  {
    path: '/clients',
    title: 'Clients',
    icon: 'users',
    description: 'De belles relations, de beaux événements.',
    action: 'Retrouver mes clients',
    theme: 'clients',
    number: '04',
    empty: 'Chaque événement commence par une rencontre',
    detail:
      'Retrouvez bientôt les coordonnées de vos clients et l’historique de leurs locations dans un même espace.',
  },
] as const;
