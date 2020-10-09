/**
 * Copyright (c) 2020-present Beng Tan
 */

/**
# String representation of tax codes

When written/represented as a string, a tax code comprises a tuple (colon delimited) of 3 or 4 parts:

<authority[;extra]>:<type[;flags-and-tags...]>:[rate]
<authority[;extra]>:<type[;flags-and-tags...]>:[variant]:[rate]

The first field, `authority`, indicates the tax authority or jurisdiction. It loosely corresponds to geographical area in a hierarchical form ie. `AT`, `AU`, `US-CA`, `CA-BC`, `IN-AP`, `CN-AH`, but this might not always be true.

(Country indicators are either EU VAT codes or ISO 3166-1 ish. State or subdivision indicators are ISO 3166-2-ish.)

For some cases (ie. EU MOSS), there is an `extra` authority value whose meaning is dependent on the tax authority or system. This is appended onto the end of `authority`, delimited by a semi-colon. Hence, the first field is either a single string 'authority' or a tuple 'authority;extra'

The second field is a tuple (semi-colon delimited) of 1 or more parts:

<type>[;flags-and-tags...]

The first part, `type`, is one of the following: `GST`, `VAT`, `ST` (sales tax) and, maybe in the future, some others.

`flags-and-tags` is a (semi-colon delimited) list of strings. Single character strings are flags and four-or-more character strings are tags. (Two or three character strings are reserved.)

To ensure a consistent canonical representation, the strings in `flags-and-tags`  are ordered as followed: 

* Single character strings first (in lexicographical order), then
* Multiple characters strings last (in lexicographical order)

A flag indicates a feature or modification. Multiple flags are supported.

Currently, two flags are defined: `r` and `x`.

The flag `r` indicates a reverse charge (ie. EU reverse charge) on a purchase
The flag `x` indicates that the tax rate can be modified/supplied/overridden by the user

A tag is any arbitrary four-or-more character string. The meaning of a tag is dependent on the tax authority or system albeit it's generally informational-only. At the moment, only up to one tag is supported.

The `variant` field is one of the following: `zero`, `reduced`, `super-reduced`, `parking` and others (see specific tax authorities). If `variant` is missing, then the standard/default rate is implied. Generally, `variant` is used to handle zero-ratings, (for EU VAT) multiple tax rates, and as a lighter-weight form of tagging.

The `rate` field is the tax rate percentage in string form, and can include up to three decimal places. This field is optional and can be empty.

Some examples:

`AT:VAT:20` - Austria VAT standard rate of 20%
`AT:VAT:reduced:10` - Austria VAT reduced rate of 10%
`AT:VAT:reduced:13` - Austria VAT reduced rate of 13%
`AT:VAT:parking:13` - Austria VAT parking rate of 13%
`FR:VAT:super-reduced:2.1` - France VAT super-reduced rate of 2.1%

'EL:VAT:24` - Greece VAT standard rate of 24% (Non-standard country code)
'UK:VAT:20` - UK VAT standard rate of 20% (Non-standard country code)

`FR:VAT:reverse:0` - France VAT reverse charge on a sale
`FR:VAT;r:20` - France VAT standard rate of 20% (reverse charge on own purchases)
`FR:VAT;r:super-reduced:2.1` - France VAT super-reduced rate of 2.1% (reverse charge on own purchases)

`IE:VAT;intra-eu;goods:23` - Ireland standard rate of 23%, A supply or acquisition of goods within the EU community.
`IE:VAT;r;intra-eu:23` - Ireland standard rate of 23% applied as a reverse charge on own purchase of a service from within the EU community.
`IE:VAT;export:zero:0` - Ireland zero-rated service, Exported outside of the EU community.

`IE--MOSS;FR:VAT:20` - France standard rate of 20% transmitted via Ireland's MOSS

`AU:GST:10` - Australia GST rate of 10%
`AU:GST:zero:0` - Australia GST free/zero-rated
`AU:GST;capital:10` - Australia GST rate of 10%, Capital purchase
`AU:GST;input:zero:0` - Australia zero-rated input taxed sale
`AU:GST;export:zero:0` - Australia zero-rated export

Possible future examples (these are tentative and not confirmed):

`US-CA:ST;x:7.25` - US California state tax of 7.25% (default)

`CA:GST:5` - Canada GST rate of 5%
`CA-BC:PST:7` - Canada British Columbia PST rate of 7%
`CA-MB:RST:7` - Canada British Columbia RST rate of 7%
`CA-ON:HST:13` - Canada Ontario HST of 13%
`CA-QC:QST:9.975` - Canada Quebec QST of 9.975%


# Other notes

A tax code which has no tags specified is also known as a base tax code.
*/

