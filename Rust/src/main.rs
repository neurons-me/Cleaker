//cleakes/crate/src/main.rs
use dotenv::dotenv;
use std::env;
use log::info;
use crate::cli::Cli;
mod client; // your Cleaker client
mod cli;    // CLI parser and commands
fn main() {
    // Load environment variables from .env file
    dotenv().ok();
    // Initialize logging (default to info if not set)
    env_logger::init();
    // Read CLEAKER_ENDPOINT from .env or use default
    let endpoint = env::var("CLEAKER_ENDPOINT").unwrap_or_else(|_| "http://localhost:8888/graphql".to_string());
    // Initialize Cleaker client
    let client = client::CleakerClient::new(Some(&endpoint));
    info!("Cleaker CLI starting...");
    // Parse CLI arguments and execute commands
    if let Err(e) = Cli::parse_and_run(client) {
        eprintln!("Error: {}", e);
        std::process::exit(1);
    }
}
