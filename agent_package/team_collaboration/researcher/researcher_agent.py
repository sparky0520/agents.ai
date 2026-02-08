from typing import TypedDict, List, Dict
from langgraph.graph import StateGraph, END
from pydantic import BaseModel
import random


# --- 1. Data Models ---
class AgentEnv(BaseModel):
    pass


class AgentInputs(BaseModel):
    topic: str


# --- 2. State Definition ---
class AgentState(TypedDict):
    topic: str
    notes: List[str]
    sources: List[str]


# --- 3. Nodes ---
def research_node(state: AgentState):
    print(f"--- Researching: {state['topic']} ---")
    topic = state["topic"]

    # Mock research logic
    mock_facts = [
        f"{topic} is a rapidly evolving field.",
        f"Key drivers for {topic} include technological advancements and market demand.",
        f"Experts suggest that {topic} will impact various industries by 2030.",
        f"There are ethical considerations regarding {topic} that need addressing.",
    ]

    notes = random.sample(mock_facts, k=3)
    sources = ["Nature Journal", "TechCrunch", "Wikipedia"]

    return {"notes": notes, "sources": sources}


# --- 4. Graph ---
def build_graph():
    workflow = StateGraph(AgentState)
    workflow.add_node("research", research_node)
    workflow.set_entry_point("research")
    workflow.add_edge("research", END)
    return workflow.compile()


agent_graph = build_graph()


# --- 5. Helpers ---
def get_initial_state(env: AgentEnv, inputs: AgentInputs) -> AgentState:
    return {"topic": inputs.topic, "notes": [], "sources": []}


def get_result(state: AgentState) -> Dict:
    return {"research_notes": state["notes"], "sources": state["sources"]}
