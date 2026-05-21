import { SourceJob, JobStatus, logger, ValueHash } from '@zaiusinc/app-sdk';
import { ProductStore } from '../../lib/ProductStore';
import { productToSourcePayload } from '../../lib/Transformers';

export enum JobStep {
  SYNC_PRODUCTS = 'SYNC_PRODUCTS',
  DONE = 'DONE',
}

export interface ImportStatus extends JobStatus {
  state: {
    step: JobStep;
    page: number;
    retries: number;
    waitUntil: number;
  };
}

const PAGE_SIZE = 50;
const MAX_RETRIES = 3;

type HandlerMap = { [S in JobStep]: (status: ImportStatus) => Promise<void> };

export class ImportProducts extends SourceJob {
  private stepHandlers: HandlerMap = {
    [JobStep.SYNC_PRODUCTS]: this.stepSyncProducts.bind(this),
    [JobStep.DONE]: this.stepDone.bind(this),
  };

  public async prepare(_params: ValueHash, status?: JobStatus, resuming?: boolean): Promise<JobStatus> {
    if (resuming) {
      return status as ImportStatus;
    }

    return {
      state: {
        step: JobStep.SYNC_PRODUCTS,
        page: 0,
        retries: 0,
        waitUntil: 0,
      },
      complete: false,
    };
  }

  public async perform(status: ImportStatus): Promise<JobStatus> {
    const state = status.state;
    const now = Date.now();

    if (state.waitUntil > now) {
      await this.sleep(20);
      return status;
    }

    try {
      logger.debug('[ImportProducts] Sync status:', status);
      await this.stepHandlers[state.step](status);
    } catch (error) {
      logger.error('[ImportProducts] Error:', error);
      if (state.retries < MAX_RETRIES) {
        state.retries++;
        state.waitUntil = now + 1000;
      } else {
        status.complete = true;
        logger.error('[ImportProducts] Max retries reached, import failed');
      }
    }

    return status;
  }

  private async stepSyncProducts(status: ImportStatus): Promise<void> {
    const state = status.state;
    state.page++;

    const { products } = await ProductStore.list(state.page, PAGE_SIZE);

    if (products.length > 0) {
      logger.info(`[ImportProducts] Importing page ${state.page} (${products.length} products)`);
      for (const product of products) {
        await this.source.emit({ data: productToSourcePayload(product) });
      }
    } else {
      state.step = JobStep.DONE;
    }
  }

  private async stepDone(status: ImportStatus): Promise<void> {
    status.complete = true;
    logger.info('[ImportProducts] All products synced successfully');
  }
}
