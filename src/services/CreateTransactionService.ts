import { getCustomRepository, getRepository } from 'typeorm';
import TransactionsRepository from '../repositories/TransactionsRepository';
import AppError from '../errors/AppError';
import Transaction from '../models/Transaction';
import Category from '../models/Category';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}
class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);

    if (value <= 0) {
      throw new AppError('The value of transaction must be greater than 0.');
    }

    if (type !== 'income' && type !== 'outcome') {
      throw new AppError('The type of transaction must be income or outcome.');
    }

    if (type === 'outcome') {
      const { total } = await transactionsRepository.getBalance();
      if (value > total) {
        throw new AppError(
          "You canno't create a outcome transaction without a valid balance",
        );
      }
    }
    const transaction = transactionsRepository.create({ title, value, type });

    const categoryExists = await categoriesRepository.findOne({
      where: { title: category },
    });

    if (categoryExists) {
      transaction.category_id = categoryExists.id;
    } else {
      const newCategory = categoriesRepository.create({ title: category });
      await categoriesRepository.save(newCategory);

      transaction.category_id = newCategory.id;
    }

    await transactionsRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
