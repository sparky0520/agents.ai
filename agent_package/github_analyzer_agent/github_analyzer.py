from typing import TypedDict, List, Dict, Any
from langgraph.graph import StateGraph, END
import requests
import os
from pydantic import BaseModel
from urllib.parse import urlparse


# --- 1. Data Models for API ---
class AgentEnv(BaseModel):
    github_token: str | None = None


class AgentInputs(BaseModel):
    repo_url: str
    max_files_to_analyze: int = 10
    focus_areas: List[str] = []


# --- 2. State Definition ---
class AgentState(TypedDict):
    # Inputs
    repo_url: str
    repo_owner: str
    repo_name: str
    max_files: int
    focus_areas: List[str]

    # Credentials
    github_token: str | None

    # Internal state
    repo_info: Dict[str, Any]
    files_content: List[Dict[str, str]]
    analysis_results: Dict[str, Any]
    iteration: int


# --- 3. Tools ---
def get_headers(token: str | None) -> Dict[str, str]:
    headers = {"Accept": "application/vnd.github.v3+json"}
    if token:
        headers["Authorization"] = f"token {token}"
    return headers


def parse_repo_url(url: str) -> tuple[str, str]:
    path = urlparse(url).path.strip("/")
    parts = path.split("/")
    if len(parts) >= 2:
        return parts[0], parts[1]
    raise ValueError(f"Invalid GitHub URL: {url}")


def fetch_repo_details(owner: str, repo: str, token: str | None) -> Dict[str, Any]:
    url = f"https://api.github.com/repos/{owner}/{repo}"
    resp = requests.get(url, headers=get_headers(token))
    if resp.status_code != 200:
        print(f"Error fetching repo details: {resp.status_code} {resp.text}")
        return {}
    return resp.json()


def fetch_repo_contents(
    owner: str, repo: str, path: str, token: str | None
) -> List[Dict]:
    url = f"https://api.github.com/repos/{owner}/{repo}/contents/{path}"
    resp = requests.get(url, headers=get_headers(token))
    if resp.status_code != 200:
        return []
    return resp.json()


# --- 4. Nodes ---
def init_node(state: AgentState):
    print(f"--- Initializing Analysis for {state['repo_url']} ---")
    try:
        owner, name = parse_repo_url(state["repo_url"])
        return {"repo_owner": owner, "repo_name": name, "iteration": 1}
    except ValueError as e:
        print(f"Error: {e}")
        # In a real app we might handle error state better
        return {"repo_owner": "", "repo_name": "", "iteration": 1}


def fetch_metadata_node(state: AgentState):
    print("--- Fetching Metadata ---")
    owner = state["repo_owner"]
    name = state["repo_name"]

    if not owner or not name:
        return {"repo_info": {}}

    info = fetch_repo_details(owner, name, state["github_token"])

    stats = {
        "stars": info.get("stargazers_count", 0),
        "forks": info.get("forks_count", 0),
        "open_issues": info.get("open_issues_count", 0),
        "last_updated": info.get("updated_at", ""),
        "description": info.get("description", ""),
    }

    print(f"Repo Stats: {stats}")
    return {"repo_info": stats}


def analyze_tech_stack_node(state: AgentState):
    print("--- Analyzing Tech Stack ---")
    # Simple heuristic: check root files and languages API
    owner = state["repo_owner"]
    name = state["repo_name"]
    token = state["github_token"]

    # Get languages
    langs_url = f"https://api.github.com/repos/{owner}/{name}/languages"
    langs_resp = requests.get(langs_url, headers=get_headers(token))
    languages = list(langs_resp.json().keys()) if langs_resp.status_code == 200 else []

    # Check for package manager files in root
    root_contents = fetch_repo_contents(owner, name, "", token)
    files = [f["name"] for f in root_contents if isinstance(f, dict)]  # Defensive check

    tech_stack = languages[:5]  # Top 5 languages

    if "package.json" in files:
        tech_stack.append("Node.js/npm")
    if "requirements.txt" in files or "pyproject.toml" in files:
        tech_stack.append("Python")
    if "Dockerfile" in files:
        tech_stack.append("Docker")
    if "Cargo.toml" in files:
        tech_stack.append("Rust")
    if "go.mod" in files:
        tech_stack.append("Go")

    # Combine results logic
    results = state.get("analysis_results", {})
    results["technologies"] = list(set(tech_stack))

    # Construct summary
    desc = state["repo_info"].get("description", "No description provided.")
    results["summary"] = (
        f"A {tech_stack[0] if tech_stack else 'software'} repository. {desc}"
    )
    results["stats"] = state["repo_info"]
    results["file_analysis"] = []  # Placeholder for deeper analysis

    return {"analysis_results": results}


# --- 5. Graph Construction ---
def build_graph():
    workflow = StateGraph(AgentState)

    workflow.add_node("init", init_node)
    workflow.add_node("fetch_metadata", fetch_metadata_node)
    workflow.add_node("analyze_tech", analyze_tech_stack_node)

    workflow.set_entry_point("init")

    workflow.add_edge("init", "fetch_metadata")
    workflow.add_edge("fetch_metadata", "analyze_tech")
    workflow.add_edge("analyze_tech", END)

    return workflow.compile()


agent_graph = build_graph()


# --- 6. Helper Functions ---
def get_initial_state(env: AgentEnv, inputs: AgentInputs) -> AgentState:
    return {
        "repo_url": inputs.repo_url,
        "repo_owner": "",
        "repo_name": "",
        "max_files": inputs.max_files_to_analyze,
        "focus_areas": inputs.focus_areas,
        "github_token": env.github_token,
        "repo_info": {},
        "files_content": [],
        "analysis_results": {},
        "iteration": 0,
    }


def get_result(state: AgentState) -> Dict:
    return state.get(
        "analysis_results",
        {
            "summary": "Analysis failed or incomplete",
            "technologies": [],
            "stats": {},
            "file_analysis": [],
        },
    )
