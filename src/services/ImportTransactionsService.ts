import { getRepository, getCustomRepository, In } from 'typeorm';
import csvParse from 'csv-parse';
import fs from 'fs';

import TransactionsRepository from '../repositories/TransactionsRepository';
import Transaction from '../models/Transaction';
import Category from '../models/Category';

interface CSVTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}
class ImportTransactionsService {
  async execute(path: string): Promise<Transaction[]> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);
    const readCSVStream = fs.createReadStream(path);

    const parseStream = csvParse({
      from_line: 2,
      ltrim: true,
      rtrim: true,
    });

    const categoriesFromCSV = new Set();
    const transactionsFromCSV: CSVTransaction[] = [];

    const parseCSV = readCSVStream.pipe(parseStream);

    parseCSV.on('data', line => {
      const [title, type, value, category] = line;

      if (!title || !type || !value) return;

      categoriesFromCSV.add(category);
      transactionsFromCSV.push({ title, type, value, category });
    });

    await new Promise(resolve => parseCSV.on('end', resolve));

    const categories = Array.from(categoriesFromCSV) as string[];

    const categoriesInDatabase = await categoriesRepository.find({
      where: { title: In(Array.from(categories)) },
    });

    const categoriesTitleInDatabase = categoriesInDatabase.map(
      category => category.title,
    );

    const categoriesTitleToAdd = categories.filter(
      title => !categoriesTitleInDatabase.includes(title),
    );

    const newCategories = categoriesRepository.create(
      categoriesTitleToAdd.map(title => ({ title })),
    );

    await categoriesRepository.save(newCategories);

    const finalCategories = [...categoriesInDatabase, ...newCategories];

    const createdTransactions = transactionsRepository.create(
      transactionsFromCSV.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category_id: finalCategories.find(
          category => category.title === transaction.category,
        )?.id,
      })),
    );

    await transactionsRepository.save(createdTransactions);

    await fs.promises.unlink(path);

    return createdTransactions;
  }
}

export default ImportTransactionsService;
