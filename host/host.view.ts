namespace $.$$ {

	export class $bog_call_host extends $.$bog_call_host {

		_frames: Map<number, string> = new Map()

		@$mol_mem
		manual_visible(next?: boolean): boolean {
			return next ?? false
		}

		@$mol_mem
		manual_text(next?: string): string {
			return next ?? ''
		}

		@$mol_mem
		ingested_count(next?: number): number {
			return next ?? 0
		}

		@$mol_mem
		total_frames(next?: number): number {
			return next ?? 0
		}

		@$mol_mem
		frames_share() {
			const peer = this.peer() as $bog_call_peer | null
			const store = this.store() as $bog_call_store | null
			if (!peer || !store) return []
			const sdp = $mol_wire_sync(peer).create_offer() as unknown as string
			return $bog_call_codec.encode({
				v: 1,
				t: 'offer',
				s: sdp,
				n: store.name(),
				d: store.device_id(),
			})
		}

		@$mol_mem
		scan_status(): string {
			const total = this.total_frames()
			if (total === 0) return ''
			return `${this.ingested_count()} / ${total}`
		}

		@$mol_mem
		scan_error(next?: string): string {
			return next ?? ''
		}

		on_scan_decode(next?: string): string {
			if (next) this._ingest_frame(next)
			return next ?? ''
		}

		toggle_manual(next?: any): any {
			if (next === undefined) return null
			this.manual_visible(!this.manual_visible())
			return null
		}

		apply_manual(next?: any): any {
			if (next === undefined) return null
			const text = this.manual_text().trim()
			if (text) this._ingest_frame(text)
			return null
		}

		_ingest_frame(text: string) {
			const parsed = $bog_call_codec.parse_frame(text)
			if (!parsed) {
				this.scan_error('Не похоже на QR звонка')
				return
			}
			this.scan_error('')
			this.total_frames(parsed.total)
			this._frames.set(parsed.index, text)
			this.ingested_count(this._frames.size)
			if (this._frames.size >= parsed.total) {
				$mol_wire_async(this).complete()
			}
		}

		complete() {
			const peer = this.peer() as $bog_call_peer | null
			const store = this.store() as $bog_call_store | null
			if (!peer || !store) return
			try {
				const all = Array.from(this._frames.values())
				const payload = $bog_call_codec.decode(all)
				if (payload.t !== 'answer') {
					this.scan_error('Ожидался answer')
					return
				}
				$mol_wire_sync(peer).accept_answer(payload.s)
				store.remember(payload.d, payload.n)
				this.on_connected(true)
			} catch (err) {
				this.scan_error(String((err as Error).message ?? err))
			}
		}

	}

}
