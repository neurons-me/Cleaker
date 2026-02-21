`Cleaker` is a versatile tool for creating DIDs that are compatible with major blockchain networks.
	•	Keccak-256 is the default algorithm, which aligns with Ethereum’s hashing for its blockchain.
	•	You can still specify SHA-256 or DoubleSHA-256 if you need compatibility with Bitcoin.

This design gives you the flexibility to focus on Ethereum by default while still supporting other networks when necessary.

The cleak essentially performs a series of context-building steps:
	•	Define the Space (domain): The root domain (cleaker.me) sets the overall environment.
	•	Identify the Space Owner (subdomain): The subdomain identifies the owner or focus of the space, which could represent a profile, a specific user, or a namespace.
	•	Establish Active User Identity (session): The session, retrieved from a JWT or similar token, tells Cleaker who is currently interacting with the space, enabling actions based on this specific user’s permissions.

    **Subdomains** are a way to create a **unique URL** for each user. This is done by creating a **wildcard DNS record that points all subdomains to the same server.** Our server (https://cleaker.me) then parses the subdomain and uses it to identify the user. Any server can be setup.

 **This is done by using the request object in the server, to get the subdomain and then using it to query the database for the user.** 

* **If the user exists,** the server will then route the request to the user's profile page.
* **If the user does not exist,** the server will route the request to the homepage.

Getting Cleaked
usrme.cleaker.me
The cleaker.me server functions as a channel for network-wide functionalities.

Subdomains provide a unique URL for each user. This is achieved through a wildcard DNS record, which directs all subdomains to the same server. The server (e.g., https://cleaker.me) processes the subdomain to identify the user.

How It Works:

The server extracts the subdomain from the request object.
The subdomain is used to query the database for the corresponding user.
Routing:

If the user exists: The server routes the request to the user’s profile page.
If the user does not exist: The server redirects to the homepage.
This flexible setup ensures any server can integrate similar functionality.