/**
 * Copyright (c) 2020-present Beng Tan
 */

var iso3166 = require('iso-3166-2')
import * as React from 'react'
import * as CurrencyCodes from 'currency-codes'
import { Account, Actor, Project, TaxCode, baseTaxCodes } from '../core'
import { orderByField } from '../util/util'

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

export function countryOptions() {
    const data: Record<string, {
        name: string,
        sub: Record<string, {type: string, name: string}>
    }> = iso3166.data
    const items: {id: string, title: string}[] = []

    Object.keys(data).forEach(id => {
        items.push({id, title: data[id].name})
    })

    return flatSelectOptions(items.sort(orderByField('title')))
}

export function countrySubdivisionOptions(countryCode: string) {
    const data: Record<string, {
        name: string,
        sub: Record<string, {type: string, name: string}>
    }> = iso3166.data
    const items: {id: string, title: string}[] = []

    const country = data[countryCode]
    if (country) {
        Object.keys(country.sub).forEach(id => {
            items.push({id, title: country.sub[id].name})
        })
    }

    return flatSelectOptions(items.sort(orderByField('title')))
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

function prefixLabel(prefix0: string): string {
    // Convert 'EL' to 'GR, 'UK' to 'GB'
    const prefix = prefix0 == 'EL' ? 'GR' :
                   prefix0 == 'UK' ? 'GB' : prefix0
    const countryInfo = iso3166.country(prefix)
    return countryInfo ? countryInfo.name : prefix
}

// Returns a list of enabled tax code select options.
// If the supplied tax code is not in the list, it is added
export function taxSelectOptions(isSale: boolean, code0?: string, optional = true) {
    const codes0 = baseTaxCodes(isSale)
    if (code0 && codes0.indexOf(code0) == -1) {
        codes0.push(code0)
        // codes0.push(new TaxCode(code0).baseCode)
        // Also ToDo: Duplication?
    }

    const codes = codes0.map(code => new TaxCode(code))
    codes.sort(function (a, b) {
        if (a.geoParts[0] == b.geoParts[0]) {
            if (a.geoParts.length == b.geoParts.length) {
                if (a.geoParts.length > 1 && a.geoParts[1] != b.geoParts[1]) {
                    return a.geoParts[1] < b.geoParts[1] ? -1 : 1
                }
                if (a.weight == b.weight) {
                    // Reversed so tax rates are descending
                    return Number(a.rate) > Number(b.rate) ? -1 : 1
                }
                return a.weight < b.weight ? -1 : 1
            }
            return a.geoParts.length - b.geoParts.length
        }
        return a.geoParts[0] < b.geoParts[0] ? -1 : 1
    })

    // Distribute to 'buckets'
    const groups: Record<string, TaxCode[]> = {}
    const other: TaxCode[] = []
    codes.forEach(info => {
        const prefix = info.isEU ? info.geoParts[1] : info.geoParts[0]
        if (prefix) {
            groups[prefix] = groups[prefix] || []
            groups[prefix].push(info)
        }
        else {
            other.push(info)
        }
    })

    return <>
        {optional && <option key='' value=''>None</option>}
        {other.map(info =>
            <option key={info.taxCode} value={info.taxCode}>{info.label}</option>
        )}
        {Object.keys(groups).sort().map(prefix => {
            if (groups[prefix].length == 1 && groups[prefix][0].geoParts.length == 1) {
                const info = groups[prefix][0]
                return <option key={info.taxCode} value={info.taxCode}>{info.label}</option>
            }
            else {
                return <optgroup key={prefix} label={prefixLabel(prefix)}>
                {groups[prefix].map(info =>
                    <option key={info.taxCode} value={info.taxCode}>{info.label}</option>
                )}
                </optgroup>
            }
        })}
    </>
}
