export class WsTransportClient {
    connected = false;
    endpoint = null;
    async connect(resolution) {
        this.endpoint = resolution.endpoint;
        this.connected = true;
    }
    async disconnect() {
        this.connected = false;
        this.endpoint = null;
    }
    isConnected() {
        return this.connected;
    }
}
//# sourceMappingURL=ws.js.map