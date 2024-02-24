import { Adapter, DatabaseSession, DatabasePerson } from 'persontric'
import { generateRandomString, alphabet } from 'oslo/crypto'
import { equal } from 'uvu/assert'
export const database_person:DatabasePerson = {
	id: generateRandomString(15, alphabet('0-9', 'a-z')),
	attributes: {
		login: generateRandomString(15, alphabet('0-9', 'a-z'))
	}
}
export async function test_adapter(adapter:Adapter) {
	console.log(`\n\x1B[38;5;63;1m[start]  \x1B[0mRunning adapter tests\x1B[0m\n`)
	const databaseSession:DatabaseSession = {
		person_id: database_person.id,
		id: generateRandomString(40, alphabet('0-9', 'a-z')),
		// get random date with 0ms
		expire_dts: new Date(Math.floor(Date.now() / 1000) * 1000 + 10_000),
		attributes: {
			country: 'us'
		}
	}
	await test('session_person_pair_() returns [null, null] on invalid session id', async ()=>{
		const result = await adapter.session_person_pair_(databaseSession.id)
		equal(result, [null, null])
	})
	await test('person_session_all_() returns empty array on invalid user id', async ()=>{
		const result = await adapter.person_session_all_(database_person.id)
		equal(result, [])
	})
	await test('session__set() creates session and session_person_pair_() returns created session and associated user',
		async ()=>{
			await adapter.session__set(databaseSession)
			const result = await adapter.session_person_pair_(databaseSession.id)
			equal(result, [databaseSession, database_person])
		})
	await test('session__delete() deletes session', async ()=>{
		await adapter.session__delete(databaseSession.id)
		const result = await adapter.person_session_all_(databaseSession.person_id)
		equal(result, [])
	})
	await test('session_expiration__update() updates session', async ()=>{
		await adapter.session__set(databaseSession)
		databaseSession.expire_dts = new Date(databaseSession.expire_dts.getTime() + 10_000)
		await adapter.session_expiration__update(databaseSession.id, databaseSession.expire_dts)
		const result = await adapter.session_person_pair_(databaseSession.id)
		equal(result, [databaseSession, database_person])
	})
	await test('expired_session_all__delete() deletes all expired sessions', async ()=>{
		const expiredSession:DatabaseSession = {
			person_id: database_person.id,
			id: generateRandomString(40, alphabet('0-9', 'a-z')),
			expire_dts: new Date(Math.floor(Date.now() / 1000) * 1000 - 10_000),
			attributes: {
				country: 'us'
			}
		}
		await adapter.session__set(expiredSession)
		await adapter.expired_session_all__delete()
		const result = await adapter.person_session_all_(databaseSession.person_id)
		equal(result, [databaseSession])
	})
	await test('person_session_all__delete() deletes all user sessions', async ()=>{
		await adapter.person_session_all__delete(databaseSession.person_id)
		const result = await adapter.person_session_all_(databaseSession.person_id)
		equal(result, [])
	})
	console.log(`\n\x1B[32;1m[success]  \x1B[0mAdapter passed all tests\n`)
}
async function test(name:string, runTest:()=>Promise<void>):Promise<void> {
	console.log(`\x1B[38;5;63;1m► \x1B[0m${name}\x1B[0m`)
	try {
		await runTest()
		console.log('  \x1B[32m✓ Passed\x1B[0m\n')
	} catch (error) {
		console.log('  \x1B[31m✓ Failed\x1B[0m\n')
		throw error
	}
}
