namespace $ {

	export type $bog_call_state =
		| 'idle'
		| 'gathering'
		| 'awaiting_answer'
		| 'awaiting_offer'
		| 'connecting'
		| 'connected'
		| 'failed'
		| 'closed'

	export type $bog_call_quality = 'good' | 'degraded' | 'lost'

	type $bog_call_signal_msg = { t: 'o' | 'a', s: string }

	/**
	 * Звонок поверх P2P-стека Гипер Базы:
	 * - соединение и QR-строки делает $giper_baza_hand (порт уходит в yard.peers,
	 *   так что общие ленды синкаются прямо по каналу звонка);
	 * - звук добавляется после коннекта через renegotiation по отдельному
	 *   DataChannel 'bog_call' (его создаёт гость, хост шлёт голосовой offer).
	 */
	export class $bog_call_peer extends $mol_object {

		_hand: $giper_baza_hand | null = null
		_rtc: RTCPeerConnection | null = null
		_signal: RTCDataChannel | null = null
		_local: MediaStream | null = null
		_remote_audio: HTMLAudioElement | null = null

		hand(): $giper_baza_hand {
			if (!this._hand) {
				// звонок локальный (QR в упор): host-кандидатов хватает,
				// а ожидание STUN лишь затягивает генерацию QR
				$giper_baza_port_webrtc.ice = []
				this._hand = $giper_baza_hand.make({ $: this.$ })
			}
			return this._hand
		}

		@$mol_mem
		state(next?: $bog_call_state): $bog_call_state {
			return next ?? 'idle'
		}

		@$mol_mem
		connection_state(next?: string): string {
			return next ?? 'new'
		}

		@$mol_mem
		ice_state(next?: string): string {
			return next ?? 'new'
		}

		@$mol_mem
		muted(next?: boolean): boolean {
			const cur = next ?? false
			if (next !== undefined) {
				const stream = this._local
				if (stream) {
					for (const t of stream.getAudioTracks()) t.enabled = !next
				}
			}
			return cur
		}

		@$mol_mem
		quality(next?: $bog_call_quality): $bog_call_quality {
			return next ?? 'good'
		}

		@$mol_mem
		error(next?: string): string {
			return next ?? ''
		}

		_wire(rtc: RTCPeerConnection) {
			if (this._rtc === rtc) return
			this._rtc = rtc
			rtc.addEventListener('connectionstatechange', () => {
				this.connection_state(rtc.connectionState)
				if (rtc.connectionState === 'connected') this.state('connected')
				else if (rtc.connectionState === 'failed') this.state('failed')
				else if (rtc.connectionState === 'disconnected') this.quality('lost')
			})
			rtc.addEventListener('iceconnectionstatechange', () => {
				this.ice_state(rtc.iceConnectionState)
			})
			rtc.addEventListener('track', e => {
				const stream = e.streams[0]
				if (!stream) return
				this._attach_remote(stream)
			})
		}

		/** Хост: hand делает offer-строку, голосовой канал ждём от гостя */
		async create_offer(): Promise<string> {
			this.state('gathering')
			const hand = this.hand()
			const sdp = await hand.proposal()
			const rtc = hand._attempt!.rtc
			this._wire(rtc)
			rtc.addEventListener('datachannel', event => {
				if (event.channel.label !== 'bog_call') return
				this._signal_open(event.channel, 'host')
			})
			this.state('awaiting_answer')
			return sdp
		}

		/** Гость: hand отвечает на offer, голосовой канал создаём сами */
		async accept_offer(sdp: string): Promise<string> {
			this.state('gathering')
			const hand = this.hand()
			const answer = await hand.answer(sdp)
			const pair = hand._greetings.get(sdp)
			if (!pair) throw new Error('No greeting for offer')
			this._wire(pair.rtc)
			this._signal_open(pair.rtc.createDataChannel('bog_call'), 'guest')
			this.state('connecting')
			return answer
		}

		/** Хост: применяем answer гостя, дальше канал откроется сам */
		async accept_answer(sdp: string): Promise<void> {
			await this.hand().finish(sdp)
			this.state('connecting')
		}

