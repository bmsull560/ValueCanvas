/**
 * Service Usage Examples
 * Demonstrates real-world usage patterns for all services
 */

import {
  authService,
  settingsService,
  userSettingsService,
  permissionService,
  auditLogService,
  ValidationError,
  AuthenticationError,
} from './index';

/**
 * Example 1: User Registration and Setup
 */
export async function registerUserExample() {
  try {
    // Step 1: Sign up user
    const { user, session } = await authService.signup({
      email: 'newuser@example.com',
      password: 'SecurePass123!',
      fullName: 'John Doe',
    });

    console.log('User registered:', user.id);

    // Step 2: Set initial preferences
    await userSettingsService.updatePreferences(user.id, {
      theme: 'dark',
      emailNotifications: true,
      weeklyDigest: true,
    });

    // Step 3: Log the registration
    await auditLogService.log({
      userId: user.id,
      userName: 'John Doe',
      userEmail: 'newuser@example.com',
      action: 'user.registered',
      resourceType: 'user',
      resourceId: user.id,
      status: 'success',
    });

    console.log('User setup complete');
    return { user, session };
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('Validation error:', error.message);
    } else if (error instanceof AuthenticationError) {
      console.error('Authentication error:', error.message);
    }
    throw error;
  }
}

/**
 * Example 2: User Login and Permission Check
 */
export async function loginAndCheckPermissionsExample() {
  try {
    // Login
    const { user } = await authService.login({
      email: 'user@example.com',
      password: 'password',
    });

    // Check if user can manage team
    const canManageTeam = await permissionService.hasPermission(
      user.id,
      'team.manage',
      'team',
      'team-123'
    );

    if (!canManageTeam) {
      throw new Error('User does not have team management permissions');
    }

    // Get user profile and preferences
    const [profile, preferences] = await Promise.all([
      userSettingsService.getProfile(user.id),
      userSettingsService.getPreferences(user.id),
    ]);

    console.log('User logged in:', profile.fullName);
    console.log('Theme:', preferences.theme);

    return { user, profile, preferences, canManageTeam };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}

/**
 * Example 3: Update Settings with Audit Logging
 */
export async function updateSettingsWithAuditExample(userId: string) {
  try {
    // Update multiple settings
    const updatedSettings = await settingsService.bulkUpdateSettings(
      'user',
      userId,
      {
        'notifications.email': true,
        'notifications.push': false,
        'display.compactMode': true,
        'language': 'en',
      }
    );

    // Log the change
    await auditLogService.log({
      userId,
      userName: 'John Doe',
      userEmail: 'john@example.com',
      action: 'settings.bulk_updated',
      resourceType: 'settings',
      resourceId: userId,
      details: {
        updatedCount: updatedSettings.length,
        keys: updatedSettings.map((s) => s.key),
      },
      status: 'success',
    });

    console.log('Settings updated successfully');
    return updatedSettings;
  } catch (error) {
    // Log failure
    await auditLogService.log({
      userId,
      userName: 'John Doe',
      userEmail: 'john@example.com',
      action: 'settings.bulk_updated',
      resourceType: 'settings',
      resourceId: userId,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      status: 'failed',
    });

    throw error;
  }
}

/**
 * Example 4: Protected Operation with Permission Check
 */
export async function protectedOperationExample(
  userId: string,
  teamId: string
) {
  try {
    // Check permission (throws if not authorized)
    await permissionService.requirePermission(
      userId,
      'team.manage',
      'team',
      teamId
    );

    // Perform protected operation
    console.log('User has permission, executing operation...');

    // Update team setting
    await settingsService.upsertSetting({
      key: 'team.name',
      value: 'Engineering Team',
      type: 'string',
      scope: 'team',
      scopeId: teamId,
    });

    // Log success
    await auditLogService.log({
      userId,
      userName: 'Team Admin',
      userEmail: 'admin@example.com',
      action: 'team.updated',
      resourceType: 'team',
      resourceId: teamId,
      details: { field: 'name', value: 'Engineering Team' },
      status: 'success',
    });

    console.log('Team updated successfully');
  } catch (error) {
    console.error('Operation failed:', error);
    throw error;
  }
}

/**
 * Example 5: Generate Audit Report
 */
export async function generateAuditReportExample() {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 1); // Last month

  const endDate = new Date();

  // Get statistics
  const stats = await auditLogService.getStatistics(
    startDate.toISOString(),
    endDate.toISOString()
  );

  console.log('Audit Statistics:');
  console.log('- Total Events:', stats.totalEvents);
  console.log('- Successful:', stats.successfulEvents);
  console.log('- Failed:', stats.failedEvents);
  console.log('\nTop Actions:');
  stats.topActions.forEach((action, i) => {
    console.log(`${i + 1}. ${action.action}: ${action.count}`);
  });
  console.log('\nTop Users:');
  stats.topUsers.forEach((user, i) => {
    console.log(`${i + 1}. ${user.userName}: ${user.count}`);
  });

  // Export to CSV
  const csv = await auditLogService.export({
    format: 'csv',
    query: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
  });

  console.log('\nExported CSV (first 200 chars):');
  console.log(csv.substring(0, 200));

  return { stats, csv };
}

