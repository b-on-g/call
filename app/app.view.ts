namespace $.$$ {

	export class $bog_call_app extends $.$bog_call_app {

		_peer: $bog_call_peer | null = null

		@$mol_mem
		screen(next?: string): string {
			return $mol_state_arg.value('s', next) ?? 'home'
		}

		@$mol_mem
		store() {
			return new $bog_call_store()
		}

		peer(): $bog_call_peer {
			if (!this._peer) this._peer = new $bog_call_peer()
			return this._peer
		}

		@$mol_mem
		name(next?: string): string {
			const store = this.store()
			if (next !== undefined) {
				store.name(next)
				return next
			}
			return store.name()
		}

		open_host(next?: any): any {
			if (next === undefined) return null
			this.screen('host')
			return null
		}

		open_guest(next?: any): any {
			if (next === undefined) return null
			this.screen('guest')
			return null
		}

		goto_home(next?: any): any {
			if (next === undefined) return null
			this._peer?.hangup()
			this._peer = null
			this.screen('home')
			return null
		}

		goto_active(next?: any): any {
			if (next === undefined) return null
			this.screen('active')
			return null
		}

		@$mol_mem
		screen_body(): readonly $mol_view[] {
			const screen = this.screen()
			if (screen === 'host') return [this.Host()]
			if (screen === 'guest') return [this.Guest()]
			if (screen === 'active') return [this.Active()]
			return [this.Menu()]
		}

	}

}
