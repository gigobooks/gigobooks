export enum AccountType {
    Asset = "asset",
    Liability = "liability",
    Equity = "equity",
    Revenue = "revenue",
    Expense = "expense",
}

export default class Account {
    updatedAt: Date

    constructor(public id: number, public title: string, public type: AccountType, public createdAt: Date = new Date(), updatedAt?: Date) {
        this.updatedAt = updatedAt === undefined ? createdAt : updatedAt
    }
}
