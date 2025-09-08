import { Injectable } from '@nestjs/common';
import { RedactedLogger } from '../utils/redacted-logger';

export interface PaymentProvider {
  name: string;
  type: 'local' | 'international';
  region: 'RU' | 'BY' | 'GLOBAL';
  endpoint: string;
  supportedCards: string[];
  supportedCurrencies: string[];
  features: {
    recurringPayments: boolean;
    refunds: boolean;
    partialRefunds: boolean;
    webhooks: boolean;
    api: boolean;
  };
  pricing: {
    transactionFee: number;
    monthlyFee: number;
    currency: 'RUB' | 'BYN' | 'USD';
  };
  compliance: {
    pciDss: boolean;
    localLaws: boolean;
    dataResidency: boolean;
  };
}

export interface PaymentTransaction {
  id: string;
  providerId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  cardType?: string | undefined; // exactOptionalPropertyTypes учтено
  createdAt: Date;
  completedAt?: Date;
}

@Injectable()
export class PaymentSystemsService {
  private readonly redactedLogger = new RedactedLogger(
    PaymentSystemsService.name
  );
  private readonly providers: Map<string, PaymentProvider> = new Map();
  private readonly transactions: Map<string, PaymentTransaction> = new Map();

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Локальные платежные системы
    this.providers.set('erip', {
      name: 'ЕРИП',
      type: 'local',
      region: 'BY',
      endpoint: 'https://api.erip.by',
      supportedCards: ['Visa', 'Mastercard', 'МИР'],
      supportedCurrencies: ['BYN'],
      features: {
        recurringPayments: true,
        refunds: true,
        partialRefunds: true,
        webhooks: true,
        api: true,
      },
      pricing: {
        transactionFee: 0.02,
        monthlyFee: 0,
        currency: 'BYN',
      },
      compliance: {
        pciDss: true,
        localLaws: true,
        dataResidency: true,
      },
    });

    this.providers.set('bepaid', {
      name: 'bePaid',
      type: 'local',
      region: 'BY',
      endpoint: 'https://api.bepaid.by',
      supportedCards: ['Visa', 'Mastercard', 'МИР'],
      supportedCurrencies: ['BYN', 'USD', 'EUR'],
      features: {
        recurringPayments: true,
        refunds: true,
        partialRefunds: true,
        webhooks: true,
        api: true,
      },
      pricing: {
        transactionFee: 0.025,
        monthlyFee: 50,
        currency: 'BYN',
      },
      compliance: {
        pciDss: true,
        localLaws: true,
        dataResidency: true,
      },
    });

    this.providers.set('webpay', {
      name: 'WebPay',
      type: 'local',
      region: 'BY',
      endpoint: 'https://api.webpay.by',
      supportedCards: ['Visa', 'Mastercard', 'МИР'],
      supportedCurrencies: ['BYN', 'USD', 'EUR'],
      features: {
        recurringPayments: true,
        refunds: true,
        partialRefunds: true,
        webhooks: true,
        api: true,
      },
      pricing: {
        transactionFee: 0.03,
        monthlyFee: 30,
        currency: 'BYN',
      },
      compliance: {
        pciDss: true,
        localLaws: true,
        dataResidency: true,
      },
    });

    this.providers.set('oplati', {
      name: 'Оплати',
      type: 'local',
      region: 'BY',
      endpoint: 'https://api.oplati.by',
      supportedCards: ['Visa', 'Mastercard', 'МИР'],
      supportedCurrencies: ['BYN'],
      features: {
        recurringPayments: false,
        refunds: true,
        partialRefunds: false,
        webhooks: true,
        api: true,
      },
      pricing: {
        transactionFee: 0.015,
        monthlyFee: 0,
        currency: 'BYN',
      },
      compliance: {
        pciDss: true,
        localLaws: true,
        dataResidency: true,
      },
    });

    this.providers.set('cloudpayments', {
      name: 'CloudPayments',
      type: 'local',
      region: 'RU',
      endpoint: 'https://api.cloudpayments.ru',
      supportedCards: ['Visa', 'Mastercard', 'МИР'],
      supportedCurrencies: ['RUB', 'USD', 'EUR'],
      features: {
        recurringPayments: true,
        refunds: true,
        partialRefunds: true,
        webhooks: true,
        api: true,
      },
      pricing: {
        transactionFee: 0.025,
        monthlyFee: 0,
        currency: 'RUB',
      },
      compliance: {
        pciDss: true,
        localLaws: true,
        dataResidency: true,
      },
    });