var iso3166 = require('iso-3166-2')
import { Project } from './Project'

// Since some tax rates have three decimal places, scale up by 1000 before calculating
const TaxRateScale = 1000
const TaxTypeLabel: Record<string, string> = {
    GST: 'GST',
    VAT: 'VAT',
    ST: 'Sales Tax'
}

export const euCountryCodes = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK',
    'EE', 'DE', 'EL', 'FI', 'FR', 'HU', 'IE', 'IT', 'LV', 'LT',
    'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
    'UK']

// `code` is a 'ISO 3166-1 or ISO 3166-2'-like string, or 'EU'
export function regionName(code: string) {
    const parts = (code || '').split('-')

    // Special cases
    if (parts[0] == 'EU') {
        return 'Europe'
    }
    else if (parts[0] == 'EL') {
        parts[0] = 'GR'
    }
    else if (parts[0] == 'UK') {
        parts[0] = 'GB'        
    }

    if (parts.length == 1 || parts[1] == '') {
        // country only
        const info = iso3166.country(parts[0])
        return info ? info.name : code
    }

    // country, subdivision
    const info = iso3166.subdivision(parts[0], parts[1])
    return info ? info.name : code
}

export function isEUAuthority(authority: string) {
    const root = authority.substring(0, 2)
    return root == 'EU' || euCountryCodes.indexOf(root) >= 0
}

export class TaxCodeInfo {
    authority: string
    geoParts: string[]
    authorityExtra: string
    type: string
    reverse: boolean
    variable: boolean
    tag: string
    variant: string
    rate: string

    constructor(code?: string) {
        const parts = (code || '').split(':')

        const authorityList = parts[0].split(';')
        this.authority = authorityList[0]
        this.geoParts = this.authority.split('-', 2)
        this.authorityExtra = authorityList.length < 2 ? '' : authorityList[1]

        const typeList = parts.length < 2 ? [''] : parts[1].split(';')
        this.type = ''
        this.reverse = false
        this.variable = false
        this.tag = ''

        typeList.forEach((s, index) => {
            if (index == 0) {
                this.type = s
            }
            else if (s == 'r') {
                this.reverse = true
            }
            else if (s == 'x') {
                this.variable = true
            }
            else if (s.length > 3) {
                this.tag = s
            }
        })

        this.variant = (parts.length < 4) ? '' : parts[2]
        this.rate = parts[parts.length - 1]
    }

    _code(includeTags: boolean) {
        const parts = []
        parts.push(this.authorityExtra ? `${this.authority};${this.authorityExtra}` : this.authority)

        const typeParts = [this.type]
        if (this.reverse) {
            typeParts.push('r')
        }
        if (this.variable) {
            typeParts.push('x')
        }
        if (includeTags && this.tag) {
            typeParts.push(this.tag)
        }
        parts.push(typeParts.join(';'))

        if (this.variant) {
            parts.push(this.variant)
        }

        parts.push(this.rate)
        return parts.join(':')
    }

    get taxCode() {
        return this._code(true)
    }

    get baseCode() {
        return this._code(false)
    }

    toString() {
        return this.taxCode
    }

    get taxAuthority() {
        // A clunky way to simulate inheritance
        return taxAuthorities[this.authority] || fallbackTaxAuthority
    }

    get info() {
        return this.taxAuthority.taxInfo(this)
    }

    get countryCode() {
        return this.geoParts[0]
    }

    get regionName() {
        return regionName(this.authority)
    }

