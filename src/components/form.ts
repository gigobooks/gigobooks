/**
 * Copyright (c) 2020-present Beng Tan
 */

// Some common functions that relate to forms.

import { toFormatted, parseFormatted, calculateTaxes } from '../core'

export type CalculateTaxState = {
    formatted: string
    setFormatted: (formatted: string) => void
    grossFormatted: string
    setGrossFormatted: (grossFormatted: string) => void
    useGross: number
    setUseGross: (useGross: number) => void
    currency: string
    setCurrency: (currency: string) => void
    rates: string[]
    setRates: (rates: string[]) => void
}

export function formCalculateTaxes(
    form: { setValue: (k: string, v: any) => void },
    prefix: string,
    state: CalculateTaxState,
    source: string) {
    let inFormatted, outField, inAmount: number

    if (source == 'amount') {
        inFormatted = state.formatted
        outField = 'grossAmount'
    }
    else if (source == 'grossAmount') {
        inFormatted = state.grossFormatted
        outField = 'amount'
    }
    else {
        inFormatted = state.useGross ? state.grossFormatted : state.formatted
        outField = state.useGross ? 'amount' : 'grossAmount'
    }

    if (inFormatted != undefined && inFormatted != '') {
        // Validate amount/grossAmount.
        let valid = true
        try {
            inAmount = parseFormatted(inFormatted, state.currency)
        }
        catch (e) {
            valid = false
        }

        if (valid) {
            const outputs = calculateTaxes({
                amount: inAmount!,
                useGross: state.useGross,
                rates: state.rates,
            })

            form.setValue(`${prefix}.${outField}`, toFormatted(outputs.amount, state.currency))
            for (let i in state.rates) {
                form.setValue(`${prefix}.taxes[${i}].amount`, 
                    (state.rates[i] != '' && outputs.taxes[i] != undefined) ?
                    toFormatted(outputs.taxes[i], state.currency) : '')
            }
        }
    }
    else {
        form.setValue(`${prefix}.${outField}`, '')
        for (let i in state.rates) {
            form.setValue(`${prefix}.taxes[${i}].amount`, '')
        }
    }

    // Set state
    switch (source) {
        case 'currency': state.setCurrency(state.currency); break
        case 'amount': state.setFormatted(state.formatted); break
        case 'grossAmount':
            state.setGrossFormatted(state.grossFormatted);
            state.setUseGross(state.useGross);
            break
        case 'rates': state.setRates(state.rates); break
    }
}
