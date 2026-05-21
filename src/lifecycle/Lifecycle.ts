import {
  Lifecycle as AppLifecycle,
  AuthorizationGrantResult,
  CanUninstallResult,
  functions,
  getAppContext,
  LifecycleResult,
  LifecycleSettingsResult,
  logger,
  Request,
  storage,
  SubmittedFormData,
} from '@zaiusinc/app-sdk';

export class Lifecycle extends AppLifecycle {
  public async onInstall(): Promise<LifecycleResult> {
    try {
      logger.info('Installing Product Catalog app');

      // Auto-generate an API token and store it securely
      const token = crypto.randomUUID();
      await storage.secrets.put('api', { apiToken: token });

      // Build the UI URL for the settings form
      let uiUrl = '';
      try {
        uiUrl = await this.buildUiUrl();
      } catch (e: any) {
        logger.warn('Could not resolve UI URL:', e.message);
      }

      await storage.settings.put('api', {
        apiToken: token, uiUrl
      });
      logger.info('Auto-generated API token for product catalog');

      return { success: true };
    } catch (error: any) {
      logger.error('Error during installation:', error.message);
      return { success: false, retryable: true, message: `Error during installation: ${error.message}` };
    }
  }

  public async onSettingsForm(
    section: string,
    action: string,
    formData: SubmittedFormData
  ): Promise<LifecycleSettingsResult> {
    const result = new LifecycleSettingsResult();
    try {
      if (section === 'api' && action === 'refresh_ui_url') {
        const uiUrl = await this.buildUiUrl();
        const updated = { ...formData, uiUrl };
        await storage.secrets.put(section, updated);
        await storage.settings.put(section, updated);
        return result.addToast('success', 'UI URL refreshed.');
      }
      if (section === 'api') {
        await storage.secrets.put(section, formData);
        await storage.settings.put(section, formData);
      } else {
        await storage.settings.put(section, formData);
      }
      return result.addToast('success', 'Settings saved successfully.');
    } catch {
      return result.addToast(
        'danger',
        'Sorry, an unexpected error occurred. Please try again.'
      );
    }
  }

  public async onAuthorizationRequest(
    _section: string,
    _formData: SubmittedFormData
  ): Promise<LifecycleSettingsResult> {
    // No external OAuth needed - this app uses self-managed API tokens
    const result = new LifecycleSettingsResult();
    return result.addToast('info', 'This app uses API tokens configured in settings.');
  }

  public async onAuthorizationGrant(_request: Request): Promise<AuthorizationGrantResult> {
    // No external OAuth needed
    return new AuthorizationGrantResult('');
  }

  public async onUpgrade(_fromVersion: string): Promise<LifecycleResult> {
    return { success: true };
  }

  public async onFinalizeUpgrade(
    _fromVersion: string
  ): Promise<LifecycleResult> {
    try {
      const uiUrl = await this.buildUiUrl();
      const current = await storage.settings.get('api') || {};
      await storage.settings.put('api', { ...current, uiUrl });
      logger.info('Updated UI URL after upgrade');
    } catch (e: any) {
      logger.warn('Could not update UI URL on upgrade:', e.message);
    }
    return { success: true };
  }

  private async buildUiUrl(): Promise<string> {
    const trackerId = getAppContext().trackerId;
    const endpoints = await functions.getEndpoints();
    return endpoints['product_ui']
      + `?trackerId=${trackerId}`;
  }

  public async canUninstall(): Promise<CanUninstallResult> {
    return { uninstallable: true };
  }

  public async onUninstall(): Promise<LifecycleResult> {
    logger.info('Uninstalling Product Catalog app');
    return { success: true };
  }
}
