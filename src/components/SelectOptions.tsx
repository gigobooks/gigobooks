import * as React from 'react'
import * as CurrencyCodes from 'currency-codes'
import { Account, Actor, Project } from '../core'

// A thin wrapper around <select /> with the following optimisation:
// If only one option is available, then set to disabled so it does not receive focus
export class MaybeSelect extends React.Component<any> {
    count: number

    constructor(props: any) {
        super(props)
        this.count = 0
        this.countOptions(this.props)
    }

    countOptions(props: any) {
        const children = props.children
        if (Array.isArray(children)) {
            children.filter((child: any) => {
                if (child.type && child.type == 'option') {
                    this.count++
                }
                else if (child.props && child.props.children) {
                    this.countOptions(child.props)
                }
            })
        }
        else if (children.props && children.props.children) {
            this.countOptions(children.props)
        }
    }

    render() {
        const {forwardRef, ...rest} = this.props
        return <select disabled={this.count <= 1} ref={forwardRef} {...rest} />
    }
}

export function flatSelectOptions(items: any[]) {
    return <>
    {items.map(a => 
        <option key={a.id} value={a.id}>{a.title}</option>
    )}        
    </>
}

function groupedSelectOptions(groups: {[key: string]: any[]}, groupInfo: {[key: string]: {label: string}}) {
    return <>
    {Object.keys(groups).map((g) => {
        if (groups[g].length > 0) {
            return <optgroup key={g} label={groupInfo[g].label}>
                {flatSelectOptions(groups[g])}
            </optgroup>
        }
        else {
            return null
        }        
    })}
    </>
}

// Given a list of accounts, constructs a nested list of select options
export function accountSelectOptions(accounts: Account[], 
    groupInfo: {[key: string]: {label: string}} = Account.TypeGroupInfo) {
    const groups: {[key: string]: Account[]} = {}
    for (let k in groupInfo) {
        groups[k] = []
    }

    // Distribute accounts into each 'bucket'
    for (let a of accounts) {
        if (Array.isArray(groups[a.typeGroup])) {
            groups[a.typeGroup].push(a)
        }
    }

    return <>
        {groupedSelectOptions(groups, groupInfo)}
    </>
}

export function actorSelectOptions(actors: Actor[], optional = true) {
    const groups: any = {
        [Actor.Customer]: [],
        [Actor.Supplier]: [],
    }

    for (let a of actors) {
        groups[a.type!].push(a)
    }

    return <>
        {optional && <option key={0} value={0}>None</option>}
        {groupedSelectOptions(groups, Actor.TypeInfo)}
    </>
}

// Returns a list of ALL currency select options, with the supplied values at the top
export function currencySelectOptionsAll(currencies: string[] = []) {
    const selected: CurrencyCodes.CurrencyCodeRecord[] = []
    const rest: CurrencyCodes.CurrencyCodeRecord[] = []

    CurrencyCodes.data.forEach(c => {
        if (c.code.startsWith('X')) {
            // Omit any codes starting with X.
            return
        }
        else if (currencies.indexOf(c.code) >= 0) {
            selected.push(c)
        }
        else {
            rest.push(c)
        }
    })

    return <>
        {[...selected, ...rest].map(c =>
            <option key={c.code} value={c.code}>{c.code} - {c.currency}</option>
        )}
    </>
}

// Returns a list of enabled currency select options.
// If the supplied currency is not in the list, it is added
export function currencySelectOptions(currency?: string) {
    const currencies: string[] = Project.variables.get('otherCurrencies')
    currencies.push(Project.variables.get('currency'))

    // Inject currency if not exists
    if (currency && currencies.indexOf(currency) == -1) {
        currencies.push(currency)
    }

    return <>
        {currencies.sort().map(c =>
            <option key={c} value={c}>{c}</option>
        )}
    </>
}
