import { SettingsRoute, SettingsSearchResult, SettingsPermission } from '../types';

export class SettingsRegistry {
  private routes: SettingsRoute[] = [];
  private flatRoutes: Map<string, SettingsRoute> = new Map();

  constructor(routes: SettingsRoute[]) {
    this.routes = routes;
    this.buildFlatRoutes(routes);
  }

  private buildFlatRoutes(routes: SettingsRoute[], parentPath: string = ''): void {
    routes.forEach(route => {
      const fullPath = parentPath + route.path;
      this.flatRoutes.set(fullPath, { ...route, path: fullPath });

      if (route.children) {
        this.buildFlatRoutes(route.children, fullPath);
      }
    });
  }

  getRoute(path: string): SettingsRoute | undefined {
    return this.flatRoutes.get(path);
  }

  getAllRoutes(): SettingsRoute[] {
    return this.routes;
  }

  getBreadcrumbs(path: string): Array<{ label: string; path: string }> {
    const breadcrumbs: Array<{ label: string; path: string }> = [];
    const parts = path.split('/').filter(Boolean);
    let currentPath = '';

    parts.forEach(part => {
      currentPath += '/' + part;
      const route = this.flatRoutes.get(currentPath);
      if (route) {
        breadcrumbs.push({
          label: route.label,
          path: currentPath,
        });
      }
    });

    return breadcrumbs;
  }

  search(query: string, userPermissions: SettingsPermission[]): SettingsSearchResult[] {
    if (!query.trim()) return [];

    const normalizedQuery = query.toLowerCase().trim();
    const results: SettingsSearchResult[] = [];

    this.flatRoutes.forEach((route) => {
      if (route.permission && !userPermissions.includes(route.permission)) {
        return;
      }

      const searchableText = [
        route.label,
        route.description || '',
        ...(route.keywords || []),
        route.path,
      ].join(' ').toLowerCase();

      if (searchableText.includes(normalizedQuery)) {
        const score = this.calculateScore(normalizedQuery, route);
        const matchedTerms = this.getMatchedTerms(normalizedQuery, route);

        results.push({
          route,
          score,
          matchedTerms,
        });
      }
    });

    return results.sort((a, b) => b.score - a.score);
  }

  private calculateScore(query: string, route: SettingsRoute): number {
    let score = 0;
    const labelLower = route.label.toLowerCase();
    const descriptionLower = (route.description || '').toLowerCase();

    if (labelLower === query) {
      score += 100;
    } else if (labelLower.startsWith(query)) {
      score += 50;
    } else if (labelLower.includes(query)) {
      score += 25;
    }

    if (descriptionLower.includes(query)) {
      score += 10;
    }

    if (route.keywords?.some(k => k.toLowerCase().includes(query))) {
      score += 15;
    }

    return score;
  }

  private getMatchedTerms(query: string, route: SettingsRoute): string[] {
    const terms: string[] = [];
    const queryWords = query.split(/\s+/);

    queryWords.forEach(word => {
      if (route.label.toLowerCase().includes(word)) {
        terms.push(route.label);
      }
      if (route.description?.toLowerCase().includes(word)) {
        terms.push('description');
      }
      if (route.keywords?.some(k => k.toLowerCase().includes(word))) {
        terms.push('keyword');
      }
    });

    return [...new Set(terms)];
  }

  filterByPermission(
    routes: SettingsRoute[],
    userPermissions: SettingsPermission[]
  ): SettingsRoute[] {
    return routes
      .filter(route => {
        if (!route.permission) return true;
        return userPermissions.includes(route.permission);
      })
      .map(route => ({
        ...route,
        children: route.children
          ? this.filterByPermission(route.children, userPermissions)
          : undefined,
      }))
      .filter(route => !route.children || route.children.length > 0);
  }
}

