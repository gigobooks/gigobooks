import { Base } from './Base'

export enum ActorType {
    Customer = 'customer',
    Supplier = 'supplier',
}

export const ActorTypeInfo: any = {
    [ActorType.Customer]: { label: 'Customer' },
    [ActorType.Supplier]: { label: 'Supplier' },
}

// An actor is anything that interacts with the system ie. a customer or supplier
export class Actor extends Base {
    static Customer = ActorType.Customer
    static Supplier = ActorType.Supplier
    static TypeInfo = ActorTypeInfo

    id?: number
    title?: string
    type?: ActorType

    static tableName = 'actor'
}
