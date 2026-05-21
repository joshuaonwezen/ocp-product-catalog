import * as App from '@zaiusinc/app-sdk';
import { logger, storage } from '@zaiusinc/app-sdk';

export class ProductLifecycle extends App.SourceLifecycle {
  public async onSourceCreate(): Promise<App.SourceCreateResponse> {
    try {
      if (!this.config.webhookUrl) {
        return {
          success: false,
          message: 'Webhook URL is required in the source configuration',
        };
      }

      await storage.kvStore.patch('webhooks', { [this.config.dataSyncId]: this.config.webhookUrl });
      return { success: true };
    } catch (error: any) {
      logger.error(error);
      return {
        success: false,
        message: `Failed to create source: ${error.message}`,
      };
    }
  }

  public async onSourceUpdate(): Promise<App.SourceUpdateResponse> {
    return { success: true };
  }

  public async onSourceDelete(): Promise<App.SourceDeleteResponse> {
    try {
      const webhooks = await storage.kvStore.get('webhooks');
      if (!webhooks || !(this.config.dataSyncId in webhooks)) {
        return { success: true };
      }

      delete webhooks[this.config.dataSyncId];
      await storage.kvStore.put('webhooks', webhooks);
      return { success: true };
    } catch (error: any) {
      logger.error(error);
      return {
        success: false,
        message: `Failed to delete source: ${error.message}`,
      };
    }
  }

  public async onSourceEnable(): Promise<App.SourceEnableResponse> {
    return { success: true };
  }

  public async onSourcePause(): Promise<App.SourcePauseResponse> {
    return { success: true };
  }
}
