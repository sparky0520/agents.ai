import os
import yaml
import json
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
DB_NAME = "test"  # Default database name

if not MONGODB_URI:
    print("Error: MONGODB_URI not found in .env")
    exit(1)


def seed_agents():
    client = MongoClient(MONGODB_URI)
    db = client[DB_NAME]
    agents_collection = db["agents"]

    # Path to the collaboration team agents
    # Assuming this script is run from the project root
    agents_base_dir = os.path.join(os.getcwd(), "agent_package", "team_collaboration")

    if not os.path.exists(agents_base_dir):
        print(f"Error: Agents directory not found at {agents_base_dir}")
        exit(1)

    agent_folders = [
        f
        for f in os.listdir(agents_base_dir)
        if os.path.isdir(os.path.join(agents_base_dir, f))
    ]

    print(f"Found {len(agent_folders)} agents to seed: {agent_folders}")

    for agent_id in agent_folders:
        agent_dir = os.path.join(agents_base_dir, agent_id)
        agent_yaml_path = os.path.join(agent_dir, "agent.yaml")

        if not os.path.exists(agent_yaml_path):
            print(f"Skipping {agent_id}: agent.yaml not found")
            continue

        try:
            # unique ID logic used in saveAgent (name-timestamp)
            # Since we want these specific agents, we can use a fixed ID or generate one.
            # However, for consistency with the local loading logic that used directory names as IDs,
            # let's try to find an existing agent with this directory name as ID OR upsert based on name?
            # Actually, let's use the directory name as the ID in Mongo to keep it simple and consistent.
            # But wait, `saveAgent` generates IDs like `name-timestamp`.
            # If I use `researcher` as ID, I need to ensure the rest of the system handles it.
            # The system handles string IDs, so `researcher` is fine.

            # Read metadata
            with open(agent_yaml_path, "r", encoding="utf-8") as f:
                agent_config = yaml.safe_load(f)

            # Prepare files list
            files = []
            for filename in os.listdir(agent_dir):
                file_path = os.path.join(agent_dir, filename)
                if os.path.isfile(file_path):
                    with open(file_path, "r", encoding="utf-8") as f:
                        content = f.read()
                    files.append({"name": filename, "content": content})

            # Prepare agent document
            agent_doc = {
                "agent_id": agent_id,  # Use folder name as ID
                "name": agent_config.get("name"),
                "description": agent_config.get("description"),
                "version": agent_config.get("version"),
                "author": "System (Seeded)",
                "price": "0.05 ETH",
                "tags": ["collaboration", "seeded"],
                "files": files,
                "rating": 5.0,
                "reviews": 0,
                "metadata": {
                    "created_at": None  # Or current time
                },
            }

            # Upsert
            result = agents_collection.update_one(
                {"agent_id": agent_id}, {"$set": agent_doc}, upsert=True
            )

            if result.upserted_id:
                print(f"Successfully inserted agent: {agent_id}")
            else:
                print(f"Successfully updated agent: {agent_id}")

        except Exception as e:
            print(f"Failed to seed agent {agent_id}: {e}")

    print("Seeding complete.")


if __name__ == "__main__":
    seed_agents()