    this.providers.set('yukassa', {
      name: 'ЮKassa',
      type: 'local',
      region: 'RU',
      endpoint: 'https://api.yookassa.ru',
      supportedCards: ['Visa', 'Mastercard', 'МИР'],
      supportedCurrencies: ['RUB'],
      features: {
        recurringPayments: true,
        refunds: true,
        partialRefunds: true,
        webhooks: true,
        api: true,
      },
      pricing: {
        transactionFee: 0.03,
        monthlyFee: 0,
        currency: 'RUB',
      },
      compliance: {
        pciDss: true,
        localLaws: true,
        dataResidency: true,
      },
    });

    this.providers.set('yumoney', {
      name: 'ЮMoney',
      type: 'local',
      region: 'RU',
      endpoint: 'https://api.yoomoney.ru',
      supportedCards: ['Visa', 'Mastercard', 'МИР'],
      supportedCurrencies: ['RUB'],
      features: {
        recurringPayments: true,
        refunds: true,
        partialRefunds: true,
        webhooks: true,
        api: true,
      },
      pricing: {
        transactionFee: 0.025,
        monthlyFee: 0,
        currency: 'RUB',
      },
      compliance: {
        pciDss: true,
        localLaws: true,
        dataResidency: true,
      },
    });

    this.providers.set('tinkoff-kassa', {
      name: 'Тинькофф Касса',
      type: 'local',
      region: 'RU',
      endpoint: 'https://api.tinkoff.ru',
      supportedCards: ['Visa', 'Mastercard', 'МИР'],
      supportedCurrencies: ['RUB'],
      features: {
        recurringPayments: true,
        refunds: true,
        partialRefunds: true,
        webhooks: true,
        api: true,
      },
      pricing: {
        transactionFee: 0.02,
        monthlyFee: 0,
        currency: 'RUB',
      },
      compliance: {
        pciDss: true,
        localLaws: true,
        dataResidency: true,
      },
    });

    this.providers.set('sberpay', {
      name: 'СберPay',
      type: 'local',
      region: 'RU',
      endpoint: 'https://api.sberpay.ru',
      supportedCards: ['Visa', 'Mastercard', 'МИР'],
      supportedCurrencies: ['RUB'],
      features: {
        recurringPayments: true,
        refunds: true,
        partialRefunds: true,
        webhooks: true,
        api: true,
      },
      pricing: {
        transactionFee: 0.015,
        monthlyFee: 0,
        currency: 'RUB',
      },
      compliance: {
        pciDss: true,
        localLaws: true,
        dataResidency: true,
      },
    });

    this.providers.set('spb', {
      name: 'СПБ',
      type: 'local',
      region: 'RU',
      endpoint: 'https://api.spb.ru',
      supportedCards: ['Visa', 'Mastercard', 'МИР'],
      supportedCurrencies: ['RUB'],
      features: {
        recurringPayments: true,
        refunds: true,
        partialRefunds: true,
        webhooks: true,
        api: true,
      },
      pricing: {
        transactionFee: 0.02,
        monthlyFee: 0,
        currency: 'RUB',
      },
      compliance: {
        pciDss: true,
        localLaws: true,
        dataResidency: true,
      },
    });

    // Международные платежные системы
    this.providers.set('apple-pay', {
      name: 'Apple Pay',
      type: 'international',
      region: 'GLOBAL',
      endpoint: 'https://api.apple.com/pay',
      supportedCards: ['Visa', 'Mastercard', 'American Express'],
      supportedCurrencies: ['USD', 'EUR', 'GBP', 'RUB', 'BYN'],
      features: {
        recurringPayments: true,
        refunds: true,
        partialRefunds: true,
        webhooks: true,
        api: true,
      },
      pricing: {
        transactionFee: 0.015,
        monthlyFee: 0,
        currency: 'USD',
      },
      compliance: {
        pciDss: true,
        localLaws: false,
        dataResidency: false,
      },
    });

