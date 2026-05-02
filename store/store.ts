namespace $ {

	/** Recent peer encountered in a call */
	export class $bog_call_peer_record extends $giper_baza_entity.with({
		Device: $giper_baza_atom_text,
		Last: $giper_baza_atom_time,
	}) {}

	/** Local profile + recent peers, kept in home land */
	export class $bog_call_profile extends $giper_baza_entity.with({
		Device: $giper_baza_atom_text,
		Recent: $giper_baza_list_link_to(() => $bog_call_peer_record),
	}) {}

	export class $bog_call_store extends $mol_object {

		glob() {
			return this.$.$giper_baza_glob
		}

		home_land() {
			return this.glob().home().land()
		}

		profile() {
			return this.home_land().Data($bog_call_profile) as $bog_call_profile
		}

		device_id() {
			let id = this.profile().Device()?.val() ?? ''
			if (!id) {
				id = ($bog_call_random_id())
				this.profile().Device('auto')?.val(id)
			}
			return id
		}

		name(next?: string) {
			const profile = this.profile()
			if (next !== undefined) {
				profile.Title('auto')?.val(next)
				return next
			}
			return profile.Title()?.val() ?? ''
		}

		remember(device: string, name: string) {
			if (!device) return
			const recent = this.profile().Recent('auto')
			if (!recent) return
			const items = recent.remote_list() as $bog_call_peer_record[]
			const existing = items.find(r => r.Device()?.val() === device)
			const now = new $mol_time_moment()
			if (existing) {
				existing.Title('auto')?.val(name)
				existing.Last('auto')?.val(now)
				return
			}
			const rec = recent.make([[null, $giper_baza_rank_post('just')]]) as $bog_call_peer_record | null
			if (!rec) return
			rec.Device('auto')?.val(device)
			rec.Title('auto')?.val(name)
			rec.Last('auto')?.val(now)
		}

	}

	export function $bog_call_random_id() {
		const buf = new Uint8Array(8)
		crypto.getRandomValues(buf)
		return Array.from(buf, b => b.toString(16).padStart(2, '0')).join('')
	}

}
