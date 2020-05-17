import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const incomes = await this.find({ where: { type: 'income' } });
    const outcomes = await this.find({ where: { type: 'outcome' } });

    const income = incomes.reduce((total, current) => {
      return total + current.value;
    }, 0);

    const outcome = outcomes.reduce((total, current) => {
      return total + current.value;
    }, 0);

    const total = income - outcome;

    return { income, outcome, total };
  }
}

export default TransactionsRepository;