    this.providers.set('google-pay', {
      name: 'Google Pay',
      type: 'international',
      region: 'GLOBAL',
      endpoint: 'https://api.google.com/pay',
      supportedCards: ['Visa', 'Mastercard', 'American Express'],
      supportedCurrencies: ['USD', 'EUR', 'GBP', 'RUB', 'BYN'],
      features: {
        recurringPayments: true,
        refunds: true,
        partialRefunds: true,
        webhooks: true,
        api: true,
      },
      pricing: {
        transactionFee: 0.015,
        monthlyFee: 0,
        currency: 'USD',
      },
      compliance: {
        pciDss: true,
        localLaws: false,
        dataResidency: false,
      },
    });

    this.providers.set('samsung-pay', {
      name: 'Samsung Pay',
      type: 'international',
      region: 'GLOBAL',
      endpoint: 'https://api.samsung.com/pay',
      supportedCards: ['Visa', 'Mastercard', 'American Express'],
      supportedCurrencies: ['USD', 'EUR', 'GBP', 'RUB', 'BYN'],
      features: {
        recurringPayments: true,
        refunds: true,
        partialRefunds: true,
        webhooks: true,
        api: true,
      },
      pricing: {
        transactionFee: 0.015,
        monthlyFee: 0,
        currency: 'USD',
      },
      compliance: {
        pciDss: true,
        localLaws: false,
        dataResidency: false,
      },
    });

