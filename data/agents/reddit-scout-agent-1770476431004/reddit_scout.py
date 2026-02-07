from typing import TypedDict, List, Dict
from langgraph.graph import StateGraph, END
import praw
from pydantic import BaseModel


# --- 1. Data Models for API (Moved from main.py) ---
class AgentEnv(BaseModel):
    reddit_client_id: str
    reddit_client_secret: str
    reddit_user_agent: str = "python:agents-ai-python:v0.1.0 (by /u/developer)"


class AgentInputs(BaseModel):
    query: str
    target_subreddits: List[str]
    max_users: int = 5
    min_intent_score: float = 0.7


# --- 2. State Definition ---
class AgentState(TypedDict):
    """
    Represents the state of the Reddit Scout Agent.
    """

    # Inputs
    query: str
    target_subreddits: List[str]
    max_users: int
    min_intent_score: float

    # Credentials (to be used by nodes)
    reddit_creds: Dict[str, str]

    # Internal state
    visited_threads: List[str]  # Visited thread IDs/URLs
    candidates: List[Dict]  # List of found candidates
    threads_to_process: List[Dict]  # Threads found in the current search step
    iteration: int
    is_complete: bool


# --- 3. Tools (Modified to accept client) ---
def get_reddit_client(creds: Dict[str, str]) -> praw.Reddit:
    return praw.Reddit(
        client_id=creds["client_id"],
        client_secret=creds["client_secret"],
        user_agent=creds["user_agent"],
        check_for_updates=False,
        check_for_async=False,
    )


def search_reddit(
    reddit_client: praw.Reddit, query: str, subreddit: str, limit: int = 5
) -> List[Dict]:
    """
    Searches Reddit for threads using PRAW.
    Returns a list of thread objects.
    """
    print(f"  [Tool] Searching r/{subreddit} for '{query}'...")

    threads = []
    try:
        # Search typically returns a generator
        search_results = reddit_client.subreddit(subreddit).search(query, limit=limit)

        for submission in search_results:
            threads.append(
                {
                    "id": submission.id,
                    "url": f"https://reddit.com{submission.permalink}",
                    "title": submission.title,
                    "subreddit": subreddit,
                    "submission_obj": submission,  # Keep reference (note: not serializable, but we extract fields immediately)
                }
            )
            # Remove non-serializable object before returning if ensuring strict serialization
            threads[-1].pop("submission_obj")
    except Exception as e:
        print(f"  [Error] Failed to search r/{subreddit}: {e}")

    return threads


def get_thread_comments(
    reddit_client: praw.Reddit, thread_id: str, limit: int = 10
) -> List[Dict]:
    """
    Fetches comments for a thread using PRAW.
    Returns a list of comment objects.
    """
    # print(f"  [Tool] Fetching comments for thread {thread_id}...")

    comments = []
    try:
        submission = reddit_client.submission(id=thread_id)

        # This triggers a network request to fetch comments
        submission.comments.replace_more(
            limit=0
        )  # Flatten comment tree, remove "load more"

        count = 0
        for comment in submission.comments.list():
            if count >= limit:
                break

            if isinstance(comment, praw.models.Comment) and comment.author:
                comments.append(
                    {
                        "author": comment.author.name,
                        "text": comment.body,
                        "thread_url": submission.permalink,
                    }
                )
                count += 1

    except Exception as e:
        print(f"  [Error] Failed to fetch comments for {thread_id}: {e}")

    return comments


# --- 4. Domain Logic ---
def analyze_intent(text: str) -> float:
    """
    Heuristic to score payment intent (0.0 - 1.0).
    """
    text_lower = text.lower()

    # 0.9-1.0: Explicit willingness to pay
    if any(
        phrase in text_lower
        for phrase in ["i'd pay", "willing to pay", "happily pay", "don't mind paying"]
    ):
        return 0.95

    # 0.7-0.85: Strong dissatisfaction with free options or considering paid
    if any(
        phrase in text_lower
        for phrase in [
            "paid alternative",
            "free apps aren't",
            "invest in",
            "subscription",
            "worth it",
            "pricing",
        ]
    ):
        return 0.80

    # <0.7: Insufficient evidence
    return 0.3


