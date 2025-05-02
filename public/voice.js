
const voiceSocket = io(window.location.origin);

const peerConnection = new RTCPeerConnection({
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
});

let localStream;

navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
  console.log("🎤 Microphone access granted");

  localStream = stream;

  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.ontrack = (event) => {
    console.log("🔊 Received audio track");
    const remoteAudio = document.createElement("audio");
    remoteAudio.srcObject = event.streams[0];
    remoteAudio.autoplay = true;
    remoteAudio.controls = true;
    document.body.appendChild(remoteAudio);
  };

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      voiceSocket.emit("ice-candidate-voice", event.candidate);
    }
  };

  voiceSocket.emit("join-voice");
});

voiceSocket.on("ready-voice", async () => {
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  voiceSocket.emit("offer-voice", offer);
});

voiceSocket.on("offer-voice", async (offer) => {
  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  voiceSocket.emit("answer-voice", answer);
});

voiceSocket.on("answer-voice", async (answer) => {
  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

voiceSocket.on("ice-candidate-voice", async (candidate) => {
  try {
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (e) {
    console.error("Error adding received ice candidate", e);
  }
});
