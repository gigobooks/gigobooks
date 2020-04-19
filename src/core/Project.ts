import { makeKnex } from '../util/knex-integration'
import { Model } from 'objection'
import prepopulate from './prepopulate'

export class Project {
    isModified: boolean

    constructor(public filename: string, public database: sqlite.Database, public knex?: any) {
        this.isModified = false
    }

    // The following functions create new in-memory database,
    // and load-to/save-from files
    static async create(): Promise<Project> {
        const project = new Project('', new sqlite.Database(':memory:'))
        await project.database.open()
        try {
            project.knex = makeKnex(':memory:', project.database)
            await prepopulate(project.database, project.knex)
            Project.bind(project)
            Model.knex(project.knex)
            project.isModified = true
        }
        catch (e) {
            project.database.close()
            throw e
        }
        return project
    }

    static async open(filename: string): Promise<Project> {        
        const srcDb = new sqlite.Database(`file:${filename}?mode=ro`)
        await srcDb.open()
        try {
            const newDb = await srcDb.backupTo(':memory:')
            const project = new Project(filename, newDb, makeKnex(filename, newDb))
            Project.bind(project)
            Model.knex(project.knex)
            return project
        }
        finally {
            srcDb.close()
        }
    }

    close(): Promise<void> {
        this.filename = ''
        this.isModified = false
        return this.database.close()
    }

    async save(): Promise<boolean> {
        return this.filename ? this.saveAs(this.filename) : false
    }

    async saveAs(filename: string): Promise<boolean> {
        await this.database.exec('VACUUM')
        const destDb = await this.database.backupTo(filename)
        this.isModified = false
        destDb.close()
        return true
    }

    // Store references to a database/knex so other code can use them globally
    static database: sqlite.Database
    static knex: any
    static bind(p: Project): void {
        Project.database = p.database
        Project.knex = p.knex
    }
}