		_signal_open(channel: RTCDataChannel, role: 'host' | 'guest') {
			this._signal = channel
			channel.onmessage = event => {
				if (typeof event.data !== 'string') return
				this._signal_income(JSON.parse(event.data) as $bog_call_signal_msg)
					.catch(err => this.error(String((err as Error).message ?? err)))
			}
			if (role === 'host') {
				const start = () => {
					this._voice_offer()
						.catch(err => this.error(String((err as Error).message ?? err)))
				}
				if (channel.readyState === 'open') start()
				else channel.onopen = start
			}
		}

		/** Хост: докидываем звук в установленное соединение */
		async _voice_offer() {
			const rtc = this._rtc
			if (!rtc) return
			await this.ensure_mic()
			const offer = await rtc.createOffer()
			await rtc.setLocalDescription(offer)
			await this._wait_ice()
			this._signal_send({ t: 'o', s: rtc.localDescription!.sdp })
		}

		async _signal_income(msg: $bog_call_signal_msg) {
			const rtc = this._rtc
			if (!rtc) return
			if (msg.t === 'o') {
				// гость: свои треки до answer, чтобы звук поехал в обе стороны
				await this.ensure_mic()
				await rtc.setRemoteDescription({ type: 'offer', sdp: msg.s })
				const answer = await rtc.createAnswer()
				await rtc.setLocalDescription(answer)
				await this._wait_ice()
				this._signal_send({ t: 'a', s: rtc.localDescription!.sdp })
			}
			if (msg.t === 'a') {
				await rtc.setRemoteDescription({ type: 'answer', sdp: msg.s })
			}
		}

		_signal_send(msg: $bog_call_signal_msg) {
			const channel = this._signal
			if (!channel || channel.readyState !== 'open') return
			channel.send(JSON.stringify(msg))
		}

		_attach_remote(stream: MediaStream) {
			let audio = this._remote_audio
			if (!audio) {
				audio = document.createElement('audio')
				audio.autoplay = true
				audio.setAttribute('playsinline', '')
				this._remote_audio = audio
			}
			audio.srcObject = stream
			audio.play().catch(() => { /* requires user gesture, retry on first tap */ })
		}

		async ensure_mic() {
			if (this._local) return this._local
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: {
					echoCancellation: true,
					noiseSuppression: true,
					autoGainControl: true,
					channelCount: 1,
				},
				video: false,
			})
			this._local = stream
			for (const track of stream.getAudioTracks()) track.enabled = !this.muted()
			const rtc = this._rtc
			if (rtc) {
				for (const track of stream.getAudioTracks()) {
					rtc.addTrack(track, stream)
				}
			}
			return stream
		}

		_wait_ice(): Promise<void> {
			const rtc = this._rtc
			if (!rtc || rtc.iceGatheringState === 'complete') return Promise.resolve()
			return new Promise<void>(resolve => {
				const timer = setTimeout(() => {
					rtc.removeEventListener('icegatheringstatechange', on_change)
					resolve()
				}, 3000)
				const on_change = () => {
					if (rtc.iceGatheringState !== 'complete') return
					clearTimeout(timer)
					rtc.removeEventListener('icegatheringstatechange', on_change)
					resolve()
				}
				rtc.addEventListener('icegatheringstatechange', on_change)
			})
		}

		restart_ice() {
			this._rtc?.restartIce()
		}

		monitor_quality() {
			const rtc = this._rtc
			if (!rtc) return 'good' as $bog_call_quality
			const cs = rtc.connectionState
			if (cs === 'connected') return 'good' as $bog_call_quality
			if (cs === 'disconnected' || cs === 'failed') return 'lost' as $bog_call_quality
			return 'degraded' as $bog_call_quality
		}

		hangup() {
			this._hand?.reset()
			this._hand = null
			this._rtc = null
			this._signal = null
			this._local?.getTracks().forEach(t => t.stop())
			this._local = null
			if (this._remote_audio) {
				this._remote_audio.srcObject = null
				this._remote_audio = null
			}
			this.state('closed')
			this.connection_state('closed')
			this.ice_state('closed')
		}

		destructor() {
			this.hangup()
			super.destructor()
		}

	}

}
