export enum AccountType {
    Asset = "asset",
    Liability = "liability",
    Equity = "equity",
    Revenue = "revenue",
    Expense = "expense",
}

export class Account {
    // id: number
    // title: string
    // type: AccountType
    constructor(public id: number, public title: string, public type: AccountType) {
    }
}

