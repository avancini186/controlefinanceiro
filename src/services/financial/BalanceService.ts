import { DataService } from '../dataService';

/**
 * BalanceService - Domain business logic for balance management and reset operations
 */
export class BalanceService {
  static async resetSeedData(): Promise<void> {
    DataService.resetLocalSeed();
  }
}
