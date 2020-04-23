import Knex = require('knex');
import { makeKnex } from '../util/knex-integration'
import { Model } from 'objection'
import prepopulate from './prepopulate'

export class Project {
    // isModified: boolean
    static project: Project | undefined
    static database: sqlite.Database
    static knex: Knex

    constructor(public filename: string, public database: sqlite.Database, public knex: Knex) {
    }

    // The following functions create new in-memory database,
    // and load-to/save-from files
    static async create(): Promise<void> {
        const db = new sqlite.Database(':memory:')
        await db.open()
        try {
            const project = new Project('', db, makeKnex(':memory', db))
            await prepopulate(project.database, project.knex)
            Project.bind(project)
        }
        catch (e) {
            db.close()
            throw e
        }
    }

    static async open(filename: string): Promise<void> {        
        const srcDb = new sqlite.Database(`file:${filename}?mode=ro`)
        await srcDb.open()
        try {
            const newDb = await srcDb.backupTo(':memory:')
            const project = new Project(filename, newDb, makeKnex(filename, newDb))
            Project.bind(project)
        }
        finally {
            srcDb.close()
        }
    }

    static async close(): Promise<void> {
        const p = Project.project!
        Project.project = undefined
        p.filename = ''
        return p.database.close()
    }

    static async save(): Promise<boolean> {
        if (Project.project && Project.project.filename) {
            return Project.saveAs(Project.project.filename)
        }
        else {
            return Promise.reject('No filename specified')
        }
    }

    static async saveAs(filename: string): Promise<boolean> {
        await Project.database.exec('VACUUM')
        const destDb = await Project.database.backupTo(filename)
        destDb.close()
        return true
    }

    // Store references so other code can access them globally
    static bind(p: Project): void {
        Project.project = p
        Project.database = p.database
        Project.knex = p.knex
        Model.knex(p.knex)
    }
}
