namespace $.$$ {

	export class $bog_call_guest extends $.$bog_call_guest {

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
		answer_ready(next?: boolean): boolean {
			return next ?? false
		}

		@$mol_mem
		frames_answer(next?: readonly string[]): readonly string[] {
			return next ?? []
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

		body_sub(): readonly $mol_view[] {
			if (this.answer_ready()) return [this.Share_block()]
			return [this.Scan_block()]
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
			if (this.answer_ready()) return
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
				$mol_wire_async(this).build_answer()
			}
		}

		build_answer() {
			const peer = this.peer() as $bog_call_peer | null
			const store = this.store() as $bog_call_store | null
			if (!peer || !store) return
			try {
				const all = Array.from(this._frames.values())
				const offer = $bog_call_codec.decode(all)
				if (offer.t !== 'offer') {
					this.scan_error('Ожидался offer')
					return
				}
				const sdp = $mol_wire_sync(peer).accept_offer(offer.s) as unknown as string
				const frames = $bog_call_codec.encode({
					v: 1,
					t: 'answer',
					s: sdp,
					n: store.name(),
					d: store.device_id(),
				})
				store.remember(offer.d, offer.n)
				this.frames_answer(frames)
				this.answer_ready(true)
				$mol_wire_async(this).await_connection()
			} catch (err) {
				this.scan_error(String((err as Error).message ?? err))
			}
		}

		await_connection() {
			const peer = this.peer() as $bog_call_peer | null
			if (!peer) return
			const start = Date.now()
			while (Date.now() - start < 60_000) {
				const state = peer.connection_state()
				if (state === 'connected') {
					this.on_connected(true)
					return
				}
				if (state === 'failed' || state === 'closed') return
				$mol_wire_sync(this).sleep(500)
			}
		}

		sleep(ms: number) {
			return new Promise<void>(r => setTimeout(r, ms))
		}

	}

}
