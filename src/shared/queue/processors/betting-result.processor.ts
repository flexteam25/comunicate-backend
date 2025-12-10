import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../../../domains/game/entities/transaction.entity';
import { PowerballRoundInfo } from '../../../domains/game/entities/powerball-round-info.entity';
import { Powerball3RoundInfo } from '../../../domains/game/entities/powerball3-round-info.entity';
import { Powerball5RoundInfo } from '../../../domains/game/entities/powerball5-round-info.entity';
import { PowerladderRoundInfo } from '../../../domains/game/entities/powerladder-round-info.entity';
import { Powerladder3RoundInfo } from '../../../domains/game/entities/powerladder3-round-info.entity';
import { Powerladder5RoundInfo } from '../../../domains/game/entities/powerladder5-round-info.entity';
import { Rball56RoundInfo } from '../../../domains/game/entities/rball56-round-info.entity';
import { Runningball54RoundInfo } from '../../../domains/game/entities/runningball54-round-info.entity';
import { Runningball3RoundInfo } from '../../../domains/game/entities/runningball3-round-info.entity';
import { Space8RoundInfo } from '../../../domains/game/entities/space8-round-info.entity';
import { HoldemRoundInfo } from '../../../domains/game/entities/holdem-round-info.entity';
import { Partner } from '../../../domains/game/entities/partner.entity';
import { User } from '../../../domains/game/entities/user.entity';
import { TransactionLog } from '../../../domains/game/entities/transaction-log.entity';
import { TRANSACTION_LOG_TYPES } from '../../constants/transaction-log-type.const';
import { SocketService } from '../../socket/socket.service';
import { LoggerService } from '../../logger/logger.service';
import { RedisService } from '../../redis/redis.service';
import { MinigameRoundService } from '../../../domains/game/services/minigame-round.service';

/**
 * Processor for handling betting result calculations
 */
