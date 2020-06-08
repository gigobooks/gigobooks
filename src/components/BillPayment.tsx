import * as React from 'react'
import { Controller, useForm, useFieldArray, FormContextValues as FCV } from 'react-hook-form'
import DatePicker from 'react-datepicker'
import { TransactionOrKnex, Model,
    Transaction, Account, IElement,
    dateFormatString as dfs, toDateOnly, parseISO, lastSavedDate,
    toFormatted, parseFormatted } from '../core'
import { playSuccess, playAlert } from '../util/sound'
import { MaybeSelect, currencySelectOptions } from './SelectOptions'

type Props = {
    transaction: Transaction
}

type FormData = {
    payments: {
        tId?: number
        date: Date
        description?: string
        amount: string
        currency: string
        submit?: string    // Only for displaying general submit error messages
    }[]
    index: number
}

export default function BillPayment(props: Props) {
    const transaction = props.transaction
    const [settlements, setSettlements] = React.useState<Transaction[]>([])

    const form = useForm<FormData>()
    const {fields} = useFieldArray({control: form.control, name: 'payments'})

    // Initialise
    React.useEffect(() => {
        let mounted = true

        Transaction.query().where('type', Transaction.BillPayment)
        .where(transaction.settlements()).orderBy(['date', 'id'])
        .withGraphFetched('elements')
        .then(rows => {
            if (mounted) {
                setSettlements(rows)
                form.reset(extractFormValues(transaction, rows))    
            }
        })

        return () => {mounted=false}
    }, [transaction.updatedAt])

    const onSubmit = (data: FormData) => {
        if (!validateFormData(form, data)) {
            playAlert()
            return
        }

        Model.transaction(trx => saveFormData(trx, transaction!, settlements, data)).then(savedId => {
            if (savedId) {
                playSuccess()
                form.reset(extractFormValues(transaction, settlements))
            }
        }).catch(e => {
            playAlert()
            form.setError(`payments[${data.index}].submit`, '', e.toString())
        })
    }

    if (settlements) {
        const paymentsForm = <div>
            <h2>Payments</h2>
            <form>
                <table><thead>
                    <tr><th>
                        Id
                    </th><th>
                        Date
                    </th><th>
                        Description
                    </th><th>
                        Amount
                    </th><th>
                        &nbsp;
                    </th></tr>
                </thead><tbody>
                {fields.map((item, index) => {
                    function keyboardSubmit(e: React.KeyboardEvent) {
                        if (e.key == 'Enter') {
                            form.setValue('index', index)
                            form.handleSubmit(onSubmit)()    
                        }
                    }

                    return <tr key={item.id}><td>
                        {item.tId}
                        <input type='hidden' name={`payments[${index}].tId`} value={item.tId} ref={form.register()} />
                    </td><td>
                        <Controller
                            // No-op for DatePicker.onChange()
                            as={<DatePicker dateFormat={dfs()} onChange={() => {}} />}
                            control={form.control}
                            register={form.register()}
                            name={`payments[${index}].date`}
                            valueName='selected'
                            onChange={([selected]) => selected}
                            />
                        {form.errors.payments && form.errors.payments[index] && 
                            form.errors.payments[index].date &&
                            <div>{form.errors.payments[index].date!.message}</div>}
                    </td><td>
                        <input
                            name={`payments[${index}].description`}
                            defaultValue={item.description}
                            ref={form.register()}
                            onKeyPress={keyboardSubmit}
                        />
                    </td><td>
                        <MaybeSelect
                            name={`payments[${index}].currency`}
                            defaultValue={item.currency}
                            forwardRef={form.register()}>
                            {currencySelectOptions(item.currency)}
                        </MaybeSelect>
                        <input
                            name={`payments[${index}].amount`}
                            defaultValue={item.amount}
                            ref={form.register()}
                            onKeyPress={keyboardSubmit}
                        />
                        {form.errors.payments && form.errors.payments[index] && 
                            form.errors.payments[index].amount &&
                            <div>{form.errors.payments[index].amount!.message}</div>}
                    </td><td>
                        <input
                            type='button'
                            name={`payments[${index}].submit`}
                            value={item.tId ? 'Save' : 'New payment'}
                            onClick={() => {
                                form.setValue('index', index)
                                form.handleSubmit(onSubmit)()
                            }}
                        />
                        {form.errors.payments && form.errors.payments[index] && 
                            form.errors.payments[index].submit &&
                            <div>{form.errors.payments[index].submit!.message}</div>}
                    </td></tr>
                })}
                </tbody></table>
                <input type='hidden' name='index' ref={form.register} />
            </form>
        </div>

        // Collect all the entries to AccountsPayable together and calculate
        // the unpaid portion of the bill.
        const allElements: IElement[] = []
        const allTransactions = [transaction, ...settlements]
        allTransactions.forEach(t => allElements.push(...t.elements!))
        const balances = Transaction.getCreditBalances(allElements.filter(
            e => e.accountId == Account.Reserved.AccountsPayable))

        const balancesPane = <div>
            <h2>Balance</h2>
            <table><tbody>
            {Object.keys(balances).map(currency =>
                <tr key={currency}><td>
                    Balance ({currency}):
                </td><td>
                    {toFormatted(balances[currency], currency)}
                </td></tr>
                )}
            </tbody></table>
        </div>

        return <>
            {paymentsForm}
            {balancesPane}
        </>
    }

    return null
}