    get isEU() {
        return isEUAuthority(this.authority)
    }

    get typeLabel() {
        return TaxTypeLabel[this.type] || this.type
    }

    get typeAndRateLabel() {
        return `${this.typeLabel} (${this.rate}%)`
    }

    get label() {
        const parts = [`${this.countryCode}:`, this.info.label]
        if (this.rate) {
            parts.push(this.rate + '%')
        }
        return parts.join(' ')
    }

    // A compact label for displaying in reports
    get reportLabel() {
        const parts = [this.info.shortLabel]
        if (this.tag) {
            parts.push(this.tag)
        }
        return parts.join('\n')
    }

    // Used for sorting taxes from the same authority
    get weight() {
        return this.info.weight
    }

    tagOptions(isSale: boolean) {
        return this.taxAuthority.tagOptions(Project.variables.get('taxAuthority'), isSale, this)
    }
}

type TaxInfo = {
    label: string
    shortLabel: string
    weight: number
}

type TaxSetting = {
    type: string
    label: string
    options?: Record<string, string>
}

export class TaxAuthority {
    readonly id: string
    readonly title: string
    readonly enable: boolean
    
    constructor(id: string, title: string, enable = false) {
        this.id = id
        this.title = title
        this.enable = enable
    }

    get regionName() {
        return regionName(this.id)
    }

    // These are stubs that should be overridden by subclasses
    settings(homeAuthority: string): Record<string, TaxSetting> { return {} }
    taxesInfo(): Record<string, TaxInfo> { return {} }
    taxes(homeAuthority: string, isSale: boolean): string[] { return [] }
    tagOptions(homeAuthority: string, isSale: boolean, info: TaxCodeInfo): Record<string, string> { return {} }

    taxInfo(info: TaxCodeInfo) {
        let k = info.type
        if (info.reverse) {
            k += ';r'
        }
        if (info.variant) {
            k += `:${info.variant}`
        }
        return this.taxesInfo()[k] || { label: info.taxCode, weight: 100 }
    }
}

export class TaxAuthorityAU extends TaxAuthority {
    settings(homeAuthority: string) {
        return {
            [`${this.id.toLowerCase()}:taxId`]: { type: 'text', label: 'ABN' },
            [`${this.id.toLowerCase()}:accrual`]: { type: 'select', label: 'Accounting method', options: { '': 'Cash', 'accrual': 'Non-cash' } },
        }
    }

    taxesInfo() {
        return {
            'GST': { label: 'GST', shortLabel: 'GST', weight: 0 },
            'GST:zero': { label: 'GST Free', shortLabel: 'GST Free', weight: 1 },
            'GST:export': { label: 'Export (GST Free)', shortLabel: 'Export', weight: 2 },
            'GST:input': { label: 'GST (input taxed)', shortLabel: 'Input', weight: 3 },
            'GST:capital': { label: 'GST (capital purchase)', shortLabel: 'Capital', weight: 4 },
        }
    }

    taxes(homeAuthority: string, isSale: boolean) {
        const common = ['GST:10', 'GST:zero:0', 'GST:input:0']
        const sale = ['GST:export:0']
        const purchase = ['GST:capital:0', 'GST:capital:10']

        const items = homeAuthority == this.id ? common.concat(isSale ? sale : purchase) : common
        return items.map(s => `${this.id}:${s}`)
    }
}

export class TaxAuthorityNZ extends TaxAuthority {
    settings(homeAuthority: string) {
        return {
            [`${this.id.toLowerCase()}:taxId`]: { type: 'text', label: 'GST' },
            [`${this.id.toLowerCase()}:accrual`]: { type: 'select', label: 'Accounting basis', options: { '': 'Payments basis', 'accrual': 'Invoice basis' } },
        }
    }

    taxesInfo() {
        return {
            'GST': { label: 'GST', shortLabel: 'GST', weight: 0 },
            'GST:zero': { label: 'GST (zero-rated)', shortLabel: '0-rated', weight: 1 },
        }
    }

