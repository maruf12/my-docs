declare module 'minimark/hast' {
  export const toHast: any;
}

declare global {
  const useSiteConfig: () => any;
  const useDocusI18n: () => any;
  const useAssistant: () => any;
  const queryCollectionNavigation: (collection: any) => any;
  const queryCollection: (collection: any) => any;

  interface AppConfig {
    seo?: any;
  }
}

export {}