function extractFormValues(transaction: Transaction, settlements: Transaction[]): FormData {
    const values: FormData = {
        payments: [],
        index: 0,
    }

    settlements.forEach(s => {
        s.elements!.forEach(e => {
            if (e.drcr == Transaction.Debit && e.accountId == Account.Reserved.AccountsPayable) {
                values.payments.push({
                    tId: s.id,
                    date: parseISO(s.date!),
                    description: s.description,
                    amount: toFormatted(e.amount!, e.currency!),
                    currency: e.currency!,
                })    
            }
        })
    })

    values.payments.push({
        date: lastSavedDate(),
        amount: '',
        currency: transaction.elements![0].currency!
    })

    return values
}

// Returns true if validation succeeded, false otherwise
function validateFormData(form: FCV<FormData>, data: FormData) {
    if (!data.payments[data.index].date) {
        form.setError(`payments[${data.index}].date`, '', 'Date is required')
        return false
    }

    try {
        parseFormatted(data.payments[data.index].amount, data.payments[data.index].currency)
    }
    catch (e) {
        form.setError(`payments[${data.index}].amount`, '', 'Invalid amount')
        return false
    }

    return true
}

// Returns: id of the payment/transaction that was saved/created, 0 otherwise
async function saveFormData(trx: TransactionOrKnex, transaction: Transaction, 
    settlements: Transaction[], data: FormData): Promise<number> {

    const item = data.payments[data.index]
    const amount = parseFormatted(item.amount, item.currency)
    if (item.tId) {
        // Modify an existing payment transaction
        const payment = settlements[data.index]
        payment.description = item.description
        payment.date = toDateOnly(item.date)

        const elements: IElement[] = [{
            id: payment.getFirstDrElement()!.id,
            accountId: Account.Reserved.AccountsPayable,
            drcr: Transaction.Debit,
            amount,
            currency: item.currency,
            settleId: transaction.id
        }, {
            id: payment.getFirstCrElement()!.id,
            accountId: Account.Reserved.Cash,
            drcr: Transaction.Credit,
            amount,
            currency: item.currency,
            // no settleid needed here 
        }]

        // Merge and save.
        await payment.mergeElements(elements)
        await payment.save(trx)
        payment.condenseElements()

        return payment.id!
    }
    else if (amount > 0) {
        // Create a new payment transaction
        const payment = Transaction.construct({
            description: item.description,
            type: Transaction.BillPayment,
            date: toDateOnly(item.date),
            actorId: transaction.actorId,
        })

        const elements: IElement[] = [{
            accountId: Account.Reserved.AccountsPayable,
            drcr: Transaction.Debit,
            amount,
            currency: item.currency,
            settleId: transaction.id
        }, {
            accountId: Account.Reserved.Cash,
            drcr: Transaction.Credit,
            amount,
            currency: item.currency,
            // no settleid needed here 
        }]

        // Merge and save.
        await payment.mergeElements(elements)
        await payment.save(trx)
        payment.condenseElements()

        settlements.push(payment)
        return payment.id!
    }
    else {
        return Promise.reject('No amount specified')
    }
}
