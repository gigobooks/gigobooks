/**
 * Copyright (c) 2020-present Beng Tan
 */

import { Base } from './Base'

export enum ActorType {
    Customer = 'customer',
    Supplier = 'supplier',
}

export const ActorTypeInfo: Record<string, any> = {
    [ActorType.Customer]: { label: 'Customer' },
    [ActorType.Supplier]: { label: 'Supplier' },
}

// An actor is anything that interacts with the system ie. a customer or supplier
export class Actor extends Base {
    static Customer = ActorType.Customer
    static Supplier = ActorType.Supplier
    static TypeInfo = ActorTypeInfo

    static NewCustomer = -1
    static NewSupplier = -2

    id?: number
    title?: string
    type?: ActorType
    taxId?: string
    address?: string

    static tableName = 'actor'
}

export default Actor
