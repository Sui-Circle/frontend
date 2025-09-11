// Simple router utility for handling URL paths without external dependencies

export type AppRoute = 'landing' | 'auth' | 'dashboard' | 'transfer' | 'success' | 'voicedemo' | 'voicetest' | 'sharedfile' | 'allowlist';

export class SimpleRouter {
  private static instance: SimpleRouter;
  private currentRoute: AppRoute = 'landing';
  private listeners: ((route: AppRoute, params?: any) => void)[] = [];

  static getInstance(): SimpleRouter {
    if (!SimpleRouter.instance) {
      SimpleRouter.instance = new SimpleRouter();
    }
    return SimpleRouter.instance;
  }

  constructor() {
    // Listen for browser back/forward navigation
    window.addEventListener('popstate', this.handlePopState.bind(this));
    
    // Initialize route from current URL
    this.initializeFromURL();
  }

  private initializeFromURL() {
    const path = window.location.pathname;
    const route = this.pathToRoute(path);
    this.currentRoute = route;
  }

  private pathToRoute(path: string): AppRoute {
    if (path.startsWith('/share/')) return 'sharedfile';
    if (path.startsWith('/allowlist/')) return 'allowlist';
    if (path === '/dashboard') return 'dashboard';
    if (path === '/auth') return 'auth';
    if (path === '/transfer') return 'transfer';
    if (path === '/voice-demo') return 'voicedemo';
    if (path === '/voice-test') return 'voicetest';
    if (path === '/success') return 'success';
    return 'landing';
  }

  private routeToPath(route: AppRoute, params?: any): string {
    switch (route) {
      case 'dashboard': return '/dashboard';
      case 'auth': return '/auth';
      case 'transfer': return '/transfer';
      case 'voicedemo': return '/voice-demo';
      case 'voicetest': return '/voice-test';
      case 'success': return '/success';
      case 'sharedfile': return params?.shareId ? `/share/${params.shareId}` : '/';
      case 'allowlist': return params?.allowlistId ? `/allowlist/${params.allowlistId}` : '/';
      case 'landing':
      default:
        return '/';
    }
  }

  private handlePopState() {
    const path = window.location.pathname;
    const route = this.pathToRoute(path);
    this.currentRoute = route;
    this.notifyListeners(route);
  }

  private notifyListeners(route: AppRoute, params?: any) {
    this.listeners.forEach(listener => listener(route, params));
  }

  public navigate(route: AppRoute, params?: any) {
    this.currentRoute = route;
    const path = this.routeToPath(route, params);
    
    // Update browser URL without page reload
    window.history.pushState({ route, params }, '', path);
    
    // Notify listeners
    this.notifyListeners(route, params);
  }

  public replace(route: AppRoute, params?: any) {
    this.currentRoute = route;
    const path = this.routeToPath(route, params);
    
    // Replace current URL without adding to history
    window.history.replaceState({ route, params }, '', path);
    
    // Notify listeners
    this.notifyListeners(route, params);
  }

  public getCurrentRoute(): AppRoute {
    return this.currentRoute;
  }

  public onRouteChange(listener: (route: AppRoute, params?: any) => void) {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  public getShareIdFromPath(): string | null {
    const path = window.location.pathname;
    const shareMatch = path.match(/^\/share\/(.+)$/);
    return shareMatch ? shareMatch[1] : null;
  }

  public getAllowlistIdFromPath(): string | null {
    const path = window.location.pathname;
    const allowlistMatch = path.match(/^\/allowlist\/(.+)$/);
    return allowlistMatch ? allowlistMatch[1] : null;
  }
}
