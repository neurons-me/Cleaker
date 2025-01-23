Cleaker doesn’t own the ledger—it interacts with it. By making the ledger external and optional, Cleaker remains a modular, reusable utility that can function both with and without a ledger. This design allows for more flexibility and decouples the responsibility of managing the ledger from Cleaker itself.

Why Decoupling the Ledger is a Good Idea
	1.	Independence:
	•	Cleaker can perform its core operations (e.g., DID creation, identity linking) without requiring a ledger.
	•	This makes Cleaker more lightweight and versatile.
	2.	Plug-and-Play Ledger Support:
	•	By passing the ledger as an argument, you can:
	•	Use different ledgers for different instances.
	•	Switch out the ledger implementation without changing Cleaker.
	3.	Clear Separation of Concerns:
	•	The ledger’s responsibility (e.g., storing, updating, or querying data) is separate from Cleaker’s core functionalities.
	4.	Enhanced Testability:
	•	You can easily mock or bypass the ledger during testing, focusing only on Cleaker’s behavior.