/**
 * Example 6: Role Assignment with Validation
 */
export async function assignRoleWithValidationExample(
  adminUserId: string,
  targetUserId: string,
  roleId: string,
  teamId: string
) {
  try {
    // Verify admin has permission to assign roles
    await permissionService.requirePermission(
      adminUserId,
      'members.manage',
      'team',
      teamId
    );

    // Assign role
    await permissionService.assignRole(
      targetUserId,
      roleId,
      'team',
      teamId
    );

    // Log the action
    await auditLogService.log({
      userId: adminUserId,
      userName: 'Admin User',
      userEmail: 'admin@example.com',
      action: 'role.assigned',
      resourceType: 'user_role',
      resourceId: targetUserId,
      details: {
        roleId,
        teamId,
        targetUserId,
      },
      status: 'success',
    });

    console.log('Role assigned successfully');
  } catch (error) {
    console.error('Role assignment failed:', error);
    throw error;
  }
}

/**
 * Example 7: Batch User Preferences Update
 */
export async function batchUpdatePreferencesExample(userIds: string[]) {
  const results = await Promise.allSettled(
    userIds.map(async (userId) => {
      try {
        // Get current preferences
        const current = await userSettingsService.getPreferences(userId);

        // Update with defaults if needed
        if (!current.emailNotifications) {
          await userSettingsService.updatePreferences(userId, {
            emailNotifications: true,
            weeklyDigest: true,
          });

          console.log(`Updated preferences for user ${userId}`);
        }

        return { userId, success: true };
      } catch (error) {
        console.error(`Failed to update user ${userId}:`, error);
        return { userId, success: false, error };
      }
    })
  );

  const successful = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  console.log(`Batch update complete: ${successful} successful, ${failed} failed`);

  return results;
}

/**
 * Example 8: Session Refresh Pattern
 */
export async function sessionRefreshPatternExample() {
  try {
    // Check if session exists
    const currentSession = await authService.getSession();

    if (!currentSession) {
      console.log('No active session');
      return null;
    }

    // Check if session is expiring soon (within 5 minutes)
    const expiresAt = new Date(currentSession.expires_at || 0);
    const now = new Date();
    const minutesUntilExpiry = (expiresAt.getTime() - now.getTime()) / 60000;

    if (minutesUntilExpiry < 5) {
      console.log('Session expiring soon, refreshing...');
      const { session } = await authService.refreshSession();
      console.log('Session refreshed');
      return session;
    }

    console.log('Session still valid');
    return currentSession;
  } catch (error) {
    console.error('Session check failed:', error);
    throw error;
  }
}

/**
 * Example 9: Complex Permission Check
 */
export async function complexPermissionCheckExample(
  userId: string,
  orgId: string
) {
  // Check if user has ANY admin permission
  const isAdmin = await permissionService.hasAnyPermission(
    userId,
    ['organization.manage', 'members.manage', 'billing.manage'],
    'organization',
    orgId
  );

  if (!isAdmin) {
    console.log('User is not an admin');
    return { isAdmin: false, roles: [] };
  }

  // Get all user roles
  const roles = await permissionService.getUserRoles(
    userId,
    'organization',
    orgId
  );

  console.log(`User is admin with ${roles.length} roles`);

  return { isAdmin: true, roles };
}

/**
 * Example 10: Error Recovery Pattern
 */
export async function errorRecoveryPatternExample(userId: string) {
  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      // Attempt operation
      const profile = await userSettingsService.getProfile(userId);
      console.log('Profile retrieved:', profile.fullName);
      return profile;
    } catch (error) {
      attempt++;
      console.error(`Attempt ${attempt} failed:`, error);

      if (attempt >= maxRetries) {
        console.error('Max retries reached, giving up');
        throw error;
      }

      // Wait before retry (exponential backoff handled by BaseService)
      console.log('Retrying...');
    }
  }
}
