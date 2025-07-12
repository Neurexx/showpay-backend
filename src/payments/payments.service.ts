/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Payment, PaymentStatus, PaymentMethod } from './entities/payment.entity';

export class CreatePaymentDto {
  amount: number;
  currency?: string;
  payment_method: PaymentMethod;
  receiver_name: string;
  receiver_email?: string;
  description?: string;
  status?: PaymentStatus;
}

export class PaymentFilterDto {
  page?: number = 1;
  limit?: number = 10;
  status?: PaymentStatus;
  payment_method?: PaymentMethod;
  date_from?: Date;
  date_to?: Date;
}

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
  ) {}

  async create(createPaymentDto: CreatePaymentDto): Promise<Payment> {
    const payment = this.paymentsRepository.create({
      ...createPaymentDto,
      transaction_id: `TXN${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
    });

    return this.paymentsRepository.save(payment);
  }

  async findAll(filters: PaymentFilterDto): Promise<{ payments: Payment[]; total: number }> {
    const { page = 1, limit = 10, status, payment_method, date_from, date_to } = filters;
    
    const query = this.paymentsRepository.createQueryBuilder('payment');

    if (status) {
      query.andWhere('payment.status = :status', { status });
    }

    if (payment_method) {
      query.andWhere('payment.payment_method = :payment_method', { payment_method });
    }

    if (date_from && date_to) {
      query.andWhere('payment.created_at BETWEEN :date_from AND :date_to', {
        date_from,
        date_to,
      });
    }

    const [payments, total] = await query
      .orderBy('payment.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { payments, total };
  }

  async findOne(id: number): Promise<Payment|null> {
    return this.paymentsRepository.findOne({ where: { id } });
  }

  async getStats(): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() - 7);

    const [
      totalToday,
      totalThisWeek,
      revenueToday,
      revenueThisWeek,
      failedToday,
      failedThisWeek,
    ] = await Promise.all([
      this.paymentsRepository.count({
        where: { created_at: Between(today, new Date()) },
      }),
      this.paymentsRepository.count({
        where: { created_at: Between(thisWeek, new Date()) },
      }),
      this.paymentsRepository
        .createQueryBuilder('payment')
        .select('SUM(payment.amount)', 'total')
        .where('payment.status = :status', { status: PaymentStatus.SUCCESS })
        .andWhere('payment.created_at >= :today', { today })
        .getRawOne(),
      this.paymentsRepository
        .createQueryBuilder('payment')
        .select('SUM(payment.amount)', 'total')
        .where('payment.status = :status', { status: PaymentStatus.SUCCESS })
        .andWhere('payment.created_at >= :thisWeek', { thisWeek })
        .getRawOne(),
      this.paymentsRepository.count({
        where: { 
          status: PaymentStatus.FAILED,
          created_at: Between(today, new Date()),
        },
      }),
      this.paymentsRepository.count({
        where: { 
          status: PaymentStatus.FAILED,
          created_at: Between(thisWeek, new Date()),
        },
      }),
    ]);

    return {
      transactions: {
        today: totalToday,
        thisWeek: totalThisWeek,
      },
      revenue: {
        today: parseFloat(revenueToday?.total || '0'),
        thisWeek: parseFloat(revenueThisWeek?.total || '0'),
      },
      failedTransactions: {
        today: failedToday,
        thisWeek: failedThisWeek,
      },
    };
  }

  async getDailyRevenue(days: number = 7): Promise<any[]> {
    const result = await this.paymentsRepository
      .createQueryBuilder('payment')
      .select('DATE(payment.created_at) as date')
      .addSelect('SUM(payment.amount) as revenue')
      .addSelect('COUNT(*) as count')
      .where('payment.status = :status', { status: PaymentStatus.SUCCESS })
      .andWhere('payment.created_at >= :date', { 
        date: new Date(Date.now() - days * 24 * 60 * 60 * 1000) 
      })
      .groupBy('DATE(payment.created_at)')
      .orderBy('DATE(payment.created_at)', 'ASC')
      .getRawMany();

    return result.map(row => ({
      date: row.date,
      revenue: parseFloat(row.revenue),
      count: parseInt(row.count),
    }));
  }

  async seedSampleData(): Promise<void> {
    const samplePayments = [
      {
        amount: 100.00,
        payment_method: PaymentMethod.CREDIT_CARD,
        status: PaymentStatus.SUCCESS,
        receiver_name: 'John Doe',
        receiver_email: 'john@example.com',
        description: 'Product purchase',
      },
      {
        amount: 250.50,
        payment_method: PaymentMethod.PAYPAL,
        status: PaymentStatus.FAILED,
        receiver_name: 'Jane Smith',
        receiver_email: 'jane@example.com',
        description: 'Service payment',
      },
      {
        amount: 75.25,
        payment_method: PaymentMethod.BANK_TRANSFER,
        status: PaymentStatus.PENDING,
        receiver_name: 'Bob Johnson',
        receiver_email: 'bob@example.com',
        description: 'Subscription',
      },
    ];

    for (const payment of samplePayments) {
      await this.create(payment);
    }
  }
}