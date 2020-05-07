import * as React from 'react'
import { Account, Actor } from '../core'

// Some utility functions to help with constructing select options

export function flatSelectOptions(items: any[]) {
    return <>
    {items.map(a => 
        <option key={a.id} value={a.id}>{a.title}</option>
    )}        
    </>
}

function groupedSelectOptions(groups: {[prop: string]: any[]}, groupInfo: {label: string}[]) {
    return <>
    {Object.keys(groups).map((g) => {
        if (groups[g].length > 0) {
            return <optgroup key={g} label={groupInfo[g as any].label}>
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
export function accountSelectOptions(accounts: Account[]) {
    const groups: any = {
        [Account.Asset]: [],
        [Account.Liability]: [],
        [Account.Equity]: [],
        [Account.Revenue]: [],
        [Account.Expense]: [],
    }

    // Distribute accounts into each 'bucket'
    for (let a of accounts) {
        groups[a.typeGroup].push(a)
    }

    return <>
        {groupedSelectOptions(groups, Account.TypeGroupInfo)}
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
