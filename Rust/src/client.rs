//! CleakerClient – minimal GraphQL client for the Cleaker ledger.
//!
//! Default endpoint: `http://localhost:8888/graphql`
//!
//! Add these to your `Cargo.toml` if not present:
//! ```toml
//! reqwest = { version = "0.11", features = ["blocking", "json"] }
//! serde = { version = "1", features = ["derive"] }
//! serde_json = "1"
//! ```
//!
//cleaker/crate/src/client.rs
use reqwest::blocking::Client as HttpClient;
use serde::{Deserialize, Serialize};
use serde::de::DeserializeOwned;
/// Errors surfaced by the client.
#[derive(thiserror::Error, Debug)]
pub enum ClientError {
    #[error("http error: {0}")]
    Http(#[from] reqwest::Error),
    #[error("serde json error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("graphql error(s): {0:?}")]
    GraphQLErrors(Vec<GqlError>),
    #[error("unexpected empty GraphQL data")]
    EmptyData,
}

/// GraphQL error shape (subset)
#[derive(Debug, Deserialize)]
pub struct GqlError {
    pub message: String,
}

/// Envelope for GraphQL responses.
#[derive(Debug, Deserialize)]
struct GqlResponse<T> {
    data: Option<T>,
    errors: Option<Vec<GqlError>>,
}

/// Public types mirrored from Cleaker GraphQL.
#[derive(Debug, Clone, Deserialize)]
pub struct Identity {
    pub username: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct PublicInfo {
    pub username: String,
    pub public_key: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct GqlEntry {
    pub verb: String,
    pub key: String,
    pub value: String,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Default)]
pub struct GetFilter {
    pub verb: String,
    pub key: Option<String>,
    pub value: Option<String>,
    pub context_id: Option<String>,
    pub limit: Option<i32>,
    pub offset: Option<i32>,
    pub since: Option<String>,
    pub until: Option<String>,
}

/// Minimal blocking client.
#[derive(Clone)]
pub struct CleakerClient {
    /// Full GraphQL endpoint, e.g. `http://localhost:8888/graphql`
    pub endpoint: String,
    http: HttpClient,
}

impl CleakerClient {
    /// Build a client. If `endpoint` is `None`, uses `http://localhost:8888/graphql`.
    pub fn new(endpoint: Option<&str>) -> Self {
        let endpoint = endpoint
            .map(|s| s.to_string())
            .or_else(|| std::env::var("CLEAKER_ENDPOINT").ok())
            .unwrap_or_else(|| "http://localhost:8888/graphql".to_string());
        let http = HttpClient::new();
        Self { endpoint, http }
    }

    /// Change endpoint at runtime.
    pub fn set_endpoint<S: Into<String>>(&mut self, endpoint: S) {
        self.endpoint = endpoint.into();
    }

    /// Cheap health check via `/health` (non-GraphQL).
    pub fn health(&self) -> Result<String, ClientError> {
        let base = self.endpoint.trim_end_matches("/graphql");
        let url = format!("{}/health", base);
        let text = self.http.get(url).send()?.error_for_status()?.text()?;
        Ok(text)
    }

    /// Generic GraphQL request helper.
    fn graphql<T: DeserializeOwned>(
        &self,
        query: &str,
        variables: serde_json::Value,
    ) -> Result<T, ClientError> {
        let body = serde_json::json!({ "query": query, "variables": variables });
        let resp = self
            .http
            .post(&self.endpoint)
            .json(&body)
            .send()?
            .error_for_status()?;

        let envelope: GqlResponse<T> = resp.json()?;
        if let Some(errs) = envelope.errors {
            return Err(ClientError::GraphQLErrors(errs));
        }
        Ok(envelope.data.ok_or(ClientError::EmptyData)?)
    }

    // -----------------------
    // Queries
    // -----------------------

    /// List all identities stored in Cleaker.
    pub fn list_identities(&self) -> Result<Vec<Identity>, ClientError> {
        #[derive(Deserialize)]
        struct Data { listIdentities: Vec<Identity> }

        let q = r#"
        query {
          listIdentities { username }
        }"#;

        let data: Data = self.graphql(q, serde_json::json!({}))?;
        Ok(data.listIdentities)
    }

    /// Retrieve public info for a username.
    pub fn public_info(&self, username: &str) -> Result<Option<PublicInfo>, ClientError> {
        #[derive(Deserialize)]
        struct Data { publicInfo: Option<PublicInfo> }

        let q = r#"
        query($username: String!) {
          publicInfo(username: $username) { username publicKey: public_key }
        }"#;

        // Server returns `public_key`, but our struct expects `public_key`.
        // We alias as `publicKey` in query and rename field in struct via serde if needed.
        // Here we renamed only in query to camelCase and map into snake via serde rename below.
        #[derive(Debug, Clone, Deserialize)]
        struct WirePublicInfo {
            username: String,
            #[serde(rename = "publicKey")]
            public_key: String,
        }
        #[derive(Deserialize)]
        struct WireData { publicInfo: Option<WirePublicInfo> }

        let data: WireData = self.graphql(q, serde_json::json!({ "username": username }))?;
        let mapped = data.publicInfo.map(|w| PublicInfo { username: w.username, public_key: w.public_key });
        Ok(mapped)
    }

