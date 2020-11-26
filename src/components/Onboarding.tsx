/**
 * Copyright (c) 2020-present Beng Tan
 */

import * as React from 'react'
import { Link } from 'react-router-dom'
import { createHashHistory } from 'history'
import { Project, Transaction } from '../core'

type Action = 'init' | 'save-settings' | 'save-tax-settings' | 'save-a-sale' | 'save-file'

// Also functions as an enable/disable flag
let singleton: ((action: Action) => void) | undefined

export function refreshOnboarding(action: Action) {
    if (singleton) {
        singleton(action)
    }
}

type State = {
    savedSettings?: boolean
    savedTaxSettings?: boolean
    savedASale?: boolean
    savedFile?: boolean
    finished?: boolean
}

export default function Onboarding() {
    const [path, setPath] = React.useState<string>(window.location.hash.substring(1))
    const [state, setState] = React.useState<State>({})
    const [enabled, setEnabled] = React.useState<boolean>(false)

    React.useEffect(() => {
        refresh('init')
        const unListen = createHashHistory().listen(listener)

        return () => {
            unListen()
            singleton = undefined
        }
    }, [])

    function listener({location}: any) {
        if (Project.isOpen() && singleton) {
            setPath(location.pathname)
        }
    }

    // Returns a boolean flag which indicates whether onboarding has finished
    async function refresh(action: Action) {
        if (action == 'init' || singleton) {
            const newState: State = {}

            // See whether these variables were saved to the database
            const variables = await Project.knex('variable').select('name')
                .whereIn('name', ['title', 'taxAuthority', 'mru'])
            variables.forEach(row => {
                switch (row.name) {
                    case 'title': newState.savedSettings = true; break
                    case 'taxAuthority': newState.savedTaxSettings = true; break
                    case 'mru': newState.savedFile = true; break
                }
            })

            const counts = await Project.knex('txn').count('id as count')
                .whereIn('type', [Transaction.Sale, Transaction.Invoice])
            newState.savedASale = counts && counts[0] && counts[0].count > 0

            newState.finished = newState.savedASale! && newState.savedFile!
            setState(newState)

            if (action == 'init' && !newState.finished) {
                singleton = refresh
                setEnabled(true)    
            }

            // Disable refresh/listening
            if (newState.finished) {
                singleton = undefined
            }
        }
    }

    function dismiss() {
        singleton = undefined
        setEnabled(false)
    }

    return enabled ? <div className='onboarding'>
        {state.finished ? <div>
            <p>
                Done! Thank you for using Gig'o'Books! You can dismiss this now.
            </p><p>
                (If you encounter any problems or bugs, or you need a new feature, please let us know. We'd love to talk.)
            </p>
            <Dismiss onClick={dismiss} />
        </div> :

        state.savedASale ? <div>
            <p>
                Congratulations on entering your first sale!
            </p><p>
                Finally, save your data to a file: Open the <strong>File</strong> menu, select <strong>{__WEB__ ? 'Save' : 'Save as'}</strong> and follow through.
            </p>
            <Dismiss onClick={dismiss} />
        </div> :

        state.savedTaxSettings ? <div>
            <p>
                {path != '/sales/new' ? <span>
                    {path == '/settings/tax' && 'Awesome! '}After you have finished configuring your {path == '/settings/tax' ? 'tax settings' : <Link to='/settings/tax'>tax settings</Link>}, please go to <Link to='/sales/new'>Sales » New Sale</Link> to enter your first sale.
                </span> : <span>
                    Please enter your first sale.
                </span>}
            </p>
            <Dismiss onClick={dismiss} />
        </div> :

        state.savedSettings ? <div>
            <p>
                {path != '/settings/tax' ? <span>
                    {path == '/settings' && 'Great! '}Please go to <Link to='/settings/tax'>Company » Tax Settings</Link>, select your tax authority, and configure your tax settings.
                </span> : <span>
                    Please select your tax authority and configure your tax settings.
                </span>}
            </p>
        </div> :

        <div>
            <p>
                Welcome to Gig'o'Books! {path != '/settings' ? <span>
                    Please go to <Link to='/settings'>Company » Settings</Link> and fill in settings for your new company or project.
                </span> : <span>
                    Please fill in settings for your new company or project.
                </span>}
            </p>
        </div>}
    </div> : null
}

function Dismiss({onClick}: {onClick: () => void}) {
    return <div className='onboarding-dismiss'>
        <input type='submit' value='Dismiss' className='onboarding-dismiss-button' onClick={onClick} />
    </div>
}