    this.redactedLogger.log(
      'Payment systems initialized',
      'PaymentSystemsService'
    );
  }

  getAllProviders(): PaymentProvider[] {
    return Array.from(this.providers.values());
  }

  getProvider(id: string): PaymentProvider | null {
    return this.providers.get(id) ?? null;
  }

  getProvidersByRegion(region: 'RU' | 'BY' | 'GLOBAL'): PaymentProvider[] {
    return Array.from(this.providers.values()).filter(p => p.region === region);
  }

  getLocalProviders(): PaymentProvider[] {
    return Array.from(this.providers.values()).filter(p => p.type === 'local');
  }

  getInternationalProviders(): PaymentProvider[] {
    return Array.from(this.providers.values()).filter(
      p => p.type === 'international'
    );
  }

  async processPayment(
    providerId: string,
    amount: number,
    currency: string,
    cardType?: string
  ): Promise<string | null> {
    const provider = this.getProvider(providerId);
    if (provider == null) {
      this.redactedLogger.error(
        `Payment provider not found: ${providerId}`,
        'PaymentSystemsService'
      );
      return null;
    }

    if (!provider.supportedCurrencies.includes(currency)) {
      this.handleUnsupportedCurrency(currency, {
        name: provider.name,
        supportedCurrencies: provider.supportedCurrencies,
      });
      return null;
    }

    const transactionId = `payment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const transaction: PaymentTransaction = {
      id: transactionId,
      providerId,
      amount,
      currency,
      status: 'pending',
      ...(cardType !== undefined ? { cardType } : {}), // безопасно для exactOptionalPropertyTypes
      createdAt: new Date(),
    };

    this.transactions.set(transactionId, transaction);

    try {
      this.redactedLogger.log(
        `Payment processed: ${transactionId}`,
        'PaymentSystemsService',
        {
          provider: provider.name,
          amount,
          currency,
          cardType,
        }
      );

      // Имитация обработки платежа
      setTimeout(() => {
        const transaction = this.transactions.get(transactionId);
        if (transaction != null) {
          transaction.status = 'completed';
          transaction.completedAt = new Date();
          this.redactedLogger.log(
            `Payment completed: ${transactionId}`,
            'PaymentSystemsService'
          );
        }
      }, 2000);

      return transactionId;
    } catch (error) {
      this.redactedLogger.error(
        `Payment processing failed: ${transactionId}`,
        error as string
      );
      this.transactions.delete(transactionId);
      return null;
    }
  }

  getTransaction(id: string): PaymentTransaction | null {
    return this.transactions.get(id) ?? null;
  }

  getAllTransactions(): PaymentTransaction[] {
    return Array.from(this.transactions.values());
  }

  async refundPayment(
    transactionId: string,
    amount?: number
  ): Promise<boolean> {
    const transaction = this.transactions.get(transactionId);
    if (transaction == null) {
      return false;
    }

    const provider = this.getProvider(transaction.providerId);
    if (!this.checkRefunds(provider ?? undefined)) {
      return false;
    }

    try {
      const refundAmount = amount ?? transaction.amount;
      transaction.status = 'refunded';

      this.redactedLogger.log(
        `Payment refunded: ${transactionId}`,
        'PaymentSystemsService',
        {
          originalAmount: transaction.amount,
          refundAmount,
          provider: provider?.name,
        }
      );

      return true;
    } catch (error) {
      this.redactedLogger.error(
        `Payment refund failed: ${transactionId}`,
        error as string
      );
      return false;
    }
  }

  getOptimalProvider(requirements: {
    region: 'RU' | 'BY' | 'GLOBAL';
    currency: string;
    cardType?: string;
    features: string[];
  }): PaymentProvider | null {
    const availableProviders = this.getProvidersByRegion(requirements.region);

    const suitableProviders = availableProviders.filter(provider => {
      const supportsCurrency = provider.supportedCurrencies.includes(
        requirements.currency
      );
      const supportsCard =
        requirements.cardType == null ||
        provider.supportedCards.includes(requirements.cardType);

      const hasRequiredFeatures = requirements.features.every(feature => {
        switch (feature) {
          case 'recurringPayments':
            return provider.features.recurringPayments;
          case 'refunds':
            return provider.features.refunds;
          case 'partialRefunds':
            return provider.features.partialRefunds;
          case 'webhooks':
            return provider.features.webhooks;
          case 'api':
            return provider.features.api;
          default:
            return true;
        }
      });

      return supportsCurrency && supportsCard && hasRequiredFeatures;
    });

    if (suitableProviders.length === 0) {
      return null;
    }

    // Выбираем провайдера с наименьшей комиссией
    const sorted = suitableProviders.sort(
      (a, b) => a.pricing.transactionFee - b.pricing.transactionFee
    );
    return sorted[0] ?? null;
  }

  handleUnsupportedCurrency(
    currency: string,
    provider: { name: string; supportedCurrencies: string[] }
  ) {
    this.redactedLogger.errorWithData(
      `Currency not supported: ${currency}`,
      {
        provider: provider.name,
        supportedCurrencies: provider.supportedCurrencies,
      },
      'PaymentSystemsService'
    );
  }

  createTransaction(
    transactionId: string,
    providerId: string,
    amount: number,
    currency: string,
    cardType?: string
  ): PaymentTransaction {
    const transaction: PaymentTransaction = {
      id: transactionId,
      providerId,
      amount,
      currency,
      status: 'pending',
      ...(cardType !== undefined ? { cardType } : {}), // безопасно для exactOptionalPropertyTypes
      createdAt: new Date(),
    };
    return transaction;
  }

  /**
   * Создание транзакции с автоматическим ID
   */
  createTransactionWithAutoId(config: {
    providerId: string;
    amount: number;
    currency: string;
    cardType?: string;
  }): PaymentTransaction {
    const transactionId = `txn-${Date.now()}`;
    return this.createTransaction(
      transactionId,
      config.providerId,
      config.amount,
      config.currency,
      config.cardType
    );
  }

  checkRefunds(provider?: { features?: { refunds?: boolean } }) {
    // Явная проверка nullish для ESLint strict-boolean-expressions
    if (provider == null || provider.features?.refunds !== true) {
      return false;
    }
    return true;
  }

  /**
   * Получение провайдеров по типу
   */
  getProvidersByType(type: 'local' | 'international'): PaymentProvider[] {
    return Array.from(this.providers.values()).filter(
      provider => provider.type === type
    );
  }

  /**
   * Получение истории транзакций
   */
  getTransactionHistory(providerId: string): PaymentTransaction[] {
    return Array.from(this.transactions.values()).filter(
      transaction => transaction.providerId === providerId
    );
  }

  /**
   * Обработка возврата средств
   */
  processRefund(
    transactionId: string,
    amount: number
  ): PaymentTransaction | null {
    const transaction = this.transactions.get(transactionId);
    if (transaction == null) {
      return null;
    }

    if (amount > transaction.amount) {
      return null;
    }

    const refundTransaction: PaymentTransaction = {
      id: `refund-${Date.now()}`,
      providerId: transaction.providerId,
      amount,
      currency: transaction.currency,
      status: 'refunded',
      createdAt: new Date(),
    };

    this.transactions.set(refundTransaction.id, refundTransaction);

    this.redactedLogger.log(`Refund processed`, 'PaymentSystemsService', {
      originalTransaction: transactionId,
      amount,
      currency: transaction.currency,
    });

    return refundTransaction;
  }
}