# --- 5. Nodes ---
def search_node(state: AgentState):
    """
    Searches subreddits for threads.
    """
    print(f"\n--- Step: Searching (Iteration {state['iteration']}) ---")

    query = state["query"]
    subreddits = state["target_subreddits"]

    # Initialize client from state credentials
    reddit = get_reddit_client(state["reddit_creds"])

    all_threads = []

    for sub in subreddits:
        try:
            threads = search_reddit(reddit, query, sub, limit=3)
            all_threads.extend(threads)
            # Be nice to API
            # time.sleep(1.0) # Reduced/Removed for API speed in this example
        except Exception as e:
            print(f"Error searching {sub}: {e}")

    print(f"Found {len(all_threads)} potential threads.")

    return {"threads_to_process": all_threads, "iteration": state["iteration"] + 1}


def analyze_node(state: AgentState):
    """
    Fetches comments for threads and identifies candidates.
    """
    print("--- Step: Analyzing Threads & Comments ---")

    threads = state["threads_to_process"]
    visited = set(state["visited_threads"])
    current_candidates = list(state["candidates"])
    min_score = state["min_intent_score"]

    # Initialize client
    reddit = get_reddit_client(state["reddit_creds"])

    new_candidates_count = 0

    for thread in threads:
        thread_id = thread["id"]
        url = thread["url"]

        if url in visited:
            continue

        visited.add(url)

        # Fetch comments
        comments = get_thread_comments(reddit, thread_id, limit=20)

        for comment in comments:
            score = analyze_intent(comment["text"])

            if score >= min_score:
                # Check if user already exists in our list (deduplication)
                if any(c["username"] == comment["author"] for c in current_candidates):
                    continue

                candidate = {
                    "username": comment["author"],
                    "intent_score": score,
                    "subreddit": thread["subreddit"],
                    "thread_title": thread["title"],
                    "evidence": comment["text"],
                    "thread_url": url,
                }
                current_candidates.append(candidate)
                new_candidates_count += 1

                print(f"  + New Candidate: {candidate['username']} (Score: {score})")

        # Rate limiting
        # time.sleep(0.5)

    print(f"Analysis complete. Found {new_candidates_count} new candidates this batch.")

    return {
        "visited_threads": list(visited),
        "candidates": current_candidates,
        "threads_to_process": [],  # Clear processed threads
    }


def check_conditions_node(state: AgentState):
    """
    Checks if we have met the goal or hit limits.
    """
    num_candidates = len(state["candidates"])
    max_users = state["max_users"]

    print(f"Total candidates so far: {num_candidates}/{max_users}")

    is_complete = False
    if num_candidates >= max_users:
        print(f"Goal met: Found {num_candidates} candidates.")
        is_complete = True
    elif state["iteration"] > 3:  # Hard max iterations
        print("Max iterations reached.")
        is_complete = True

    return {"is_complete": is_complete}


def should_continue(state: AgentState):
    """
    Conditional logic to determine next step.
    """
    if state["is_complete"]:
        return "end"
    return "continue"


# --- 6. Graph Construction ---
def build_graph():
    workflow = StateGraph(AgentState)

    # Add nodes
    workflow.add_node("search", search_node)
    workflow.add_node("analyze", analyze_node)
    workflow.add_node("check_conditions", check_conditions_node)

    # Set entry point
    workflow.set_entry_point("search")

    # Add edges
    workflow.add_edge("search", "analyze")
    workflow.add_edge("analyze", "check_conditions")

    # Conditional edges
    workflow.add_conditional_edges(
        "check_conditions", should_continue, {"continue": "search", "end": END}
    )

    return workflow.compile()


# Export the graph
agent_graph = build_graph()


# --- 7. Helper Functions for Generic Runner ---
def get_initial_state(env: AgentEnv, inputs: AgentInputs) -> AgentState:
    """
    Initializes the agent state from the environment and inputs.
    """
    return {
        "query": inputs.query,
        "target_subreddits": inputs.target_subreddits,
        "max_users": inputs.max_users,
        "min_intent_score": inputs.min_intent_score,
        "reddit_creds": {
            "client_id": env.reddit_client_id,
            "client_secret": env.reddit_client_secret,
            "user_agent": env.reddit_user_agent,
        },
        # Internal state defaults
        "visited_threads": [],
        "candidates": [],
        "threads_to_process": [],
        "iteration": 1,
        "is_complete": False,
    }


def get_result(state: AgentState) -> Dict:
    """
    Formats the final state into a result dictionary.
    """
    return {
        "status": "success",
        "candidates": state.get("candidates", []),
        "total_count": len(state.get("candidates", [])),
        "metadata": {
            "iterations": state.get("iteration", 0) - 1,
            "visited_threads_count": len(state.get("visited_threads", [])),
        },
    }
