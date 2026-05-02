namespace $.$$ {

	export class $bog_call_active extends $.$bog_call_active {

		_wake: any = null

		@$mol_mem
		mute(next?: boolean): boolean {
			const peer = this.peer() as $bog_call_peer | null
			if (next !== undefined) {
				if (peer) peer.muted(next)
				return next
			}
			return peer?.muted() ?? false
		}

		@$mol_mem
		quality(): string {
			const peer = this.peer() as $bog_call_peer | null
			if (!peer) return 'good'
			const cs = peer.connection_state()
			if (cs === 'connected') return 'good'
			if (cs === 'failed' || cs === 'closed') return 'lost'
			return 'degraded'
		}

		@$mol_mem
		connection_label(): string {
			const peer = this.peer() as $bog_call_peer | null
			const state = peer?.connection_state() ?? 'new'
			const labels: Record<string, string> = {
				'new': 'Подключение…',
				'connecting': 'Подключение…',
				'connected': 'На связи',
				'disconnected': 'Связь потеряна',
				'failed': 'Ошибка соединения',
				'closed': 'Звонок завершён',
			}
			return labels[state] ?? state
		}

		@$mol_mem
		quality_label(): string {
			const q = this.quality()
			if (q === 'good') return ''
			if (q === 'degraded') return 'Слабый сигнал'
			return 'Связь оборвана. Попробуйте новый QR-обмен.'
		}

		hangup(next?: any): any {
			if (next === undefined) return null
			const peer = this.peer() as $bog_call_peer | null
			peer?.hangup()
			this._release_wake()
			this.on_hangup(true)
			return null
		}

		@$mol_mem
		wake(): null {
			const lock = (navigator as any).wakeLock
			if (lock) {
				lock.request('screen').then((sentinel: any) => {
					this._wake = sentinel
				}).catch(() => { /* ignored */ })
			}
			return null
		}

		_release_wake() {
			if (this._wake && typeof this._wake.release === 'function') {
				this._wake.release().catch(() => { /* ignored */ })
			}
			this._wake = null
		}

		destructor() {
			this._release_wake()
			super.destructor()
		}

	}

}