    taxes(homeAuthority: string, isSale: boolean) {
        const items = ['GST:15', 'GST:zero:0']
        return items.map(s => `${this.id}:${s}`)
    }
}

export class TaxAuthorityEU extends TaxAuthority {
    /*
    settings(homeAuthority: string) {
        const fields: Record<string, TaxSetting> = {}
        fields[`${this.id.toLowerCase()}:taxId`] = { type: 'text', label: 'VAT ID' }

        if (this.id == 'IE') {
            fields[`${this.id.toLowerCase()}:cash`] = { type: 'checkbox', label: 'Cash receipts basis of accounting' }
        }

        return fields
    }
    */

    taxesInfo() {
        return {
            'VAT': { label: 'VAT (standard)', shortLabel: 'VAT', weight: 0 },
            'VAT:reduced': { label: 'VAT (reduced)', shortLabel: 'Reduced', weight: 1 },
            'VAT:super-reduced': { label: 'VAT (super reduced)', shortLabel: 'Super-r', weight: 2 },
            'VAT:parking': { label: 'VAT (parking)', shortLabel: 'Parking', weight: 3 },
            'VAT:zero': { label: 'VAT (zero-rated)', shortLabel: '0-rated', weight: 4 },
            'VAT;r': { label: 'VAT (reverse charge)', shortLabel: 'Reverse', weight: 5 },
            'VAT;r:reduced': { label: 'VAT (reverse charge)', shortLabel: 'Reverse', weight: 6 },
            'VAT;r:super-reduced': { label: 'VAT (reverse charge)', shortLabel: 'Reverse', weight: 7 },
            'VAT;r:parking': { label: 'VAT (reverse charge)', shortLabel: 'Reverse', weight: 8 },
            'VAT;r:zero': { label: 'VAT (reverse charge)', shortLabel: 'Reverse', weight: 9 },
            'VAT:reverse': { label: 'VAT (reverse charge)', shortLabel: 'Reverse', weight: 10 },
        }
    }

    taxes(homeAuthority: string, isSale: boolean) {
        const rates = taxRatesEU[this.id]
        const items: string[] = []

        // common
        rates.forEach(s => {
            items.push(`${this.id}:VAT:${s}`)
        })
        items.push(`${this.id}:VAT:zero:0`)

        // reverse charges
        if (isSale) {
            // reverse charge sale
            items.push(`${this.id}:VAT:reverse:0`)
        }
        else if (homeAuthority == this.id) {
            // reverse charge purchase
            rates.forEach(s => {
                items.push(`${this.id}:VAT;r:${s}`)
            })
            items.push(`${this.id}:VAT;r:zero:0`)
        }
        return items
    }

    tagOptions(homeAuthority: string, isSale: boolean, info: TaxCodeInfo) {
        return isEUAuthority(homeAuthority) ? {
            'eu-goods': `Intra-EU goods`,
            'eu-service': `Intra-EU service`,
            [isSale ? 'export' : 'import']: isSale ? 'Export out of EU' : 'Import into EU'
        } : {} as any
    }
}

const fallbackTaxAuthority = new TaxAuthority('', '', false)

