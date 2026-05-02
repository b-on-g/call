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

	export class $bog_call_peer extends $mol_object {

		_pc: RTCPeerConnection | null = null
		_local: MediaStream | null = null
		_remote_audio: HTMLAudioElement | null = null

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

		pc(): RTCPeerConnection {
			if (this._pc) return this._pc
			const pc = new RTCPeerConnection({
				iceServers: [],
				iceTransportPolicy: 'all',
				bundlePolicy: 'max-bundle',
			})
			pc.addEventListener('connectionstatechange', () => {
				this.connection_state(pc.connectionState)
				if (pc.connectionState === 'connected') this.state('connected')
				else if (pc.connectionState === 'failed') this.state('failed')
				else if (pc.connectionState === 'disconnected') this.quality('lost')
			})
			pc.addEventListener('iceconnectionstatechange', () => {
				this.ice_state(pc.iceConnectionState)
			})
			pc.addEventListener('track', e => {
				const stream = e.streams[0]
				if (!stream) return
				this._attach_remote(stream)
			})
			this._pc = pc
			return pc
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
			const pc = this.pc()
			for (const track of stream.getAudioTracks()) {
				pc.addTrack(track, stream)
			}
			return stream
		}

		_wait_ice(): Promise<void> {
			const pc = this.pc()
			if (pc.iceGatheringState === 'complete') return Promise.resolve()
			return new Promise<void>(resolve => {
				const timer = setTimeout(() => {
					pc.removeEventListener('icegatheringstatechange', on_change)
					resolve()
				}, 3000)
				const on_change = () => {
					if (pc.iceGatheringState !== 'complete') return
					clearTimeout(timer)
					pc.removeEventListener('icegatheringstatechange', on_change)
					resolve()
				}
				pc.addEventListener('icegatheringstatechange', on_change)
			})
		}

		async create_offer(): Promise<string> {
			this.state('gathering')
			await this.ensure_mic()
			const pc = this.pc()
			const offer = await pc.createOffer({ offerToReceiveAudio: true })
			await pc.setLocalDescription(offer)
			await this._wait_ice()
			this.state('awaiting_answer')
			return pc.localDescription!.sdp
		}

		async accept_offer(sdp: string): Promise<string> {
			this.state('gathering')
			await this.ensure_mic()
			const pc = this.pc()
			await pc.setRemoteDescription({ type: 'offer', sdp })
			const answer = await pc.createAnswer()
			await pc.setLocalDescription(answer)
			await this._wait_ice()
			this.state('connecting')
			return pc.localDescription!.sdp
		}

		async accept_answer(sdp: string): Promise<void> {
			const pc = this.pc()
			await pc.setRemoteDescription({ type: 'answer', sdp })
			this.state('connecting')
		}

		restart_ice() {
			this._pc?.restartIce()
		}

		monitor_quality() {
			const pc = this._pc
			if (!pc) return 'good' as $bog_call_quality
			const cs = pc.connectionState
			if (cs === 'connected') return 'good' as $bog_call_quality
			if (cs === 'disconnected' || cs === 'failed') return 'lost' as $bog_call_quality
			return 'degraded' as $bog_call_quality
		}

		hangup() {
			this._pc?.close()
			this._pc = null
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