@Processor('betting-result')
export class BettingResultProcessor extends WorkerHost {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(PowerballRoundInfo)
    private readonly powerballRoundRepository: Repository<PowerballRoundInfo>,
    @InjectRepository(Powerball3RoundInfo)
    private readonly powerball3RoundRepository: Repository<Powerball3RoundInfo>,
    @InjectRepository(Powerball5RoundInfo)
    private readonly powerball5RoundRepository: Repository<Powerball5RoundInfo>,
    @InjectRepository(PowerladderRoundInfo)
    private readonly powerladderRoundRepository: Repository<PowerladderRoundInfo>,
    @InjectRepository(Powerladder3RoundInfo)
    private readonly powerladder3RoundRepository: Repository<Powerladder3RoundInfo>,
    @InjectRepository(Powerladder5RoundInfo)
    private readonly powerladder5RoundRepository: Repository<Powerladder5RoundInfo>,
    @InjectRepository(Rball56RoundInfo)
    private readonly rball56RoundRepository: Repository<Rball56RoundInfo>,
    @InjectRepository(Runningball54RoundInfo)
    private readonly runningball54RoundRepository: Repository<Runningball54RoundInfo>,
    @InjectRepository(Runningball3RoundInfo)
    private readonly runningball3RoundRepository: Repository<Runningball3RoundInfo>,
    @InjectRepository(Space8RoundInfo)
    private readonly space8RoundRepository: Repository<Space8RoundInfo>,
    @InjectRepository(HoldemRoundInfo)
    private readonly holdemRoundRepository: Repository<HoldemRoundInfo>,
    @InjectRepository(Partner)
    private readonly partnerRepository: Repository<Partner>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly socketService: SocketService,
    private readonly logger: LoggerService,
    private readonly redisService: RedisService,
    private readonly minigameRoundService: MinigameRoundService,
  ) {
    super();
  }

  /**
   * Process betting results for a specific game
   */
  async process(job: Job<{ game: string; roundDay: string }>) {
    const { game, roundDay } = job.data;

    try {
      if (roundDay === 'scan_all') {
        // Scan all pending bets for this game
        await this.scanAllPendingBets(game);
      } else {
        // Process specific round only
        await this.processSpecificRound(game, roundDay);
      }
    } catch (error) {
      this.logger.error(
        'Error processing betting results',
        {
          error: error.message,
          game,
          roundDay,
        },
        'BettingResultProcessor',
      );
      throw error;
    }
  }

  /**
   * Process a specific round
   */
  private async processSpecificRound(
    game: string,
    roundDay: string,
  ): Promise<void> {
    // 1. Get pending transactions for this specific round
    const pendingTransactions = await this.transactionRepository.find({
      where: {
        game,
        round_day: roundDay,
        status: 'pending',
      },
      relations: ['user'],
    });

    if (pendingTransactions.length === 0) {
      return;
    }

    // 2. Process transactions for this round
    await this.processRoundTransactions(roundDay, pendingTransactions, game);
  }

  /**
   * Scan all pending bets and process them
   */
  private async scanAllPendingBets(game: string): Promise<void> {
    // 1. Get all pending transactions for this game
    const pendingTransactions = await this.transactionRepository.find({
      where: {
        game,
        status: 'pending',
      },
      relations: ['user'],
    });

    if (pendingTransactions.length === 0) {
      return;
    }

    // 2. Group by round_day
    const transactionsByRound =
      this.groupTransactionsByRound(pendingTransactions);

    // 3. Process each round
    for (const [roundDay, transactions] of transactionsByRound) {
      await this.processRoundTransactions(roundDay, transactions, game);
    }
  }

  /**
   * Process transactions for a specific round
   */
  private async processRoundTransactions(
    roundDay: string,
    transactions: Transaction[],
    game: string,
  ): Promise<void> {
    // 1. Get round results
    const roundResults = await this.getRoundResults(roundDay, game);

    if (!roundResults) {
      this.logger.warn(
        'Round results not found, checking if round has ended',
        {
          roundDay,
          transactionIds: transactions.map((t) => t.id),
        },
        'BettingResultProcessor',
      );

      // Check if round has actually ended before processing refunds
      const hasRoundEnded = await this.checkIfRoundHasEnded(roundDay, game);

      if (hasRoundEnded) {
        // Check for refunds when round has ended but no results found
        await this.checkAndProcessRefunds(transactions, game);
      }
      return;
    }

    // 2. Group transactions by user_id for batch processing
    const transactionsByUser = this.groupTransactionsByUser(transactions);

    // 3. Process each user's transactions
    for (const [userId, userTransactions] of transactionsByUser) {
      await this.processUserTransactions(
        userId,
        userTransactions,
        roundResults,
        game,
      );
    }
  }

  /**
   * Get round results by using roundDay directly
   */
  private async getRoundResults(roundDay: string, game: string) {
    // Get round results from database
    // Find round results using roundDay directly (e.g., "20251015_046")
    // IMPORTANT: Each game has its own round_info table, must use correct repository
    // NO FALLBACK DEFAULT - if game doesn't match, return null
    let roundResults = null;
    
    if (game === 'named_powerball') {
      roundResults = await this.powerballRoundRepository.findOne({
        where: {
          round: roundDay, // Use roundDay directly as it matches the database format
        },
      });
    } else if (game === 'named_powerball3') {
      roundResults = await this.powerball3RoundRepository.findOne({
        where: {
          round: roundDay, // Use roundDay directly as it matches the database format
        },
      });
    } else if (game === 'named_powerball5') {
      roundResults = await this.powerball5RoundRepository.findOne({
        where: {
          round: roundDay, // Use roundDay directly as it matches the database format
        },
      });
    } else if (game === 'named_powerladder') {
      roundResults = await this.powerladderRoundRepository.findOne({
        where: {
          round: roundDay, // Use roundDay directly as it matches the database format
        },
      });
    } else if (game === 'named_powerladder3') {
      roundResults = await this.powerladder3RoundRepository.findOne({
        where: {
          round: roundDay, // Use roundDay directly as it matches the database format
        },
      });
    } else if (game === 'named_powerladder5') {
      roundResults = await this.powerladder5RoundRepository.findOne({
        where: {
          round: roundDay, // Use roundDay directly as it matches the database format
        },
      });
    } else if (game === 'named_rball_56') {
      roundResults = await this.rball56RoundRepository.findOne({
        where: {
          round: roundDay, // Use roundDay directly as it matches the database format
        },
      });
    } else if (game === 'named_runningball5_4') {
      roundResults = await this.runningball54RoundRepository.findOne({
        where: {
          round: roundDay, // Use roundDay directly as it matches the database format
        },
      });
    } else if (game === 'named_runningball3') {
      roundResults = await this.runningball3RoundRepository.findOne({
        where: {
          round: roundDay,
        },
      });
    } else if (game === 'named_space8') {
      roundResults = await this.space8RoundRepository.findOne({
        where: {
          round: roundDay,
        },
      });
    } else if (game === 'named_holdem') {
      roundResults = await this.holdemRoundRepository.findOne({
        where: {
          round: roundDay,
        },
      });
    }
    // No else block - if game doesn't match, roundResults stays null
    

    if (!roundResults) {
      return null;
    }

    // Check if round has valid results based on game type
    let hasValidResults = false;
    
    if (game === 'named_powerladder' || game === 'named_powerladder3' || game === 'named_powerladder5') {
      // For ladder games, check data1, data2, data3
      const ladderResults = roundResults as PowerladderRoundInfo | Powerladder3RoundInfo | Powerladder5RoundInfo;
      hasValidResults =
        ladderResults.data1 &&
        (ladderResults.data1 === 'res_odd' || ladderResults.data1 === 'res_even') &&
        ladderResults.data2 &&
        (ladderResults.data2 === 'line3' || ladderResults.data2 === 'line4') &&
        ladderResults.data3 &&
        (ladderResults.data3 === 'left' || ladderResults.data3 === 'right');
    } else if (game === 'named_rball_56') {
      // For rball56 games, check balldata1-6 and data1-4
      const rballResults = roundResults as Rball56RoundInfo;
      hasValidResults = !!(
        rballResults.balldata1 &&
        rballResults.balldata2 &&
        rballResults.balldata3 &&
        rballResults.balldata4 &&
        rballResults.balldata5 &&
        rballResults.balldata6 &&
        rballResults.data1 &&
        rballResults.data2 &&
        rballResults.data3 &&
        rballResults.data4
      );
    } else if (game === 'named_runningball5_4') {
      // For runningball54 games, check balldata1-4 and data1-4
      const runningballResults = roundResults as Runningball54RoundInfo;
      hasValidResults = !!(
        runningballResults.balldata1 &&
        runningballResults.balldata2 &&
        runningballResults.balldata3 &&
        runningballResults.balldata4 &&
        runningballResults.data1 &&
        runningballResults.data2 &&
        runningballResults.data3 &&
        runningballResults.data4
      );
    } else if (game === 'named_runningball3') {
      // For runningball3 games, check balldata1-2 and data1
      const runningball3Results = roundResults as Runningball3RoundInfo;
      hasValidResults = !!(
        runningball3Results.balldata1 &&
        runningball3Results.balldata2 &&
        runningball3Results.data1
      );
    } else if (game === 'named_space8') {
      // For space8 games, check balldata1-2 and data1-8
      const space8Results = roundResults as Space8RoundInfo;
      hasValidResults = !!(
        space8Results.balldata1 &&
        space8Results.balldata2 &&
        space8Results.data1 &&
        space8Results.data2 &&
        space8Results.data3 &&
        space8Results.data4 &&
        space8Results.data5 &&
        space8Results.data6 &&
        space8Results.data7 &&
        space8Results.data8
      );
    } else if (game === 'named_holdem') {
      // For holdem games, check data1 and data2
      const holdemResults = roundResults as HoldemRoundInfo;
      hasValidResults = !!(
        holdemResults.data1 &&
        holdemResults.data2
      );
    } else {
      // For powerball games, check balldata1-6
      const powerballResults = roundResults as PowerballRoundInfo | Powerball3RoundInfo | Powerball5RoundInfo;
      hasValidResults =
        powerballResults.balldata1 &&
        powerballResults.balldata1 !== 'd' &&
        powerballResults.balldata2 &&
        powerballResults.balldata2 !== 'd' &&
        powerballResults.balldata3 &&
        powerballResults.balldata3 !== 'd' &&
        powerballResults.balldata4 &&
        powerballResults.balldata4 !== 'd' &&
        powerballResults.balldata5 &&
        powerballResults.balldata5 !== 'd' &&
        powerballResults.balldata6 &&
        powerballResults.balldata6 !== 'p';
    }

    if (!hasValidResults) {
      return null;
    }

    return roundResults;
  }

  /**
   * Group transactions by round_day
   */
  private groupTransactionsByRound(
    transactions: Transaction[],
  ): Map<string, Transaction[]> {
    const grouped = new Map<string, Transaction[]>();

    for (const transaction of transactions) {
      if (!grouped.has(transaction.round_day)) {
        grouped.set(transaction.round_day, []);
      }
      grouped.get(transaction.round_day)!.push(transaction);
    }

    return grouped;
  }

  /**
   * Group transactions by user_id
   */
  private groupTransactionsByUser(
    transactions: Transaction[],
  ): Map<number, Transaction[]> {
    const grouped = new Map<number, Transaction[]>();

    for (const transaction of transactions) {
      if (!grouped.has(transaction.user_id)) {
        grouped.set(transaction.user_id, []);
      }
      grouped.get(transaction.user_id)!.push(transaction);
    }

    return grouped;
  }

  /**
   * Process transactions for a specific user
   */
  private async processUserTransactions(
    userId: number,
    transactions: Transaction[],
    roundResults: PowerballRoundInfo | Powerball3RoundInfo | Powerball5RoundInfo | PowerladderRoundInfo,
    game: string,
  ) {
    const user = await this.userRepository.findOne({
      where: { uid: userId },
      relations: ['partner'],
    });

    if (!user) {
      this.logger.warn('User not found', { userId }, 'BettingResultProcessor');
      return;
    }

    let totalWinAmount = 0;
    const updatedTransactions = [];

    // Process each transaction
    for (const transaction of transactions) {
      let isWin = false;
      
      if (game === 'named_powerladder' || game === 'named_powerladder3' || game === 'named_powerladder5') {
        isWin = this.checkIfWinLadder(transaction.selected_option, roundResults as PowerladderRoundInfo | Powerladder3RoundInfo | Powerladder5RoundInfo);
      } else if (game === 'named_rball_56') {
        isWin = this.checkIfWinRball(transaction.selected_option, roundResults as Rball56RoundInfo);
      } else if (game === 'named_runningball5_4') {
        isWin = this.checkIfWinRball(transaction.selected_option, roundResults as Runningball54RoundInfo);
      } else if (game === 'named_runningball3') {
        isWin = this.checkIfWinRunningball3(transaction.selected_option, roundResults as Runningball3RoundInfo);
      } else if (game === 'named_space8') {
        isWin = this.checkIfWinSpace8(transaction.selected_option, roundResults as Space8RoundInfo);
      } else if (game === 'named_holdem') {
        isWin = this.checkIfWinHoldem(transaction.selected_option, roundResults as HoldemRoundInfo);
      } else {
        isWin = this.checkIfWin(transaction.selected_option, roundResults as PowerballRoundInfo | Powerball3RoundInfo | Powerball5RoundInfo);
      }
      
      const winAmount = isWin ? transaction.bet_amount * transaction.rate : 0;

      // Update transaction
      transaction.status = isWin ? 'win' : 'lose';
      transaction.win_amount = winAmount;

      updatedTransactions.push(transaction);
      totalWinAmount += winAmount;
    }

    // Update transactions and balances in database transaction (with lock to prevent race condition)
    await this.transactionRepository.manager.transaction(async (manager) => {
      const transactionLogRepository = manager.getRepository(TransactionLog);

      // 1. Update transactions
      await manager.save(Transaction, updatedTransactions);

      // 2. Update balances if there are winnings (atomic update with lock)
      if (totalWinAmount > 0) {
        // 2.1. Lock and update partner balance atomically
        const updatePartnerResult = await manager
          .createQueryBuilder()
          .update(Partner)
          .set({
            balance: () => `balance + ${totalWinAmount}`,
          })
          .where('uid = :partnerId', { partnerId: user.partner_id })
          .execute();

        if (updatePartnerResult.affected === 0) {
          throw new Error('Partner not found');
        }

        // 2.2. Lock and update user balance atomically
        const updateUserResult = await manager
          .createQueryBuilder()
          .update(User)
          .set({
            balance: () => `balance + ${totalWinAmount}`,
          })
          .where('uid = :userId', { userId: user.uid })
          .execute();

        if (updateUserResult.affected === 0) {
          throw new Error('User not found');
        }

        // 2.3. Record transaction logs for each winning transaction
        const updatedUserEntity = await manager.findOne(User, {
          where: { uid: user.uid },
        });
        const userBalanceAfter = this.normalizeDecimal(
          updatedUserEntity?.balance ?? (this.normalizeDecimal(user.balance) + totalWinAmount),
        );
        const userBalanceBefore = this.normalizeDecimal(userBalanceAfter - totalWinAmount);
        let runningBalance = userBalanceBefore;
        const winningTransactions = updatedTransactions
          .filter((t) => t.status === 'win' && Number(t.win_amount) > 0)
          .sort((a, b) => a.id - b.id);

        if (winningTransactions.length > 0) {
          const logRecords = [];
          for (const winTransaction of winningTransactions) {
            const amount = this.normalizeDecimal(
              typeof winTransaction.win_amount === 'string'
                ? parseFloat(winTransaction.win_amount)
                : winTransaction.win_amount,
            );
            const balanceBefore = runningBalance;
            const balanceAfter = this.normalizeDecimal(runningBalance + amount);
            runningBalance = balanceAfter;

            logRecords.push(
              transactionLogRepository.create({
                user_id: user.uid,
                partner_id: user.partner_id,
                type: TRANSACTION_LOG_TYPES.BETTING_WIN,
                note: null,
                description: null,
                amount,
                balance_before: balanceBefore,
                balance_after: balanceAfter,
                transaction_id: winTransaction.id,
                reg_date: new Date(),
              }),
            );
          }

          await transactionLogRepository.save(logRecords);
        }
      }
    });

    // Send real-time updates
    await this.sendUserUpdates(user, updatedTransactions, totalWinAmount);
  }

  /**
   * Check if a bet is a win based on round results for ladder games
   */
  private checkIfWinLadder(
    selectedOption: string,
    roundResults: PowerladderRoundInfo | Powerladder3RoundInfo | Powerladder5RoundInfo,
  ): boolean {
    // Extract results from round data
    const resultOddEven = roundResults.data1; // 'res_odd' or 'res_even'
    const lineCount = roundResults.data2; // 'line3' or 'line4'
    const startPoint = roundResults.data3; // 'left' or 'right'

    // Convert data1 to bet key format
    const oddEven = resultOddEven === 'res_odd' ? 'odd' : 'even';

    // Check basic options
    if (selectedOption === 'line3' && lineCount === 'line3') return true;
    if (selectedOption === 'line4' && lineCount === 'line4') return true;
    if (selectedOption === 'left' && startPoint === 'left') return true;
    if (selectedOption === 'right' && startPoint === 'right') return true;
    if (selectedOption === 'odd' && oddEven === 'odd') return true;
    if (selectedOption === 'even' && oddEven === 'even') return true;

    // Check combination options
    if (selectedOption === 'left_3_even' && startPoint === 'left' && lineCount === 'line3' && oddEven === 'even') return true;
    if (selectedOption === 'right_3_odd' && startPoint === 'right' && lineCount === 'line3' && oddEven === 'odd') return true;
    if (selectedOption === 'left_4_odd' && startPoint === 'left' && lineCount === 'line4' && oddEven === 'odd') return true;
    if (selectedOption === 'right_4_even' && startPoint === 'right' && lineCount === 'line4' && oddEven === 'even') return true;

    return false;
  }

  /**
   * Check if a bet is a win based on round results for powerball games
   * Uses pre-calculated data from database (data1-5) instead of recalculating
   */
  private checkIfWin(
    selectedOption: string,
    roundResults: PowerballRoundInfo | Powerball3RoundInfo | Powerball5RoundInfo,
  ): boolean {
    // Use pre-calculated results from database instead of recalculating
    // data1 = powerball odd/even (pow_odd/pow_even)
    // data2 = powerball under/over (pow_under/pow_over)
    // data3 = sum odd/even (def_odd/def_even)
    // data4 = sum under/over (def_under/def_over)
    // data5 = sum size (def_s/def_m/def_l)
    const results = [
      roundResults.data1, // powerball odd/even
      roundResults.data2, // powerball under/over
      roundResults.data3, // sum odd/even
      roundResults.data4, // sum under/over
      roundResults.data5, // sum size
    ].filter((value) => value != null && value !== ''); // Filter out null/empty values

    return results.includes(selectedOption);
  }

  /**
   * Check if a bet is a win based on round results for rball games (rball56 and runningball54)
   * Uses pre-calculated data from database:
   * - balldata1: first ball value (1-6 for rball56, 1-4 for runningball54)
   * - data1: first ball odd/even (1st_odd/1st_even)
   * - data2: first ball under/over (1st_under/1st_over)
   * - data3: sum of balls 1-3 odd/even (1_3_odd/1_3_even)
   * - data4: sum of balls 1-3 under/over (1_3_under/1_3_over)
   * 
   * Bet keys '1'-'6' (or '1'-'4' for runningball54) are predictions for balldata1 (first ball)
   * Other bet keys check against data1-4
   */
  private checkIfWinRball(
    selectedOption: string,
    roundResults: Rball56RoundInfo | Runningball54RoundInfo,
  ): boolean {
    // Check if selectedOption is a number (1-6 for rball56, 1-4 for runningball54)
    // These bet_keys predict balldata1 (first ball)
    const numericOptions = ['1', '2', '3', '4', '5', '6'];
    if (numericOptions.includes(selectedOption)) {
      return selectedOption === roundResults.balldata1;
    }

    // Check other options using pre-calculated data (data1-4)
    const results = [
      roundResults.data1, // first ball odd/even (1st_odd/1st_even)
      roundResults.data2, // first ball under/over (1st_under/1st_over)
      roundResults.data3, // sum 1-3 odd/even (1_3_odd/1_3_even)
      roundResults.data4, // sum 1-3 under/over (1_3_under/1_3_over)
    ].filter((value) => value != null && value !== ''); // Filter out null/empty values

    return results.includes(selectedOption);
  }

  /**
   * Check if win for named_runningball3
   */
  private checkIfWinRunningball3(
    selectedOption: string,
    roundResults: Runningball3RoundInfo,
  ): boolean {
    // Check if selectedOption is a number (1 or 2) - predicts balldata1
    if (selectedOption === '1' || selectedOption === '2') {
      return selectedOption === roundResults.balldata1;
    }

    // Check other options using pre-calculated data
    return roundResults.data1 === selectedOption; // 1st_odd/1st_even
  }

  /**
   * Check if win for named_space8
   */
  private checkIfWinSpace8(
    selectedOption: string,
    roundResults: Space8RoundInfo,
  ): boolean {
    // Check all data fields (data1-8)
    const results = [
      roundResults.data1, // count_win_home/count_win_away
      roundResults.data2, // sum_win_home/sum_win_away
      roundResults.data3, // sum_home_odd/sum_home_even
      roundResults.data4, // sum_away_odd/sum_away_even
      roundResults.data5, // home_ball1_odd/home_ball1_even
      roundResults.data6, // away_ball1_odd/away_ball1_even
      roundResults.data7, // home_ball1_under/home_ball1_over
      roundResults.data8, // away_ball1_under/away_ball1_over
    ].filter((value) => value != null && value !== '');

    return results.includes(selectedOption);
  }

  /**
   * Check if win for named_holdem
   */
  private checkIfWinHoldem(
    selectedOption: string,
    roundResults: HoldemRoundInfo,
  ): boolean {
    // Check data1 (winner player) and data2 (win combo)
    return roundResults.data1 === selectedOption || roundResults.data2 === selectedOption;
  }

  /**
   * Check if a round has ended by checking minigame_round table
   */
  private async checkIfRoundHasEnded(roundDay: string, game: string): Promise<boolean> {
    try {
      // Extract round number from roundDay (e.g., "20251018_245" -> 245)
      const providerId = 1; // Assuming provider ID 1 for named_powerball

      // Get the round from minigame_round table
      const round = await this.minigameRoundService.getRound(
        providerId,
        game,
        roundDay.toString(),
      );

      if (!round) {
        this.logger.warn(
          'Round not found in minigame_round table',
          {
            roundDay,
            providerId,
          },
          'BettingResultProcessor',
        );
        return false;
      }

      // Check if current time is past the round's end time
      const now = new Date();
      const hasEnded = now > round.endDatetime;

      return hasEnded;
    } catch (error) {
      this.logger.error(
        'Error checking if round has ended',
        {
          roundDay,
          error: error.message,
        },
        'BettingResultProcessor',
      );
      return false;
    }
  }

  /**
   * Check and process refunds for transactions
   * For runningball games (named_rball_56, named_runningball5_4, named_runningball3, named_space8): max tries = 30
   * For other games: max tries = 3
   * Only refunds if tries reaches max tries or more
   */
  private async checkAndProcessRefunds(
    transactions: Transaction[],
    game: string,
  ): Promise<void> {
    // Determine max tries based on game type
    // Runningball games: results come later, need more retries
    const runningballGames = [
      'named_rball_56',
      'named_runningball5_4',
      'named_runningball3',
      'named_space8',
    ];
    const maxTries = runningballGames.includes(game) ? 30 : 3;

    for (const transaction of transactions) {
      // Calculate new tries value
      const newTries = transaction.tries + 1;

      // Increment tries first
      await this.transactionRepository.update(transaction.id, {
        tries: newTries,
      });

      // Check if tries >= maxTries and not already refunded
      if (newTries >= maxTries && transaction.status === 'pending') {
        // Process refund
        await this.processRefund(transaction);
      }
    }
  }

  /**
   * Process refund for a transaction
   */
  private async processRefund(transaction: Transaction): Promise<void> {
    try {
      // Process refund in database transaction (with lock to prevent race condition)
      await this.transactionRepository.manager.transaction(async (manager) => {
        // 1. Lock and get user with partner relationship
        const user = await manager
          .createQueryBuilder(User, 'user')
          .setLock('pessimistic_write')
          .leftJoinAndSelect('user.partner', 'partner')
          .where('user.uid = :userId', { userId: transaction.user_id })
          .getOne();

        if (!user || !user.partner) {
          throw new Error('User or partner not found for refund');
        }

        const betAmount = parseFloat(transaction.bet_amount.toString());

        // 2. Update transaction status
        await manager.update(Transaction, transaction.id, {
          status: 'refund',
          win_amount: transaction.bet_amount, // Refund amount equals bet amount
        });

        // 3. Atomically update partner balance (add back bet amount)
        const updatePartnerResult = await manager
          .createQueryBuilder()
          .update(Partner)
          .set({
            balance: () => `balance + ${betAmount}`,
          })
          .where('uid = :partnerId', { partnerId: user.partner.uid })
          .execute();

        if (updatePartnerResult.affected === 0) {
          throw new Error('Partner not found');
        }

        // 4. Atomically update user balance (add back bet amount)
        const updateUserResult = await manager
          .createQueryBuilder()
          .update(User)
          .set({
            balance: () => `balance + ${betAmount}`,
          })
          .where('uid = :userId', { userId: user.uid })
          .execute();

        if (updateUserResult.affected === 0) {
          throw new Error('User not found');
        }

        // 5. Record transaction log for refund
        const transactionLogRepository = manager.getRepository(TransactionLog);
        const userBalanceBefore = this.normalizeDecimal(user.balance);
        const amount = this.normalizeDecimal(betAmount);
        const balanceAfter = this.normalizeDecimal(userBalanceBefore + amount);

        const logRecord = transactionLogRepository.create({
          user_id: user.uid,
          partner_id: user.partner.uid,
          type: TRANSACTION_LOG_TYPES.BETTING_REFUND,
          note: null,
          description: null,
          amount,
          balance_before: userBalanceBefore,
          balance_after: balanceAfter,
          transaction_id: transaction.id,
          reg_date: new Date(),
        });

        await transactionLogRepository.save(logRecord);
      });

      // Get updated user for sending real-time updates
      const user = await this.userRepository.findOne({
        where: { uid: transaction.user_id },
        relations: ['partner'],
      });

      if (user) {
        // Send real-time updates
        await this.sendRefundUpdates(user, transaction);
      }
    } catch (error) {
      this.logger.error(
        'Error processing refund',
        {
          transactionId: transaction.id,
          error: error instanceof Error ? error.message : String(error),
        },
        'BettingResultProcessor',
      );
    }
  }

  /**
   * Send real-time refund updates to user
   */
  private async sendRefundUpdates(
    user: User,
    transaction: Transaction,
  ): Promise<void> {
    try {
      // Get updated partner balance
      const partner = await this.partnerRepository.findOne({
        where: { uid: user.partner_id },
      });

      if (partner) {
        // Publish balance update to Redis with small delay for frontend display timing
        setTimeout(async () => {
          try {
            await this.redisService.publishEvent('socket:balance_update', {
              user_id: user.uid,
              username: user.username,
              balance: Number(user.balance),
              timestamp: new Date().toISOString(),
            });
          } catch (error) {
            this.logger.warn(
              'Failed to publish balance update to Redis',
              {
                error: error.message,
                user_id: user.uid,
                username: user.username,
              },
              'BettingResultProcessor',
            );
          }
        }, 10000); // 10 seconds delay for frontend display timing

        // Get detailed game data for all supported games
        const gameData = await this.getGameDataForTransaction(transaction);

        // Publish transaction results to Redis with small delay for frontend display timing
        setTimeout(async () => {
          try {
            await this.redisService.publishEvent('socket:transaction_results', {
              user_id: user.uid,
              username: user.username,
              transaction: {
                id: transaction.id,
                round_day: transaction.round_day,
                created_at: transaction.created_at,
                game_name: this.getGameName(transaction.game),
                bet_amount: transaction.bet_amount.toString(),
                win_amount: transaction.bet_amount.toString(), // Refund amount equals bet amount
                status: 'refund', // Use 'refund' instead of 'refunded'
                selected_option: transaction.selected_option,
                selected_option_text: this.getSelectedOptionText(
                  transaction.selected_option,
                ),
                rate: transaction.rate.toString(),
                game_data: gameData,
              },
              timestamp: new Date().toISOString(),
            });
          } catch (error) {
            this.logger.warn(
              'Failed to publish transaction results to Redis',
              {
                error: error.message,
                user_id: user.uid,
                username: user.username,
              },
              'BettingResultProcessor',
            );
          }
        }, 10000); // 10 seconds delay for frontend display timing
      }
    } catch (error) {
      this.logger.warn(
        'Failed to publish refund updates to Redis',
        {
          error: error.message,
          username: user.username,
        },
        'BettingResultProcessor',
      );
    }
  }

  /**
   * Send real-time updates to user via Redis pub/sub
   */
  private async sendUserUpdates(
    user: User,
    transactions: Transaction[],
    totalWinAmount: number,
  ) {
    try {
      // Get updated partner balance
      const partner = await this.partnerRepository.findOne({
        where: { uid: user.partner_id },
      });

      if (partner) {
        // Publish balance update to Redis with small delay for frontend display timing
        setTimeout(async () => {
          try {
            await this.redisService.publishEvent('socket:balance_update', {
              username: user.username,
              balance: Number(user.balance),
              timestamp: new Date().toISOString(),
            });
          } catch (error) {
            this.logger.warn(
              'Failed to publish balance update to Redis',
              {
                error: error.message,
                username: user.username,
              },
              'BettingResultProcessor',
            );
          }
        }, 10000); // 10 seconds delay for frontend display timing

        // Publish transaction results to Redis (one by one)
        for (const transaction of transactions) {
          // Get detailed game data for all supported games
          const gameData = await this.getGameDataForTransaction(transaction);

          // Publish transaction results to Redis with small delay for frontend display timing
          setTimeout(async () => {
            try {
              await this.redisService.publishEvent(
                'socket:transaction_results',
                {
                  username: user.username,
                  transaction: {
                    id: transaction.id,
                    round_day: transaction.round_day,
                    created_at: transaction.created_at,
                    game_name: this.getGameName(transaction.game),
                    bet_amount: transaction.bet_amount.toString(),
                    win_amount: transaction.win_amount.toString(),
                    status: transaction.status,
                    selected_option: transaction.selected_option,
                    selected_option_text: this.getSelectedOptionText(
                      transaction.selected_option,
                    ),
                    rate: transaction.rate.toString(),
                    game_data: gameData,
                  },
                  timestamp: new Date().toISOString(),
                },
              );
            } catch (error) {
              this.logger.warn(
                'Failed to publish transaction results to Redis',
                {
                  error: error.message,
                  username: user.username,
                },
                'BettingResultProcessor',
              );
            }
          }, 10000); // 10 seconds delay for frontend display timing
        }
      }
    } catch (error) {
      this.logger.warn(
        'Failed to publish user updates to Redis',
        {
          error: error.message,
          username: user.username,
        },
        'BettingResultProcessor',
      );
    }
  }

  /**
   * Get game name for display
   */
  private getGameName(game: string): string {
    const gameNames: Record<string, string> = {
      named_powerball: '네임드 레드 파워볼',
      // Add more game names as needed
    };
    return gameNames[game] || game;
  }

  /**
   * Get selected option text for display
   */
  private getSelectedOptionText(selectedOption: string): string {
    const optionTexts: Record<string, string> = {
      def_l: '대',
      def_m: '중',
      def_s: '소',
      def_odd: '홀',
      def_even: '짝',
      def_under: '언더',
      def_over: '오버',
      pow_odd: '홀',
      pow_even: '짝',
      pow_under: '언더',
      pow_over: '오버',
    };
    return optionTexts[selectedOption] || selectedOption;
  }

  /**
   * Get game data for transaction (supports all powerball and ladder games)
   */
  private async getGameDataForTransaction(
    transaction: Transaction,
  ): Promise<any> {
    let gameData: any = {
      round_day: transaction.round_day,
    };

    try {
      let roundInfo: any = null;

      // Get round info based on game type
      if (transaction.game === 'named_powerball') {
        roundInfo = await this.powerballRoundRepository.findOne({
          where: { round: transaction.round_day },
        });
      } else if (transaction.game === 'named_powerball3') {
        roundInfo = await this.powerball3RoundRepository.findOne({
          where: { round: transaction.round_day },
        });
      } else if (transaction.game === 'named_powerball5') {
        roundInfo = await this.powerball5RoundRepository.findOne({
          where: { round: transaction.round_day },
        });
      } else if (transaction.game === 'named_powerladder') {
        roundInfo = await this.powerladderRoundRepository.findOne({
          where: { round: transaction.round_day },
        });
      } else if (transaction.game === 'named_powerladder3') {
        roundInfo = await this.powerladder3RoundRepository.findOne({
          where: { round: transaction.round_day },
        });
      } else if (transaction.game === 'named_powerladder5') {
        roundInfo = await this.powerladder5RoundRepository.findOne({
          where: { round: transaction.round_day },
        });
      } else if (transaction.game === 'named_rball_56') {
        roundInfo = await this.rball56RoundRepository.findOne({
          where: { round: transaction.round_day },
        });
      } else if (transaction.game === 'named_runningball5_4') {
        roundInfo = await this.runningball54RoundRepository.findOne({
          where: { round: transaction.round_day },
        });
      } else if (transaction.game === 'named_runningball3') {
        roundInfo = await this.runningball3RoundRepository.findOne({
          where: { round: transaction.round_day },
        });
      } else if (transaction.game === 'named_space8') {
        roundInfo = await this.space8RoundRepository.findOne({
          where: { round: transaction.round_day },
        });
      } else if (transaction.game === 'named_holdem') {
        roundInfo = await this.holdemRoundRepository.findOne({
          where: { round: transaction.round_day },
        });
      }

      if (roundInfo) {
        // For powerball games, parse with Korean text conversion
        if (
          transaction.game === 'named_powerball' ||
          transaction.game === 'named_powerball3' ||
          transaction.game === 'named_powerball5'
        ) {
          const rawGameData = {
            round_day: roundInfo.roundDay,
            balldata1: roundInfo.balldata1,
            balldata2: roundInfo.balldata2,
            balldata3: roundInfo.balldata3,
            balldata4: roundInfo.balldata4,
            balldata5: roundInfo.balldata5,
            balldata6: roundInfo.balldata6,
            data1: roundInfo.data1,
            data2: roundInfo.data2,
            data3: roundInfo.data3,
            data4: roundInfo.data4,
            data5: roundInfo.data5,
            regDate: roundInfo.regDate,
            date: roundInfo.date,
          };
          gameData = this.parseGameData(rawGameData);
        } else if (
          transaction.game === 'named_rball_56' ||
          transaction.game === 'named_runningball5_4' ||
          transaction.game === 'named_runningball3'
        ) {
          // For rball games, return ball data and results
          if (transaction.game === 'named_rball_56') {
            gameData = {
              round_day: roundInfo.roundDay || roundInfo.round,
              balldata1: roundInfo.balldata1,
              balldata2: roundInfo.balldata2,
              balldata3: roundInfo.balldata3,
              balldata4: roundInfo.balldata4,
              balldata5: roundInfo.balldata5,
              balldata6: roundInfo.balldata6,
              data1: roundInfo.data1, // first ball odd/even
              data2: roundInfo.data2, // first ball under/over
              data3: roundInfo.data3, // sum 1-3 odd/even
              data4: roundInfo.data4, // sum 1-3 under/over
              regDate: roundInfo.regDate,
              date: roundInfo.date,
            };
          } else if (transaction.game === 'named_runningball5_4') {
            gameData = {
              round_day: roundInfo.roundDay || roundInfo.round,
              balldata1: roundInfo.balldata1,
              balldata2: roundInfo.balldata2,
              balldata3: roundInfo.balldata3,
              balldata4: roundInfo.balldata4,
              data1: roundInfo.data1, // first ball odd/even
              data2: roundInfo.data2, // first ball under/over
              data3: roundInfo.data3, // sum 1-3 odd/even
              data4: roundInfo.data4, // sum 1-3 under/over
              regDate: roundInfo.regDate,
              date: roundInfo.date,
            };
          } else if (transaction.game === 'named_runningball3') {
            gameData = {
              round_day: roundInfo.roundDay || roundInfo.round,
              balldata1: roundInfo.balldata1,
              balldata2: roundInfo.balldata2,
              data1: roundInfo.data1, // first ball odd/even
              regDate: roundInfo.regDate,
              date: roundInfo.date,
            };
          }
        } else if (transaction.game === 'named_space8') {
          // For space8 games
          gameData = {
            round_day: roundInfo.roundDay || roundInfo.round,
            balldata1: roundInfo.balldata1, // HOME balls (JSON string)
            balldata2: roundInfo.balldata2, // AWAY balls (JSON string)
            data1: roundInfo.data1, // count_win
            data2: roundInfo.data2, // sum_win
            data3: roundInfo.data3, // sum_home_odd_even
            data4: roundInfo.data4, // sum_away_odd_even
            data5: roundInfo.data5, // home_ball1_odd_even
            data6: roundInfo.data6, // away_ball1_odd_even
            data7: roundInfo.data7, // home_ball1_under_over
            data8: roundInfo.data8, // away_ball1_under_over
            regDate: roundInfo.regDate,
            date: roundInfo.date,
          };
        } else if (transaction.game === 'named_holdem') {
          // For holdem games
          gameData = {
            round_day: roundInfo.roundDay || roundInfo.round,
            data1: roundInfo.data1, // winner player
            data2: roundInfo.data2, // win combo
            regDate: roundInfo.regDate,
            date: roundInfo.date,
          };
        } else {
          // For ladder games, return basic data
          gameData = {
            round_day: roundInfo.roundDay || roundInfo.round,
            data1: roundInfo.data1,
            data2: roundInfo.data2,
            data3: roundInfo.data3,
            regDate: roundInfo.regDate,
            date: roundInfo.date,
          };
        }
      }
    } catch (error: any) {
      this.logger.warn(
        'Failed to fetch game data for transaction',
        {
          transactionId: transaction.id,
          game: transaction.game,
          roundDay: transaction.round_day,
          error: error?.message || 'Unknown error',
        },
        'BettingResultProcessor',
      );
    }

    return gameData;
  }

  /**
   * Parse game data to show ball numbers and Korean text
   */
  private parseGameData(gameData: any): any {
    const parsed = { ...gameData };

    // Parse ball data - convert to numbers
    for (let i = 1; i <= 6; i++) {
      const ballData = gameData[`balldata${i}`];
      if (ballData) {
        const ballNumber = ballData.replace(/^[dp]/, ''); // Remove 'd' or 'p' prefix
        parsed[`balldata${i}`] = ballNumber;
      }
    }

    // Parse betting results - convert to Korean text
    const bettingMappings = {
      data1: { pow_odd: '홀', pow_even: '짝' },
      data2: { pow_under: '언더', pow_over: '오버' },
      data3: { def_odd: '홀', def_even: '짝' },
      data4: { def_under: '언더', def_over: '오버' },
      data5: { def_s: '소', def_m: '중', def_l: '대' },
    };

    Object.entries(bettingMappings).forEach(([key, mapping]) => {
      if (gameData[key] && mapping[gameData[key]]) {
        parsed[key] = mapping[gameData[key]];
      }
    });

    // Format date field to YYYY-MM-DD (handle timezone conversion)
    this.formatDateFields(parsed, gameData, ['date']);

    return parsed;
  }

  /**
   * Format date fields to YYYY-MM-DD format with timezone handling
   */
  private formatDateFields(
    parsed: any,
    gameData: any,
    dateFields: string[],
  ): void {
    const TZ_OFFSET = process.env.TZ_OFFSET_FOR_ROUND || '+9';
    const offsetHours = parseInt(TZ_OFFSET.replace('+', ''));

    dateFields.forEach((fieldName) => {
      if (gameData[fieldName]) {
        // If it's already a string in YYYY-MM-DD format, use it directly
        if (
          typeof gameData[fieldName] === 'string' &&
          /^\d{4}-\d{2}-\d{2}$/.test(gameData[fieldName])
        ) {
          parsed[fieldName] = gameData[fieldName];
        } else {
          // If it's a Date object, convert to target timezone date
          const date = new Date(gameData[fieldName]);

          // Adjust for timezone offset
          const adjustedDate = new Date(
            date.getTime() + offsetHours * 60 * 60 * 1000,
          );

          const year = adjustedDate.getUTCFullYear();
          const month = String(adjustedDate.getUTCMonth() + 1).padStart(2, '0');
          const day = String(adjustedDate.getUTCDate()).padStart(2, '0');

          parsed[fieldName] = `${year}-${month}-${day}`;
        }
      }
    });
  }

  /**
   * Format date field to YYYY-MM-DD format with timezone handling
   */
  private formatDateField(dateValue: any): string {
    if (!dateValue) return dateValue;

    // If it's already a string in YYYY-MM-DD format, use it directly
    if (
      typeof dateValue === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(dateValue)
    ) {
      return dateValue;
    }

    // Get timezone offset from environment
    const TZ_OFFSET = process.env.TZ_OFFSET_FOR_ROUND || '+9';
    const offsetHours = parseInt(TZ_OFFSET.replace('+', ''));

    // If it's a Date object, convert to target timezone date
    const date = new Date(dateValue);

    // Adjust for timezone offset
    const adjustedDate = new Date(
      date.getTime() + offsetHours * 60 * 60 * 1000,
    );

    const year = adjustedDate.getUTCFullYear();
    const month = String(adjustedDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(adjustedDate.getUTCDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  /**
   * Normalize decimal values returned from database
   */
  private normalizeDecimal(value: string | number | null | undefined): number {
    if (value === null || value === undefined) {
      return 0;
    }

    const numericValue = typeof value === 'string' ? parseFloat(value) : value;
    if (Number.isNaN(numericValue)) {
      return 0;
    }

    return Math.round(numericValue * 100) / 100;
  }
}