export const settingsRoutes: SettingsRoute[] = [
  {
    id: 'user',
    path: '/user',
    label: 'My Account',
    tier: 'user',
    icon: 'User',
    children: [
      {
        id: 'user-profile',
        path: '/profile',
        label: 'Profile',
        description: 'Manage your personal information and avatar',
        tier: 'user',
        keywords: ['name', 'email', 'avatar', 'picture', 'display name'],
        component: 'UserProfile',
      },
      {
        id: 'user-security',
        path: '/security',
        label: 'Account Security',
        description: 'Password, two-factor authentication, and active sessions',
        tier: 'user',
        keywords: ['password', 'mfa', '2fa', 'sessions', 'login', 'authentication'],
        component: 'UserSecurity',
      },
      {
        id: 'user-notifications',
        path: '/notifications',
        label: 'Notifications',
        description: 'Control your notification preferences',
        tier: 'user',
        keywords: ['email', 'push', 'slack', 'alerts', 'mute'],
        component: 'UserNotifications',
      },
      {
        id: 'user-appearance',
        path: '/appearance',
        label: 'Appearance & Accessibility',
        description: 'Theme, language, and accessibility settings',
        tier: 'user',
        keywords: ['theme', 'dark mode', 'light mode', 'language', 'accessibility', 'font'],
        component: 'UserAppearance',
      },
      {
        id: 'user-apps',
        path: '/authorized-apps',
        label: 'Authorized Apps',
        description: 'Manage third-party applications with access to your account',
        tier: 'user',
        keywords: ['oauth', 'third party', 'connected', 'integrations'],
        component: 'UserAuthorizedApps',
      },
    ],
  },
  {
    id: 'team',
    path: '/team',
    label: 'Workspace',
    tier: 'team',
    icon: 'Users',
    permission: 'team.view',
    children: [
      {
        id: 'team-general',
        path: '/general',
        label: 'General',
        description: 'Workspace name, icon, and basic settings',
        tier: 'team',
        permission: 'team.view',
        keywords: ['workspace name', 'team name', 'icon'],
        component: 'TeamGeneral',
      },
      {
        id: 'team-members',
        path: '/members',
        label: 'Members',
        description: 'Invite and manage workspace members',
        tier: 'team',
        permission: 'team.manage',
        keywords: ['invite', 'users', 'people', 'roles'],
        component: 'TeamMembers',
      },
      {
        id: 'team-permissions',
        path: '/permissions',
        label: 'Permissions',
        description: 'Configure role permissions and access control',
        tier: 'team',
        permission: 'team.manage',
        keywords: ['roles', 'access', 'security', 'permissions matrix'],
        component: 'TeamPermissions',
      },
      {
        id: 'team-integrations',
        path: '/integrations',
        label: 'Integrations',
        description: 'Connect apps and services to this workspace',
        tier: 'team',
        permission: 'team.manage',
        keywords: ['slack', 'github', 'apps', 'connections'],
        component: 'TeamIntegrations',
      },
      {
        id: 'team-settings',
        path: '/settings',
        label: 'Settings',
        description: 'Notification preferences and workflow configuration',
        tier: 'team',
        permission: 'team.manage',
        keywords: ['notifications', 'workflow', 'defaults', 'automation'],
        component: 'TeamSettings',
      },
      {
        id: 'team-audit-logs',
        path: '/audit-logs',
        label: 'Audit Logs',
        description: 'View workspace activity and member actions',
        tier: 'team',
        permission: 'team.manage',
        keywords: ['activity', 'history', 'logs', 'compliance'],
        component: 'TeamAuditLog',
      },
    ],
  },
  {
    id: 'organization',
    path: '/organization',
    label: 'Organization',
    tier: 'organization',
    icon: 'Building2',
    permission: 'organization.manage',
    children: [
      {
        id: 'org-general',
        path: '/general',
        label: 'General',
        description: 'Organization name, logo, and company settings',
        tier: 'organization',
        permission: 'organization.manage',
        keywords: ['company', 'logo', 'branding'],
        component: 'OrganizationGeneral',
      },
      {
        id: 'org-members',
        path: '/members',
        label: 'Members & Access',
        description: 'Manage all users across the organization',
        tier: 'organization',
        permission: 'members.manage',
        keywords: ['users', 'directory', 'invite', 'deactivate'],
        component: 'OrganizationUsers',
      },
      {
        id: 'org-roles',
        path: '/roles',
        label: 'Roles & Permissions',
        description: 'Define roles and permission matrix',
        tier: 'organization',
        permission: 'members.manage',
        keywords: ['roles', 'permissions', 'access control', 'custom roles'],
        component: 'OrganizationRoles',
      },
      {
        id: 'org-security',
        path: '/security',
        label: 'Security & Authentication',
        description: 'SSO, MFA requirements, and security policies',
        tier: 'organization',
        permission: 'security.manage',
        keywords: ['sso', 'saml', 'mfa', 'password policy', 'session'],
        component: 'OrganizationSecurity',
      },
      {
        id: 'org-audit',
        path: '/audit-logs',
        label: 'Audit Logs',
        description: 'View and export organization activity logs',
        tier: 'organization',
        permission: 'audit.view',
        keywords: ['compliance', 'history', 'activity', 'export'],
        component: 'OrganizationAuditLogs',
      },
      {
        id: 'org-billing',
        path: '/billing',
        label: 'Billing & Subscription',
        description: 'Manage plan, invoices, and payment methods',
        tier: 'organization',
        permission: 'billing.manage',
        keywords: ['plan', 'invoice', 'payment', 'subscription', 'upgrade'],
        component: 'OrganizationBilling',
      },
      {
        id: 'org-integrations',
        path: '/integrations',
        label: 'Integrations & API',
        description: 'Organization-wide integrations, API keys, and webhooks',
        tier: 'organization',
        permission: 'integrations.manage',
        keywords: ['api', 'webhooks', 'marketplace', 'apps'],
        component: 'OrganizationIntegrations',
      },
    ],
  },
];

export const settingsRegistry = new SettingsRegistry(settingsRoutes);
