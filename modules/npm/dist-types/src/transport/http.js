export class HttpTransportClient {
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
//# sourceMappingURL=http.js.map