export const taxAuthorities: Record<string, TaxAuthority> = {
    'AT': new TaxAuthorityEU('AT', 'Federal Ministry of Finance'),
    'AU': new TaxAuthorityAU('AU', 'Australian Tax Office', true),
    'BE': new TaxAuthorityEU('BE', 'Ministry of Finance'),
    'BG': new TaxAuthorityEU('BG', 'National Revenuue Agency'),
    'HR': new TaxAuthorityEU('HR', 'Ministry of Finance'),
    'CY': new TaxAuthorityEU('CY', 'Ministry of Finance'),
    'CZ': new TaxAuthorityEU('CZ', 'Development of Taxpayer Services Unit'),
    'DK': new TaxAuthorityEU('DK', 'Danish Customs and Tax Administration'),
    'EE': new TaxAuthorityEU('EE', 'Tax and Customs Board'),
    'DE': new TaxAuthorityEU('DE', 'Federal Ministry of Finance'),
    'EL': new TaxAuthorityEU('EL', 'Independent Authority for Public Revenue'),
    'FI': new TaxAuthorityEU('FI', 'Finnish Tax Administration'),
    'FR': new TaxAuthorityEU('FR', 'Ministry of Action and public accounts'),
    'HU': new TaxAuthorityEU('HU', 'National Tax and Customs Administration'),
    'IE': new TaxAuthorityEU('IE', 'Irish Tax and Customs', true),
    'IT': new TaxAuthorityEU('IT', 'Ministry of Economy and Finance'),
    'LV': new TaxAuthorityEU('LV', 'State Revenue Service'),
    'LT': new TaxAuthorityEU('LT', 'Ministry of Finance'),
    'LU': new TaxAuthorityEU('LU', 'Administration for registration, domains and VAT'),
    'MT': new TaxAuthorityEU('MT', 'Ministry of Finance'),
    'NL': new TaxAuthorityEU('NL', 'Dutch Tax and Customs Administration'),
    'NZ': new TaxAuthorityNZ('NZ', 'Inland Revenue Department', true),
    'PL': new TaxAuthorityEU('PL', 'Ministry of Finance'),
    'PT': new TaxAuthorityEU('PT', 'Tax and Customs Authority'),
    'RO': new TaxAuthorityEU('RO', 'Ministry of Public Finance'),
    'SK': new TaxAuthorityEU('SK', 'Financial Administration of Slovak Republic'),
    'SI': new TaxAuthorityEU('SI', 'Financial Administration of the Republic of Slovenia'),
    'ES': new TaxAuthorityEU('ES', 'Tax Agency'),
    'SE': new TaxAuthorityEU('SE', 'Swedish Tax Agency'),
    'UK': new TaxAuthorityEU('UK', 'HM Revenue and Customs', true),
}

// Return a list of tax authority IDs which are selected/configured,
// The home authority, if configured, appears first
export function activeTaxAuthorities() {
    return [Project.variables.get('taxAuthority'), ...Project.variables.get('otherTaxAuthorities')].filter(k => {
        return taxAuthorities[k] && taxAuthorities[k].enable
    })
}

export function hasActiveTaxAuthority() {
    return activeTaxAuthorities().length > 0
}

export const taxRatesEU: Record<string, string[]> = {
    AT: ['20', 'reduced:10', 'reduced:13', 'parking:13'],
    BE: ['21', 'reduced:6', 'reduced:12', 'parking:12'],
    BG: ['20', 'reduced:9'],
    HR: ['25', 'reduced:5', 'reduced:13'],
    CY: ['19', 'reduced:5', 'reduced:9'],
    CZ: ['21', 'reduced:10', 'reduced:15'],
    DK: ['25'],
    EE: ['20', 'reduced:9'],
    DE: ['19', 'reduced:7'],
    EL: ['24', 'reduced:6', 'reduced:13'],
    FI: ['24', 'reduced:10', 'reduced:14'],
    FR: ['20', 'reduced:5.5', 'reduced:10', 'super-reduced:2.1'],
    HU: ['27', 'reduced:5', 'reduced:18'],
    IE: ['23', 'reduced:9', 'reduced:13.5', 'super-reduced:4.8', /*'parking:13.5'*/],
    IT: ['22', 'reduced:5', 'reduced:10', 'super-reduced:4'],
    LV: ['21', 'reduced:12', 'super-reduced:5'],
    LT: ['21', 'reduced:5', 'reduced:9'],
    LU: ['17', 'reduced:8', 'super-reduced:3', 'parking:14'],
    MT: ['18', 'reduced:5', 'reduced:7'],
    NL: ['21', 'reduced:9'],
    PL: ['23', 'reduced:5', 'reduced:8'],
    PT: ['23', 'reduced:6', 'reduced:13', 'parking:13'],
    RO: ['19', 'reduced:5', 'reduced:9'],
    SK: ['20', 'reduced:10'],
    SI: ['22', 'reduced:9.5'],
    ES: ['21', 'reduced:10', 'super-reduced:4'],
    SE: ['25', 'reduced:6', 'reduced:12'],
    UK: ['20', 'reduced:5'],
}

