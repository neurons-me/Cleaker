// cleaker/crate/src/cli.rs
use clap::{Parser, Subcommand};
use crate::client::{CleakerClient, GetFilter};

#[derive(Parser)]
#[command(name = "cleaker", version, about = "Cleaker CLI (Global Ledger)")]
pub struct Cli {
    /// GraphQL endpoint (default: http://localhost:8888/graphql)
    #[arg(long, global = true)]
    pub endpoint: Option<String>,

    /// Space lógico (namespace) opcional para scoping
    #[arg(long, global = true)]
    pub space: Option<String>,

    /// Username (identidad .me) — requerido a nivel raíz
    #[arg(long)] // ⟵ QUITA `global = true`
    pub username: String,

    /// Password del .me — requerido a nivel raíz
    #[arg(long)] // ⟵ QUITA `global = true`
    pub password: String,

    #[command(subcommand)]
    pub command: Commands,
}

#[derive(Subcommand)]
pub enum Commands {
    /// Muestra info pública + últimas entradas del usuario
    Display,

    /// Verbos semánticos (setters)
    Be {
        #[arg(long)] key: String,
        #[arg(long)] value: String,
        #[arg(long)] context: Option<String>,
    },
    Have {
        #[arg(long)] key: String,
        #[arg(long)] value: String,
        #[arg(long)] context: Option<String>,
    },
    At {
        #[arg(long)] key: String,
        #[arg(long)] value: String,
        #[arg(long)] context: Option<String>,
    },
    Relate {
        #[arg(long)] key: String,
        #[arg(long)] value: String,
        #[arg(long)] context: Option<String>,
    },
    React {
        #[arg(long)] key: String,
        #[arg(long)] value: String,
        #[arg(long)] context: Option<String>,
    },
    Communicate {
        #[arg(long)] key: String,
        #[arg(long)] value: String,
        #[arg(long)] context: Option<String>,
    },

    /// Lecturas flexibles (get)
    Get {
        #[arg(long)] verb: String,
        #[arg(long)] key: Option<String>,
        #[arg(long)] value: Option<String>,
        #[arg(long)] context: Option<String>,
        #[arg(long)] limit: Option<i32>,
        #[arg(long)] offset: Option<i32>,
        #[arg(long)] since: Option<String>,
        #[arg(long)] until: Option<String>,
    },
}

impl Cli {
    /// Parse CLI args y ejecuta contra el cliente provisto
    pub fn parse_and_run(mut client: CleakerClient) -> Result<(), Box<dyn std::error::Error>> {
        let cli = Cli::parse();

        // Override endpoint si viene por flag
        if let Some(ep) = cli.endpoint.as_deref() {
            client.set_endpoint(ep.to_string());
        }

        let username = cli.username.clone();
        let _password = cli.password.clone(); // reservado para futura auth JWT, etc.

        match cli.command {
            Commands::Display => {
                if let Some(info) = client.public_info(&username)? {
                    println!("👤 {}\n🔑 {}", info.username, info.public_key);
                } else {
                    println!("⚠️  No public info for '{}'", username);
                }

                let filter = GetFilter {
                    verb: "all".to_string(),
                    key: None,
                    value: None,
                    context_id: Some(username.clone()),
                    limit: Some(50),
                    offset: None,
                    since: None,
                    until: None,
                };
                let entries = client.get(&filter)?;
                if entries.is_empty() {
                    println!("(no entries)");
                } else {
                    for e in entries {
                        println!("• {}('{}','{}') @ {}", e.verb, e.key, e.value, e.timestamp);
                    }
                }
            }

            Commands::Be { key, value, context } => {
                let ctx = context.unwrap_or_else(|| username.clone());
                let ok = client.be(&ctx, &key, &value)?;
                println!("{}", if ok { "✅ be recorded" } else { "⚠️ be failed" });
            }
            Commands::Have { key, value, context } => {
                let ctx = context.unwrap_or_else(|| username.clone());
                let ok = client.have(&ctx, &key, &value)?;
                println!("{}", if ok { "✅ have recorded" } else { "⚠️ have failed" });
            }
            Commands::At { key, value, context } => {
                let ctx = context.unwrap_or_else(|| username.clone());
                let ok = client.at(&ctx, &key, &value)?;
                println!("{}", if ok { "✅ at recorded" } else { "⚠️ at failed" });
            }
            Commands::Relate { key, value, context } => {
                let ctx = context.unwrap_or_else(|| username.clone());
                let ok = client.relate(&ctx, &key, &value)?;
                println!("{}", if ok { "✅ relate recorded" } else { "⚠️ relate failed" });
            }
            Commands::React { key, value, context } => {
                let ctx = context.unwrap_or_else(|| username.clone());
                let ok = client.react(&ctx, &key, &value)?;
                println!("{}", if ok { "✅ react recorded" } else { "⚠️ react failed" });
            }
            Commands::Communicate { key, value, context } => {
                let ctx = context.unwrap_or_else(|| username.clone());
                let ok = client.communicate(&ctx, &key, &value)?;
                println!("{}", if ok { "✅ communicate recorded" } else { "⚠️ communicate failed" });
            }
            Commands::Get { verb, key, value, context, limit, offset, since, until } => {
                let ctx = context.unwrap_or_else(|| username.clone());
                let filter = GetFilter {
                    verb,
                    key,
                    value,
                    context_id: Some(ctx),
                    limit,
                    offset,
                    since,
                    until,
                };
                let entries = client.get(&filter)?;
                if entries.is_empty() {
                    println!("(no entries)");
                } else {
                    for e in entries {
                        println!("• {}('{}','{}') @ {}", e.verb, e.key, e.value, e.timestamp);
                    }
                }
            }
        }

        Ok(())
    }
}