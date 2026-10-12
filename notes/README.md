# R&D notes

This directory contains observations, hypotheses, experiment results, and decisions related to the PoC.

Add Markdown notes by topic or date without mixing research material into the client or server runtime code.

## Realtime audio turn commit

The microphone track is paused between turns with `track.enabled = false`; it is not stopped, so the WebRTC session and microphone permission remain available for the next turn. When listening ends, the UI enters `Thinking` immediately and waits 200 ms before sending `input_audio_buffer.commit`. This grace period gives the RTP audio path time to deliver the final speech packets before the data-channel commit. The value should be recalibrated if testing shows either truncated endings or unnecessary response latency.