/*
export function taxCodesUS() {
    const data: Record<string, string> = {
        AL: '4', AZ: '5.6', AR: '6.5', CA: '7.25', CO: '2.9', CT: '6.35',
        FL: '6', GA: '4', HI: '4.166', ID: '6', IL: '6.25', IN: '7',
        IA: '6', KS: '6.5', KY: '6', LA: '4.45', ME: '5.5', MD: '6',
        MA: '6.25', MI: '6', MN: '6.875', MS: '7', MO: '4.225', NE: '5.5', 
        NV: '6.85', NJ: '6.625', NM: '5.125', NY: '4', NC: '4.75', ND: '5', 
        OH: '5.75', OK: '4.5', PA: '6', RI: '7', SC: '6', SD: '4',
        TN: '7', TX: '6.25', UT: '5.95', VT: '6', VA: '5.3', WA: '6.5',
        WV: '6', WI: '5', WY: '4', DC: '5.75',
        GU: '4', PR: '10.5',
    }
    const codes: string[] = []

    Object.keys(data).forEach(ss => {
        codes.push(`US-${ss}:ST;x:${data[ss]}`)
    })

    return codes
}

export function taxCodesCA() {
    return [
        'CA:GST:5',
        // 'CA-AB',
        'CA-BC:PST:7',
        'CA-MB:RST:7',
        'CA-NB:HST:15' ,
        'CA-NL:HST:15' ,
        'CA-NS:HST:15' ,
        'CA-ON:HST:13' ,
        'CA-PE:HST:15' ,
        'CA-QC:QST:9.975',
        'CA-SK:PST:6',
        // 'CA-NT',
        // 'CA-NU',
        // 'CA-YT',
    ]
}
*/

// Return an array of base tax codes
export function baseTaxCodes(isSale: boolean) {
    const homeAuthority = Project.variables.get('taxAuthority')
    const codes: string[] = []

    ;[homeAuthority, ...Project.variables.get('otherTaxAuthorities')].forEach(k => {
        if (taxAuthorities[k] && taxAuthorities[k].enable) {
            codes.push(...taxAuthorities[k].taxes(homeAuthority, isSale))
        }
    })
    // Remove duplicates
    return [...new Set(codes)]
}

export type TaxInputs = {
    amount: number
    useGross: number
    rates: string[]
}

export type TaxOutputs = {
    amount: number
    taxes: number[]
}

// Given a (gross or net) amount and a list of tax rates, calculate the corresponding
// (net or gross) amount and a list of tax amounts.
// `useGross` indicates whether the input amount is gross or net.
// `rates` is a list of tax rate percentages. Each tax rate is expressed as a string.
// Tax amounts are rounded to an integer
//
// Hack: If a tax rate starts with a `#`, it doesn't contribute to net/gross calculations
export function calculateTaxes(input: TaxInputs): TaxOutputs {
    const taxes: number[] = []
    let amount = input.amount

    const rates: {rate000: number, additive: boolean}[] = []
    for (let r of input.rates) {
        let rate000 = parseFloat(r && r[0] == '#' ? r.substring(1) : r) * TaxRateScale
        if (Number.isNaN(rate000) || rate000 < 0) {
            rate000 = 0
        }
        rates.push({rate000, additive: !r || r[0] != '#'})
    }

    if (input.useGross) {
        // gross -> net
        const total000 = rates.reduce((subTotal, info) => {
            return info.additive ? subTotal + info.rate000 : subTotal
        }, 0)

        rates.forEach(info => {
            const taxAmount = Math.round((input.amount * info.rate000) / (100 * TaxRateScale + total000))
            taxes.push(taxAmount)

            if (info.additive) {
                amount -= taxAmount
            }
        })
    }
    else {
        // net -> gross
        rates.forEach(info => {
            const taxAmount = Math.round((input.amount * info.rate000) / (100 * TaxRateScale))
            taxes.push(taxAmount)

            if (info.additive) {
                amount += taxAmount
            }
        })
    }

    return {amount, taxes}
}