    /// Flexible get() against verb tables.
    pub fn get(&self, filter: &GetFilter) -> Result<Vec<GqlEntry>, ClientError> {
        #[derive(Deserialize)]
        struct Data { get: Vec<GqlEntryWire> }

        #[derive(Deserialize)]
        struct GqlEntryWire {
            verb: String,
            key: String,
            value: String,
            timestamp: String,
        }

        let q = r#"
        query($filter: GetFilter!) {
          get(filter: $filter) {
            verb key value timestamp
          }
        }"#;

        // The schema in Cleaker expects exactly `GetFilter`. We send as-is.
        let data: Data = self.graphql(q, serde_json::json!({ "filter": filter }))?;

        Ok(data.get.into_iter().map(|e| GqlEntry {
            verb: e.verb, key: e.key, value: e.value, timestamp: e.timestamp
        }).collect())
    }

    // -----------------------
    // Mutations
    // -----------------------

    /// Insert a `be` record.
    pub fn be(&self, context_id: &str, key: &str, value: &str) -> Result<bool, ClientError> {
        #[derive(Deserialize)]
        struct Data { be: bool }
        let q = r#"
        mutation($context_id: String!, $key: String!, $value: String!) {
          be(context_id: $context_id, key: $key, value: $value)
        }"#;
        let data: Data = self.graphql(q, serde_json::json!({
            "context_id": context_id, "key": key, "value": value
        }))?;
        Ok(data.be)
    }

    pub fn have(&self, context_id: &str, key: &str, value: &str) -> Result<bool, ClientError> {
        #[derive(Deserialize)]
        struct Data { have: bool }
        let q = r#"
        mutation($context_id: String!, $key: String!, $value: String!) {
          have(context_id: $context_id, key: $key, value: $value)
        }"#;
        let data: Data = self.graphql(q, serde_json::json!({
            "context_id": context_id, "key": key, "value": value
        }))?;
        Ok(data.have)
    }

    pub fn do_(&self, context_id: &str, key: &str, value: &str) -> Result<bool, ClientError> {
        #[derive(Deserialize)]
        struct Data { do_: bool }
        let q = r#"
        mutation($context_id: String!, $key: String!, $value: String!) {
          do_(context_id: $context_id, key: $key, value: $value)
        }"#;
        let data: Data = self.graphql(q, serde_json::json!({
            "context_id": context_id, "key": key, "value": value
        }))?;
        Ok(data.do_)
    }

    pub fn at(&self, context_id: &str, key: &str, value: &str) -> Result<bool, ClientError> {
        #[derive(Deserialize)]
        struct Data { at: bool }
        let q = r#"
        mutation($context_id: String!, $key: String!, $value: String!) {
          at(context_id: $context_id, key: $key, value: $value)
        }"#;
        let data: Data = self.graphql(q, serde_json::json!({
            "context_id": context_id, "key": key, "value": value
        }))?;
        Ok(data.at)
    }

    pub fn relate(&self, context_id: &str, key: &str, value: &str) -> Result<bool, ClientError> {
        #[derive(Deserialize)]
        struct Data { relate: bool }
        let q = r#"
        mutation($context_id: String!, $key: String!, $value: String!) {
          relate(context_id: $context_id, key: $key, value: $value)
        }"#;
        let data: Data = self.graphql(q, serde_json::json!({
            "context_id": context_id, "key": key, "value": value
        }))?;
        Ok(data.relate)
    }

    pub fn react(&self, context_id: &str, key: &str, value: &str) -> Result<bool, ClientError> {
        #[derive(Deserialize)]
        struct Data { react: bool }
        let q = r#"
        mutation($context_id: String!, $key: String!, $value: String!) {
          react(context_id: $context_id, key: $key, value: $value)
        }"#;
        let data: Data = self.graphql(q, serde_json::json!({
            "context_id": context_id, "key": key, "value": value
        }))?;
        Ok(data.react)
    }

    pub fn communicate(&self, context_id: &str, key: &str, value: &str) -> Result<bool, ClientError> {
        #[derive(Deserialize)]
        struct Data { communicate: bool }
        let q = r#"
        mutation($context_id: String!, $key: String!, $value: String!) {
          communicate(context_id: $context_id, key: $key, value: $value)
        }"#;
        let data: Data = self.graphql(q, serde_json::json!({
            "context_id": context_id, "key": key, "value": value
        }))?;
        Ok(data.communicate)
    }
}
