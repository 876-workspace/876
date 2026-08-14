export const bankingDocs = {
  listAccounts: { summary: 'Billing GET /banking/accounts' },
  createAccount: { summary: 'Billing POST /banking/accounts' },
  retrieveAccount: { summary: 'Billing GET /banking/accounts/{accountId}' },
  updateAccount: { summary: 'Billing PATCH /banking/accounts/{accountId}' },
  deleteAccount: { summary: 'Billing DELETE /banking/accounts/{accountId}' },
  listTransactions: {
    summary: 'Billing GET /banking/accounts/{accountId}/transactions',
  },
  createTransaction: {
    summary: 'Billing POST /banking/accounts/{accountId}/transactions',
  },
  retrieveTransaction: {
    summary:
      'Billing GET /banking/accounts/{accountId}/transactions/{transactionId}',
  },
  updateTransaction: {
    summary:
      'Billing PATCH /banking/accounts/{accountId}/transactions/{transactionId}',
  },
  deleteTransaction: {
    summary:
      'Billing DELETE /banking/accounts/{accountId}/transactions/{transactionId}',
  },
} as const
